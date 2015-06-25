from __future__ import division
from bs4 import BeautifulSoup
import os
import json
import re
from PIL import Image
import psycopg2
import sys
import datetime
from subprocess import Popen, PIPE
from tempfile import mkdtemp
import shutil
import importlib
from collections import defaultdict
from lxml import etree, html
from flask import current_app
from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
from pdfminer.converter import TextConverter
from pdfminer.layout import LAParams
from pdfminer.pdfpage import PDFPage
from cStringIO import StringIO

# source
"""https://forms.justice.govt.nz/solr/jdo/select?q=*:*&rows=500000&fl=FileNumber%2C%20Jurisdiction%2C%20MNC%2C%20Appearances%2C%20JudicialOfficer%2C%20CaseName%2C%20JudgmentDate%2C%20Location%2C%20DocumentName%2C%20id&wt=json&json.wrf=json%22%22%22"""


courtfile_variants = [
    '(SC |CA )?(CA|SC|CIV|CIVP|CRI):?[-0-9/\.,(and)(to)(&) ]{2,}(-\w)?',
    'T NO\. S\d{4,}',
    '(S|T)\d{4,}',
    'B \d+IM\d+',
    '\d{2,}\/\d{2,}',
    '\d{4}-\d{3}-\d{6}',
    'AP \d{2}\/\d{4}']

courtfile_num = re.compile('^((%s)( & )?)+$' % '|'.join(courtfile_variants), flags=re.IGNORECASE)


def generate_parsable_html(filename, tmp):
    outname = os.path.join(tmp, 'out.html')
    cmd = """%s -p -c -noframes "%s" %s"""
    print cmd % (current_app.config['PDFTOHTML'], filename, outname)
    p = Popen(cmd % (current_app.config['PDFTOHTML'], filename, outname), shell=True, stdout=PIPE, stderr=PIPE)
    out, err = p.communicate()
    if out.rstrip():
        print filename, err
    with open(outname) as f:
        return f.read()


class NoText(Exception):
    pass


def next_tag(el, name):
    el = el.next_sibling
    while  el.name != name:
        el = el.next_sibling
    return el


def prev_tag(el, name):
    el = el.previous_sibling
    while  el.name != name:
        el = el.previous_sibling
    return el


def left_margin(soup):
    return get_left_position(soup.find('div'))


def el_class_style(el):
    try:
        class_name = el.find('span').attrs['class'][0]
        sheet = (e for e in el.previous_siblings if e.name == 'style').next().text.split()
        line = (s for s in sheet if s.startswith('.'+class_name)).next().replace('.'+class_name, '')[1:-1]
        return style_to_dict(line)
    except (AttributeError, StopIteration):
        return {}


def style_to_dict(line):
    return dict([x.split(':') for x in line.split(';') if x])


def font_size(el):
    return int(re.match(r'\d+', el_class_style(el).get('font-size', '16px')).group())


def is_bold(el):
    return el_class_style(el).get('font-weight') == 'bold'


def neutral_cite(soup):
    try:
        return neutral_cite_el(soup).text
    except StopIteration:
        pass


def neutral_cite_el(soup):
    reg = re.compile(r'\[(\d){4}\] NZ(HC|CA|SC) (\d+)$')
    el = (e for e in soup.find_all('div') if reg.match(e.text) and is_bold(e)).next()
    return el


def court_file(soup):
    el = (e for e in soup.select('div') if courtfile_num.match(e.text)).next()
    return el.text


def full_citation(soup):
    court_str = court(soup)[0]
    result = []
    el = soup.find('div')
    # first letterelement must contain some s
    letters = re.compile(r'.*\w.*')
    while not letters.match(el.text):
        el = next_tag(el, 'div')
    # can't be bold
    while is_bold(el):
        el = next_tag(el, 'div')
    top = get_top_position(el)
    while top <= get_top_position(el):
        result += [el.text]
        el = next_tag(el, 'div')
    return ' '.join(result)


def court(soup):
    reg = re.compile(r'.*OF NEW ZEALAND( REGISTRY)?$', flags=re.IGNORECASE)
    el = (e for e in soup.select('div  span') if reg.match(e.text)).next()
    next_el = next_tag(el.parent.parent, 'div').find('span')
    result = [el.text]
    if not courtfile_num.match(next_el.text):
        result +=  [next_el.text]
    return result


def get_left_position(el):
    return int(re.search(r'.*left:(\d+).*', el.attrs['style']).group(1))


def get_top_position(el):
    return int(re.search(r'.*top:(\d+).*', el.attrs['style']).group(1))


def consecutive_align(el):
    results = []
    position = get_left_position(el)
    while position == get_left_position(el):
        results.append(el.text)
        el = next_tag(el, 'div')
    return (results, el)


