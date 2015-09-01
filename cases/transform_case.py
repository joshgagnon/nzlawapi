# -*- coding: utf-8 -*-
from __future__ import division
from bs4 import BeautifulSoup
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
from bs4 import element, Tag

# source
"""https://forms.justice.govt.nz/solr/jdo/select?q=*:*&rows=500000&fl=FileNumber%2C%20Jurisdiction%2C%20MNC%2C%20Appearances%2C%20JudicialOfficer%2C%20CaseName%2C%20JudgmentDate%2C%20Location%2C%20DocumentName%2C%20id&wt=json&json.wrf=json%22%22%22"""


def remove_empty_elements(soup):
    ignore_tags = ['underline']
    if isinstance(soup, Tag):
        for c in soup.contents:
            remove_empty_elements(c)
        if soup.is_empty_element and soup.name not in ignore_tags:
            soup.decompose()
    return soup




def massage_xml(soup, debug):
    soup = remove_empty_elements(soup)
    if debug:
        print soup.prettify()
    soup = tweak_intituling_interface(soup)
    intituling = generate_intituling(soup)
    body = generate_body(soup)
    footer = generate_footer(soup)
    case = soup.new_tag('case')
    case.append(intituling)
    case.append(body)
    if footer:
        case.append(footer)
    if debug:
        print case.prettify()
    return case


def process_case(filename, debug=False):
    tmp = mkdtemp()
    xml = generate_parsable_xml(filename, tmp)
    soup = BeautifulSoup(xml, features='lxml-xml')
    results = massage_xml(soup, debug)
    shutil.rmtree(tmp)
    return re.sub(' +', ' ', results.encode())
