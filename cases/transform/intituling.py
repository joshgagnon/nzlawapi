# -*- coding: utf-8 -*-

import re
from common import find_reg_el, find_until, separator_reg
from bs4 import Tag
import copy
from util import indexsplit

received_reg = re.compile(r'(received)[:;]', flags=re.IGNORECASE)
counsel_reg = re.compile(r'(counsel|appearances)[:;]', flags=re.IGNORECASE)
plea_reg = re.compile(r'(pleas?)[:;]', flags=re.IGNORECASE)
judgment_reg = re.compile(r'(judgments?|sentences?d?)[:;]', flags=re.IGNORECASE)
hearing_reg = re.compile(r'hearing[:;]', flags=re.IGNORECASE)
bench_reg = re.compile(r'court[:;]', flags=re.IGNORECASE)
court_reg = re.compile(r'.*OF NEW ZEALAND( REGISTRY)?\W*$', flags=re.IGNORECASE)
courtfile_variants = [
    '(CA|SC|CIV|CIVP|CRI)[ :]?[-0-9/\.,(and)(to)(&) ]{2,}(-\w)?',
    'T NO\. S\d{4,}',
    '(S|T)\d{4,}',
    'B \d+IM\d+',
    '\d{2,}\/\d{2,}',
    '\d{4}-\d{3}-\d{6}',
    'AP \d{2}\/\d{4}']
# TODO expand ranges
courtfile_num = re.compile('^((%s)( & )?)+$' % '|'.join(courtfile_variants), flags=re.IGNORECASE)

def generate_intituling(soup):
    for strong in soup.find('intituling').find_all('strong'):
        strong.unwrap()
    intituling = soup.new_tag('intituling')

    def optional_section(name, func, intituling):
        try:
            result = func(soup)
            if result:
                for r in result or []:
                    if isinstance(r, Tag):
                        el = r
                    else:
                        el = soup.new_tag(name)
                        el.append(r)
                    intituling.append(el)
        except AttributeError, e:
            pass

    optional_section('full-citation', find_full_citation, intituling)
    optional_section('court', find_court, intituling)
    optional_section('registry', find_registry, intituling)
    optional_section('neutral-citation', find_neutral, intituling)
    optional_section(None, matters, intituling)
    optional_section(None, parties, intituling)

    optional_section('hearing', find_hearing, intituling)
    optional_section('counsel', find_counsel, intituling)
    optional_section('bench', find_bench, intituling)
    optional_section('plea', find_plea, intituling)
    optional_section('received', find_plea, intituling)
    optional_section('judgment', find_judgment, intituling)

    intituling.append(waistband(soup))

    for solicitor in solicitors(soup):
        intituling.append(solicitor)

    return intituling


def full_citation_lines(soup):
    # must be first page
    fields = soup.find('footer-page').find_all('footer-field')
    strings = map(lambda x: x.text, fields)
    #for i, s in enumerate(strings):
    #    if court_file in s:
    #        return strings[i:]
    # might be a typo in there
    for i, s in enumerate(strings):
        if len(s) > 20 and sum(1 for c in s if c.isupper()) > (len(s) / 2): #dangerous magic numbers
            return strings[i:]
    return [strings[-1]]


def find_full_citation(soup):
    strings = full_citation_lines(soup)
    return [' '.join(strings)]


def find_court(soup):
    return [find_reg_el(soup, court_reg).text]


def find_registry(soup):

    start = find_reg_el(soup, court_reg)
    registry = find_until(start, None, use_left=True)
    if registry:
        return [registry[-1].text]


def find_court_file(soup):
    return map(lambda x: x.text, soup.find_all('intituling-field', text=courtfile_num))


def court_file_before(soup, el):
    while not courtfile_num.match(el.text):
        el = el.previous_sibling
    return el.text



def find_neutral(soup):
    reg = re.compile(r'\W*\[(\d){4}\] NZ(HC|CA|SC) (\d+)\W*$')
    try:
        return [find_reg_el(soup, reg).text.strip()]
    except AttributeError:
        return None

def find_bench(soup):
    reg = bench_reg
    start = find_reg_el(soup, reg)
    if start:
        results = [start] + find_until(start, re.compile('\w+:'), use_left=False)
        return [re.sub(reg, '', ' '.join(map(lambda x: x.text, results)))]
    else:
        return None


