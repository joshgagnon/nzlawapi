import urllib, urllib2
from bs4 import BeautifulSoup
import re
import datetime
from multiprocessing.dummy import Pool as ThreadPool
import threading
import sys
import importlib
from os import path
import os
from collections import defaultdict
import psycopg2
from time import sleep
from httplib import IncompleteRead

"""
This script scrapes https://www.comlaw.gov.au

It starts on the browse index table, uses asp.net form submission to handle pagination.
For each result, finds the document series, then the for each in the series finds
dates and download links.

"""


start = 'https://www.comlaw.gov.au/Browse/'
series = 'https://www.comlaw.gov.au/Series/%s'
download = 'https://www.comlaw.gov.au/Details/%s/Download'
details = 'https://www.comlaw.gov.au/Details/%s'
top_level_sel = '#ctl00_MainContent_pnlBrowse a'


USE_THREADS = True
THREAD_MAX = 8
SLEEP = 2

thread_limiter = [
    threading.BoundedSemaphore(value=THREAD_MAX),
    threading.BoundedSemaphore(value=THREAD_MAX),
    threading.BoundedSemaphore(value=THREAD_MAX)
    ]

import sys
sys.setrecursionlimit(10000)

def thread_limit(index):
    def apply_decorator(func):
        def func_wrapper(*args, **kwargs):
            if USE_THREADS:
                thread_limiter[index].acquire()
                try:
                    return func(*args, **kwargs)
                finally:
                    sleep(SLEEP)
                    thread_limiter[index].release()
            else:
                return func(*args, **kwargs)
        return func_wrapper
    return apply_decorator


def get_indices():
    req = urllib2.Request(start)
    response = safe_open(req)
    page = response.read()
    soup = BeautifulSoup(page, 'lxml')
    return [start + el['href'] for el in soup.select(top_level_sel) if not el.find('font')]


@thread_limit(2)
def table_loop(url, headers=None):
    """ Find the 'next' button the asp.net table, recursively yields on each page """
    if headers:
        data = urllib.urlencode(headers)
        req = urllib2.Request(url, data)
    else:
        req = url
    response = safe_open(req)
    soup = BeautifulSoup(response.read(), 'lxml')
    yield soup
    next_button = soup.find('input', class_='rgPageNext')
    if next_button and 'onclick' not in next_button.attrs:
        headers = {}
        for header in soup.find('form', id="aspnetForm").find_all('input'):
            if 'name' in header.attrs and header['type'] != 'submit':
                headers[header['name']] = header.get('value', '')
        headers[next_button['name']] = next_button['value']
        for page in table_loop (url, headers):
            yield page


@thread_limit(1)
def get_document_info((id, series)):
    """ will contain dates before 1900, so must do manually """
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    def date(date_string):
        (day, month, year) = date_string.split()
        return datetime.datetime(int(year), months.index(month)+1, int(day))

    req = urllib2.Request(download % id)
    response = safe_open(req)
    page = BeautifulSoup(response.read(), 'lxml')
    result = defaultdict(lambda: None)
    result['id'] = id
    result['series'] = series
    result['links'] = map(lambda x: x['href'], page.find_all('a', onclick=re.compile("Primary Document Icon")))
    result['title'] = page.select('#ctl00_MainContent_ucItemPane_lblTitleGeneric')[0].text
    try:
        result['superseded'] = page.select('#ctl00_MainContent_ucItemPane_lblStatus')[0].text == 'Superseded'
    except AttributeError:
        pass
    try:
        result['prepared_date'] = date(page.select('#ctl00_MainContent_ucItemPane_trPreparedDate td:nth-of-type(2)')[0].text.strip())
    except IndexError:
        pass
    try:
        result['published_date'] = date(page.select('#ctl00_MainContent_ucItemPane_trPublished td:nth-of-type(2)')[0].text.strip())
    except IndexError:
        pass
    try:
        result['start_date'] = date(page.select('#ctl00_MainContent_ucItemPane_trStartDate td:nth-of-type(2)')[0].text.strip())
    except IndexError:
        pass
    try:
        result['end_date'] = date(page.select('#ctl00_MainContent_ucItemPane_trEndDate td:nth-of-type(2)')[0].text.strip())
    except IndexError:
        pass

    print 'Document Info: ', result

    documents = download_documents(result)
    add_info_to_db(result, documents)


