# -*- coding: utf-8 -*-
import re
from bs4 import element, Tag

separator_reg = re.compile(u'^\s*[…_\.]{5,}\s*$')
hline_like_reg = re.compile(u'^_*$')

class NoText(Exception):
    pass

def extend_el(source, dest):
    for c in source.contents[:]:
        dest.append(c)
    source.decompose()
    return dest


def remove_empty_elements(soup):
    ignore_tags = ['underline', 'signature-line', 'hline', 'image', 'sml-image']
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


def is_bold(el):
    return el.attrs.get('bold') == '1'


def is_center(el):
    return el.attrs.get('center-aligned') == '1'


def is_right_aligned(el):
    return el.attrs.get('right-aligned') == '1'


def is_left_aligned(el):
    return el.attrs.get('left-aligned') == '1'


def find_reg_el(soup, reg, field='intituling-field'):
    for e in soup.find_all(field):
        if reg.match(e.text):
            return e

def find_intituling(el, reg):
    if not el:
        return
    if reg.match(el.text):
        return el
    while el.next_sibling:
        if reg.match(el.text):
            return el
        el = el.next_sibling


def find_reg_el_all(soup, reg, field='intituling-field', before_test=None):
    valid = not bool(before_test)

    for e in soup.find_all(field):
        if valid and e and reg.match(e.text):
            yield e
        if not valid and before_test(e):
            valid = True


def find_until(el, reg=None, use_left=True, forward=True, more_left=False, more_equal_left=False, center=False, debug=False):
    results = []
    left = get_left(el)
    bold = is_bold(el)

    def direction(el):
        if forward:
            return el.next_sibling
        return el.previous_sibling
    """ WARNING MAGIC NUMBER BELOW """

    while direction(el) and not (reg and reg.match(direction(el).text)) and (
        not use_left or abs(get_left(direction(el)) - left) < 3.0) and (
        is_bold(direction(el)) == bold) and (
        not more_left or get_left(direction(el)) > left) and (
        not more_equal_left or get_left(direction(el)) >= left) and (
        not center or is_center(direction(el))):
        results.append(direction(el))
        el = direction(el)
    return results