def parse_between(soup):
    results = {}
    between = ['AND BETWEEN', 'BETWEEN']
    el = (e for e in soup.find_all('div') if e.text in between).next()
    plantiff_patterns = [
        re.compile('.*Plaintiff[s]?'),
        re.compile('.*Applicant[s]?'),
        re.compile('.*Appellant[s]?'),
        re.compile('.*Insolvent[s]?')
    ]
    # while not at next section

    while el.text in between:
        # look back to get court_num
        try:
            court_num = (e for e in el.previous_siblings if courtfile_num.match(e.text)).next().text
        except:
            court_num = "UNKNOWN"
        el = next_tag(el, 'div')
        plantiff = []
        defendant = []
        while True:
            parties, el = consecutive_align(el)
            if any((p.match(parties[-1]) for p in plantiff_patterns)):
                plantiff += parties
            else:
                defendant += parties
            if el.text != 'AND':
                break
            el = next_tag(el, 'div')

        results[court_num] = {
            'plantiffs': plantiff,
            'defendants': defendant
        }

    return results


def parse_versus(soup):
    results = {}
    plantiff = []
    defendant = []
    # must be x v y
    v = (e for e in soup.find_all('div') if e.text.lower() == 'v').next()
    # plantiff is every until neutral citation
    court_num = (e for e in v.previous_siblings if courtfile_num.match(e.text)).next().text
    between_el = prev_tag(v, 'div')
    cite = neutral_cite(soup) or court_num
    while between_el.text != cite:
        plantiff = [between_el.text] + plantiff
        between_el = prev_tag(between_el, 'div')
    # defendant is everything until no more capitals
    between_el = next_tag(v, 'div')
    while between_el.text and ':' not in between_el.text:
        defendant += [between_el.text]
        between_el = next_tag(between_el, 'div')
    results[court_num] = {
        'plantiff': plantiff,
        'defendant': defendant
    }
    return results


def parties(soup):
    between = ['AND BETWEEN', 'BETWEEN']
    if any([e for e in soup.find_all('div') if e.text in between]):
        return parse_between(soup)
    elif any([e for e in soup.find_all('div') if e.text.lower() == 'v']):
        return parse_versus(soup)
    else:
        result = {}
        result[court_file(soup)] = {}
        return result


def element_after_column(soup, strings):
    el = (e for e in soup.find_all('div') if e.text in strings).next()
    while get_left_position(el) == get_left_position(next_tag(el, 'div')):
        el = next_tag(el, 'div')
    return next_tag(el, 'div')


def text_after_column(soup, strings):
    try:
        return element_after_column(soup, strings).text
    except StopIteration:
        pass


def texts_after_column(soup, strings):
    try:
        els = consecutive_align(element_after_column(soup, strings))
        return ' '.join(els[0])
    except StopIteration:
        pass


def judgment(soup):
    return text_after_column(soup, ['Judgment:', 'Sentence:', 'Sentenced:'])


def hearing(soup):
    return text_after_column(soup, ['Hearing:','Hearings:', 'received:'])


def charge(soup):
    return text_after_column(soup, ['Charge:'])


def plea(soup):
    return text_after_column(soup, ['Plea:'])


def received(soup):
    return text_after_column(soup, ['received:'])


def bench(soup):
    return text_after_column(soup, ['Court:'])


def find_bars(soup, path):
    def is_black(pixel):
        return sum(pixel) < 150

    images = soup.find_all('img')
    results = []

    for image_el in images:
        page_number = int(image_el.attrs['name'])
        image_path = os.path.join(path, image_el.attrs['src'])
        im = Image.open(image_path)
        width, height = int(image_el.attrs['width']), int(image_el.attrs['height'])
        im = im.resize((width, height), Image.NEAREST)
        pixels = im.load()
        x = im.size[0]//2
        previous = 0
        for y in xrange(im.size[1]):
            if is_black(pixels[x, y]) and y > previous + 5:
                results.append((page_number, y))
                previous = y
                if len(results) == 2:
                    if not el_between_bars(soup, results):
                        results = [results[1]]
                    else:
                        return results
        # can't be more than a page, i would guess
        if len(results) == 1 and page_number > results[0][0]:
            break

    return results


def get_page(el):
    return int(el.find_previous_sibling('img').attrs['name'])


def el_between_bars(soup, bars):
    try:
        first_el_after_bar(soup, bars)
        return True
    except StopIteration:
        return False


def first_el_after_bar(soup, bars):
    el = soup.select('img[name=%d]'%bars[0][0])[0]
    line_gap = 50
    top = bars[0][1]
    return (div for div in el.find_next_siblings('div')
        if top < get_top_position(div) < top + line_gap).next()