def find_hearing(soup):
    reg = hearing_reg
    start = find_reg_el(soup, reg)
    if start:
        more_left = False
        use_left = True
        if re.sub(reg, '', start.text).strip():
            use_left = False
            more_left = True
        else:
            start = start.next_sibling
        results = [start] + find_until(start, re.compile('\w+:'), use_left=use_left, more_left=more_left)
        return [re.sub(reg, '', ' '.join(map(lambda x: x.text, results)))]
    else:
        return None


def find_judgment(soup):
    reg = judgment_reg
    start = find_reg_el(soup, reg)
    if start:
        results = [start] + find_until(start, re.compile('\w+:'), use_left=False)
        return [re.sub(reg, '', ' '.join(map(lambda x: x.text, results)))]
    else:
        return None


def find_plea(soup):
    reg = plea_reg
    start = find_reg_el(soup, reg)
    return [re.sub(reg, '', start.text)]


def find_counsel(soup):
    reg = counsel_reg
    start = find_reg_el(soup, reg)
    results = [start]+ find_until(start, re.compile('\w+:'), use_left=False)
    return filter(None, map(lambda x: re.sub(reg, '',  x.text.strip()), results))


def find_received(soup):
    start = find_reg_el(soup, received_reg)
    return [re.sub(reg, '', start.text)]


def solicitors(soup):
    solicitors = []
    full_citation = full_citation_lines(soup)
    counsel_pat = re.compile('^(counsel|copy to)[:;]?', flags=re.IGNORECASE)
    for s in find_solicitors(soup) or []:
        if s not in full_citation and not counsel_pat.match(s):
            solicitor = soup.new_tag('solicitor')
            solicitor.string = s
            solicitors.append(solicitor)
        else:
            break
    return solicitors



def find_solicitors(soup):
    reg = re.compile(r'^solicitors?(/counsel)?s?[:;]?\W*', flags=re.IGNORECASE)
    start = find_reg_el(soup, reg, field=["footer-field", "intituling-field"])
    strings = []
    if start:
        if re.sub(reg, '', start.text):
            strings += [re.sub(reg, '', start.text)]
        results = find_until(start, None, use_left=False)
        strings += map(lambda x: x.text, results)
        strings = filter(lambda x: not x.startswith('('), strings)
        strings = filter(lambda x: x, strings)
        return strings


def waistband(soup):
    # find all waistband rows
    reg = re.compile(r'^(JUDGMENT OF |SENTENCING)', flags=re.IGNORECASE)
    start = find_reg_el(soup, reg)
    parts = find_until(start, use_left=False)
    parts = filter(lambda x: x.text, parts)

    waistband = soup.new_tag('waistband')
    title = soup.new_tag('title')
    title.string = start.text
    waistband.append(title)

    counter = 'A'
    for part in parts:
        text = part.text.strip()
        if part.find('underline'):
            subtitle = soup.new_tag('subtitle')
            subtitle.string = text
            waistband.append(subtitle)
        elif separator_reg.match(text):
            continue
        elif re.match('%s($|\s)' % counter, text):
            if waistband.contents[-1].name != 'list':
                waistband.append(soup.new_tag('list'))
            entry = soup.new_tag('entry')
            label = soup.new_tag('label')
            label.string = counter
            text_el = soup.new_tag('text')
            text_el.string = text[2:]
            entry.append(label)
            entry.append(text_el)
            waistband.contents[-1].append(entry)
            counter = chr(ord(counter) + 1)
        else:
            if not waistband.find('text'):
                text_el = soup.new_tag('text')
                waistband.append(text_el)
            waistband.find_all('text')[-1].append(' '+text)

    return waistband


