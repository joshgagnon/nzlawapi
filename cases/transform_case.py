# -*- coding: utf-8 -*-
from __future__ import division
from bs4 import BeautifulSoup, Tag, NavigableString
import re
import sys
import datetime
from tempfile import mkdtemp
import shutil
from flask import current_app
from util import indexsplit
import copy
from cases.pdfs import generate_parsable_xml
from cases.transform.intituling import generate_intituling
from cases.transform.body import generate_body, generate_footer, tweak_intituling_interface
from cases.transform.common import remove_empty_elements


# source
"""https://forms.justice.govt.nz/solr/jdo/select?q=*:*&rows=500000&fl=FileNumber%2C%20Jurisdiction%2C%20MNC%2C%20Appearances%2C%20JudicialOfficer%2C%20CaseName%2C%20JudgmentDate%2C%20Location%2C%20DocumentName%2C%20id&wt=json&json.wrf=json%22%22%22"""


def join_adjacent_styles(soup):
    for el in soup.find_all(['strong', 'emphasis'])[:-1][::-1]:
        if isinstance(el.next_sibling, Tag) and el.next_sibling.name == el.name:
            for content in el.next_sibling.contents:
                last = el.contents[-1]
                if isinstance(content, NavigableString) and isinstance(last, NavigableString):
                    last.replace_with('%s%s' % (last, content))
                else:
                    el.append(content)
            el.next_sibling.decompose()
    for el in soup.find_all('hline')[:-1][::-1]:
        if False and el.next_sibling and el.next_sibling.name == 'hline':
            el.next_sibling.decompose()
    return soup


def massage_xml(soup, debug):
    if debug:
        print soup.prettify()
    soup = remove_empty_elements(soup)
    soup = join_adjacent_styles(soup)
    soup = tweak_intituling_interface(soup)
    #soup = BeautifulSoup(soup.encode(), 'lxml-xml')
    intituling = generate_intituling(soup)
    body = generate_body(soup)
    footer = generate_footer(soup)
    case = soup.new_tag('case')
    case.append(intituling)
    if body:
        case.append(body)
    if footer:
        case.append(footer)
    case = remove_empty_elements(case)
    if debug:
        print case.prettify()
    return case


def process_case(path, debug=False):
    tmp = mkdtemp()
    xml = generate_parsable_xml(path, tmp)
    soup = BeautifulSoup(xml, features='lxml-xml')
    results = massage_xml(soup, debug)
    shutil.rmtree(tmp)
    return re.sub(' +', ' ', results.encode())


if __name__ == '__main__':
    import sys
    import importlib
    import os
    from os import listdir
    import os.path as path
    from os.path import isfile, join
    if not len(sys.argv) > 1:
        raise Exception('Missing configuration file')
    sys.path.append(os.getcwd())
    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
    sys.path.append(path.dirname(path.dirname(path.abspath(__file__))))
    offset = 458
    for i, f in enumerate(listdir(config.CASE_DIR)[offset:]):
        if isfile(join(config.CASE_DIR, f)) and f.endswith('.pdf'):
            #try:
            print 'OPENING: (%d) ' % (i + offset), f
            result = process_case(join(config.CASE_DIR, f))
            if not result.find('parties'):
                raise Exception('no parties')
            if not result.find('full-citation'):
                raise Exception('no full citation')

            #except Exception, e:
            #    print 'FAILED ON: ', join(config.CASE_DIR, f)
            #    print e