def waistband_el(soup, path):
    results = []
    bars = find_bars(soup, path)
    underscore = re.compile('^_+$')
    line_height = 10
    if len(bars) == 2:
        el = first_el_after_bar(soup, bars)
        while get_page(el) < bars[1][0] or \
            (get_page(el) == bars[1][0] and get_top_position(el) + line_height < bars[1][1]):
            if len(results) and underscore.match(el.text):
                 el = next_tag(el, 'div')
                 break
            results.append(el.text)
            el = next_tag(el, 'div')
    elif len(bars) == 1: # if no second bar, get bold
        el = first_el_after_bar(soup, bars)
        if is_bold(el):
            letters = re.compile(r'.*[a-zA-Z].*')
            while is_bold(el):
                if letters.match(el.text):
                    results.append(el.text)
                el = next_tag(el, 'div')
        else:
            while not underscore.match(el.text):
                results.append(el.text)
                el = next_tag(el, 'div')
    else: #maybe they used underscores
        try:
            el = next_tag((el for el in soup.find_all('div') if underscore.match(el.text)).next(), 'div')
            while not underscore.match(el.text):
                results.append(el.text)
                el = next_tag(el, 'div')
        except StopIteration: #bastards, they forgot every kind
            results = []
            el = (el for el in soup.find_all('div') if el.text == '[1]').next()
    return [' '.join(results), el]


def waistband(soup, path):
    return waistband_el(soup, path)[0]


def counsel(soup):
    counsel_strings = ['Counsel:', 'Appearances:']
    try:
        def inclusion(el):
            return el.text in counsel_strings and font_size(el) > 14

        counsel = next_tag((e for e in soup.find_all('div') if inclusion(e)).next(), 'div')
        return consecutive_align(counsel)[0]
    except: pass
    try:
        counsel_tag = (e for e in soup.find_all('div') if any(e.text.startswith(x) for x in counsel_strings)).next()
        counsel = counsel_tag.text
        for c in counsel_strings:
            counsel = counsel.replace(c, '')
        counsel = [counsel.strip()]
        # keep consuming until a ':' appears, dumb and will have to do for now
        while True:
            counsel_tag = next_tag(counsel_tag, 'div')
            if ':' in counsel_tag.text:
                break
            else:
                counsel.append(counsel_tag.text)
        return counsel
    except: pass


def matter(soup):
    result = {}
    result['UNDER'] = texts_after_column(soup, ['UNDER'])
    result['IN THE MATTER OF'] = texts_after_column(soup, ['IN THE MATTER OF'])
    result['AND IN THE MATTER OF'] = texts_after_column(soup, ['IN THE MATTER OF'])
    result['IN THE ESTATE OF'] = texts_after_column(soup, ['IN THE ESTATE OF'])
    for k, i in result.items():
        if not i:
            del result[k]
    return result


def is_appeal(info):
    if info.get('neutral_citation'):
        return re.compile('.*NZ(CA|SC).*').match(info.get('neutral_citation'))


def appeal_result(soup, path):
    el = waistband_el(soup, path)[1]
    results = {}
    position = re.search(r'.*(left:\d+).*', el.attrs['style']).group(1)
    text_re = re.compile('.*[a-zA-Z]+.*')
    while position in el.attrs['style'] and el_class_style(el).get('font-weight') == 'bold':
        key = el.text
        if not text_re.match(key):
            break
        el = next_tag(el, 'div')
        if text_re.match(el.text):
            results[key], el = consecutive_align(el)
            results[key] = ' '.join(results[key])
        else:
            results = {'key': key}
            break

    return results


def mangle_format(soup):
    flat_soup = BeautifulSoup('<div/>').select('div')[0]
    # first give all bg images page numbers
    for div in soup.select('body > div'):
        div.find('img').attrs['name'] = div.find_previous_sibling('a').attrs['name']
    [flat_soup.append(x) for x in soup.select('body > div > *')]
    # remove things with white text.
    [el.extract() for el in flat_soup.select('div') if el_class_style(el).get('color') == '#ffffff']
    #confirm text exists
    text_re = re.compile('[a-zA-Z]+')
    if not text_re.search(flat_soup.text):
        raise NoText('contains no text')
    return flat_soup


def iso_date(value):
    if value:
        return datetime.datetime(*map(int, re.split('\D', value)[:-1]))


def intituling(soup):
    flat_soup = mangle_format(soup)

    results = {
        'neutral_citation': json_dict.get('MNC') or neutral_cite(flat_soup),
        'court': court(flat_soup),
        'full_citation': json_dict.get('CaseName') or full_citation(flat_soup),
        'parties': parties(flat_soup),
        'counsel': counsel(flat_soup),
        'judgment': judgment(flat_soup),
        'waistband': waistband(flat_soup, tmp),
        'hearing': hearing(flat_soup),
        'received': received(flat_soup),
        'matter': matter(flat_soup),
        'charge': charge(flat_soup),
        'plea': plea(flat_soup),
        'bench': bench(flat_soup)
        #'file_number': json_dict.get('FileNumber'),
        #'location': json_dict.get('Location'),
        #'appearances': json_dict.get('Appearances'),
        #'jurisdiction': json_dict.get('Jurisdiction'),
        #'judgment_date': iso_date(json_dict.get('JudgmentDate')),
        #'document': generate_pretty_html(filename, config, tmp)
    }
    if is_appeal(results):
        results['appeal_result'] = appeal_result(flat_soup, tmp)
    return results

def process_case(filename):
    tmp = mkdtemp()
    html = generate_parsable_html(filename, tmp)
    print html
    soup = BeautifulSoup(html)
    intit_dict = intituling(soup)
    print intit_dict
    shutil.rmtree(tmp)
    return results