def parties(soup):

    def party(row, name):
        el = soup.new_tag(name)
        if 'qualifier' in row:
            qualifier = soup.new_tag('qualifier')
            qualifier.string = row['qualifier']
            el.append(qualifier)
        value = soup.new_tag('value')
        value.string = row['value']
        el.append(value)
        if 'descriptor' in row:
            descriptor = soup.new_tag('descriptor')
            descriptor.string = row['descriptor']
            el.append(descriptor)
        return el

    try:
        party_dicts = find_parties(soup)
    except AttributeError:
        party_dicts = find_versus(soup)

    results = []

    for party_dict in party_dicts:
        parties = soup.new_tag('parties')
        courtfile = soup.new_tag('court-file')
        plantiffs = soup.new_tag('plantiffs')
        defendants = soup.new_tag('defendants')
        parties.append(courtfile)
        parties.append(plantiffs)
        parties.append(defendants)

        courtfile.string = party_dict['court-file']

        for p in party_dict['plantiffs']:
            plantiffs.append(party(p, 'plantiff'))

        for p in party_dict['defendants']:
            defendants.append(party(p, 'defendant'))

        if len(party_dict.get('thirdparties', [])):
            thirdparties = soup.new_tag('thirdparties')
            parties.append(thirdparties)
            for p in party_dict['thirdparties']:
                defendants.append(party(p, 'thirdparty'))

        results.append(parties)

    return results


qualifier_pattern = re.compile('(and between|and|between)', flags=re.IGNORECASE)


def find_parties(soup):
    party_dict = {'plantiffs': [], 'defendants': [], 'thirdparties': [], 'court-file': None}
    parties = [copy.deepcopy(party_dict)]


    def add_persons(qualifier, column):
        name = ' '.join(map(lambda x: x.text, column[:-1]))
        descriptor = column[-1].text
        group = 'defendants'
        if plantiff_pattern.match(descriptor):
            group = 'plantiffs'
        elif thirdparty_pattern.match(descriptor):
            group = 'thirdparty'
        parties[-1][group].append({
            'qualifier': qualifier,
            'value': name,
            'descriptor': descriptor
            })

    plantiff_pattern = re.compile('.*(Plaintiff|Applicant|Appellant|Insolvent)s?')
    thirdparty_pattern = re.compile('.*Third [Pp]art(y|ies)')
    next_qualifier = find_reg_el(soup, qualifier_pattern)

    parties[-1]['court-file'] = court_file_before(soup, next_qualifier)

    while qualifier_pattern.match(next_qualifier.text):
        segments = [next_qualifier.next_sibling] + find_until(next_qualifier.next_sibling)
        """ Must also split on lines that aren't all caps """
        splits = [i + 1 for i, seg in enumerate(segments) if seg.text.upper() != seg.text]
        for seg in indexsplit(segments, *splits):
            add_persons(next_qualifier.text, seg)
        next_qualifier = segments[-1].next_sibling

        if not qualifier_pattern.match(next_qualifier.text) and courtfile_num.match(next_qualifier.text):
            parties += [copy.deepcopy(party_dict)]
            parties[-1]['court-file'] = next_qualifier.text
            next_qualifier = next_qualifier.next_sibling

    return parties


def find_versus(soup):
    """ If find_parties fails, assume this """
    start = find_reg_el(soup, re.compile('^v$'))
    parties = {
        'plantiffs': [{'value': start.previous_sibling.string}]
    }
    parties['court-file'] = court_file_before(soup, start.previous_sibling)
    defendants = [start.next_sibling] + find_until(start.next_sibling, use_left=False)
    parties['defendants'] = [{'value': ' '.join(map(lambda x: x.text, defendants))}]
    return [parties]


def matters(soup):
    matter_pattern = re.compile('(and\s)?(in the matter|in the estate|under)(\sof)?\s?', flags=re.IGNORECASE)
    next_qualifier = find_reg_el(soup, matter_pattern)
    results = []
    try:
        while matter_pattern.match(next_qualifier.text):
            matter = soup.new_tag('matter')
            qualifier = soup.new_tag('qualifier')
            value = soup.new_tag('value')
            text = re.sub(matter_pattern, '', next_qualifier.text)
            if len(text):
                qualifier.string = next_qualifier.text.replace(text, '')
                value.string = text
                next_qualifier = next_qualifier.next_sibling
            else:
                qualifier.string = next_qualifier.text
                segments = [next_qualifier.next_sibling] + find_until(next_qualifier.next_sibling, debug=True)
                value.string = ' '.join(map(lambda x: x.text, segments))
                next_qualifier = segments[-1].next_sibling
            matter.append(qualifier)
            matter.append(value)
            results.append(matter)
    except Exception, e:
        pass

    return results



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


def iso_date(value):
    if value:
        return datetime.datetime(*map(int, re.split('\D', value)[:-1]))