def safe_open(req):
    if hasattr(req, '_Request__original'):
        print 'Open ', req._Request__original
    else:
        print 'Open ', req
    multiple = 1
    while True:
        try:
            return urllib2.urlopen(req)
        except IncompleteRead:
            sleep(SLEEP * multiple)
            multiple *= 2
            if multiple > 1024:
                raise Exception('Failed to fetch file', req)



def download_documents(info):
    results = []
    if len(info['links']):
        for link in info['links']:
            req = urllib2.Request(link)
            response = safe_open(req)
            filename = response.info()['Content-Disposition'].replace('attachment; filename=', '')
            results.append({'document': response.read(), 'format': filename.rsplit('.', 1)[1].lower(), 'filename': filename, 'comlaw_id': info['id']})
    else:
        req = urllib2.Request(details % info['id'])
        response = safe_open(req)
        soup = BeautifulSoup(response.read(), 'lxml')
        try:
            text = soup.select('#RAD_SPLITTER_PANE_CONTENT_ctl00_MainContent_ctl05_RadPane2')[0].renderContents()

            results.append({'document': text, 'format': 'html', 'filename': None, 'comlaw_id': info['id']})
        except IndexError:
            pass
    return results


def add_info_to_db(info, documents):
    db = connect_db_config(config)
    with db.cursor() as cur:
        cur.execute('delete from comlaw_info where id = %(id)s', info)
        cur.execute('delete from comlaw_documents where comlaw_id = %(id)s', info)
        cur.execute("""insert into comlaw_info """
            """(id, title, superseded, prepared_date, published_date, start_date, end_date, links, series) values"""
            """(%(id)s, %(title)s, %(superseded)s, %(prepared_date)s, %(published_date)s, %(start_date)s, %(end_date)s, %(links)s, %(series)s)""",
            info)
        for document in documents:
            document = dict(document.items())
            document['document'] = psycopg2.Binary(document['document'])
            cur.execute("""insert into comlaw_documents (comlaw_id, document, format, filename) values """
                """ (%(comlaw_id)s, %(document)s, %(format)s, %(filename)s) """, document)
    db.commit()
    db.close()

def get_unfetched_ids(ids):
    db = connect_db_config(config)
    with db.cursor() as cur:
        cur.execute("""select array_agg(x) from unnest(%(ids)s) as x left join comlaw_info as c on c.id = x where c.id is null;""",
            {'ids': ids})
        filtered_ids = cur.fetchone()[0]
        return filtered_ids

@thread_limit(0)
def get_series(id):
    for page in table_loop(series % id):
        ids = map(lambda x: x.text, page.select('#ctl00_MainContent_SeriesCompilations_RadGrid1_ctl00 > tbody > tr > td:nth-of-type(2)'))
        """ If has no previous versions, will not have table """
        if not len(ids):
            ids = [id]
        ids = get_unfetched_ids(ids)
        print "Series", ids
        if ids:
            if USE_THREADS:
                pool = ThreadPool(THREAD_MAX)
                _results = pool.map(get_document_info, zip(ids, [id] * len(ids)))
                pool.close()
                pool.join()
            else:
                map(get_document_info, zip(ids, [id] * len(ids)))


def open_index(url):
    db = connect_db_config(config)
    with db.cursor() as cur:
        cur.execute("""select true from comlaw_indices where url = %(url)s""", {'url': url})
        results = cur.fetchone()
    if not results:
        for page in table_loop(url):
            buttons = page.find_all('input', id=re.compile('_btnSeries$'))
            ids = map(lambda x: x['onclick'].split(',')[4].split('/')[-1].replace('"', ''), buttons)
            print 'Found %d ids' % len(ids), ids
            if USE_THREADS:
                pool = ThreadPool(THREAD_MAX)
                pool.map(get_series, ids)
                pool.close()
                pool.join()
            else:
                map(get_series, ids)
        with db.cursor() as cur:
            cur.execute("""insert into comlaw_indices (url, date) values (%(url)s, %(date)s)""",
                {'url': url, 'date': datetime.datetime.now()})
        db.commit()
    db.close()


if __name__ == '__main__':
    if not len(sys.argv) > 1:
        raise Exception('Missing configuration file')
    sys.setrecursionlimit(10000)
    sys.path.append(os.getcwd())
    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
    sys.path.append(path.dirname(path.dirname(path.abspath(__file__))))
    from db import connect_db_config
    indices = get_indices()
    #indices = ['https://www.comlaw.gov.au/Browse/Results/ByTitle/Acts/Current/Wo/0']
    try:
        for index in indices:
            open_index(index)
    except KeyboardInterrupt:
        print 'Exiting early'
        sys.exit()
