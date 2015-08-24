import urllib, urllib2
from bs4 import BeautifulSoup
import re
import pprint

start = 'https://www.comlaw.gov.au/Browse/'


top_level_sel = '#ctl00_MainContent_pnlBrowse a font'


def get_indices():
    req = urllib2.Request(start)
    response = urllib2.urlopen(req)
    page = response.read()
    soup = BeautifulSoup(page)
    return [start+el.parent['href'] for el in soup.select(top_level_sel)]

def open_index(url, headers=None):
    if headers:
        data = urllib.urlencode(headers)
        req = urllib2.Request(url, data)
    else:
        req = url
    response = urllib2.urlopen(req)
    soup = BeautifulSoup(response.read())
    ids = map(lambda x: x.text, soup.find_all('span', id=re.compile('lblComlawId$')))
    print 'Found %d ids' % len(ids), ids
    next_button = soup.find('input', class_='rgPageNext')
    if next_button and 'onclick' not in next_button.attrs:
        headers = {}
        for header in soup.find('form', id="aspnetForm").find_all('input'):
            if 'name' in header.attrs and header['type'] != 'submit':
                headers[header['name']] = header.get('value', '')
        headers[next_button['name']] = next_button['value']
        ids += open_index(url, headers)
    return ids


if __name__ == '__main__':
    #indices = [get_indices()]
    indices = ['https://www.comlaw.gov.au/Browse/Results/ByTitle/Acts/Current/A/0']
    for index in indices:
        open_index(index)

