# -*- coding: utf-8 -*-
import re
from bs4 import element, Tag
separator_reg = re.compile('^[…_\.]{5,}$')

class NoText(Exception):
    pass

def extend_el(source, dest):
    for c in source.contents[:]:
        dest.append(c)
    source.decompose()
    return dest


def remove_empty_elements(soup):
    ignore_tags = ['underline', 'signature-line']
    if isinstance(soup, Tag):
        for c in soup.contents:
            remove_empty_elements(c)
        if soup.is_empty_element and soup.name not in ignore_tags:
            soup.decompose()
    return soup

def get_left(el):
    return float(el.attrs.get('left', 0))

def get_top(el):
    return float(el.attrs.get('top', 0))

def get_right(el):
    return float(el.attrs.get('right', 0))

def get_width(el):
    return get_right(el) - get_left(el)

def get_bold(el):
    return el.attrs.get('bold')

def is_center(el):
    return el.attrs.get('center') == '1'

def find_reg_el(soup, reg, field='intituling-field'):
    for e in soup.find_all(field):
        if reg.match(e.text):
            return e


def find_until(el, reg=None, use_left=True, forward=True, more_left=False, debug=False):
    results = []
    left = get_left(el)
    bold = get_bold(el)

    def direction(el):
        if forward:
            return el.next_sibling
        return el.previous_sibling
    """ WARNING MAGIC NUMBER BELOW """
    while direction(el) and not (reg and reg.match(direction(el).text)) and (
        not use_left or abs(get_left(direction(el)) -left) < 3.0 ) and get_bold(direction(el)) == bold and (
        not more_left or get_left(direction(el)) > left):
        results.append(direction(el))
        el = direction(el)
    return results
