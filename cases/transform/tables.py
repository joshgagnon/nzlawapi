# -*- coding: utf-8 -*-
import re
from common import extend_el, get_left, get_top, get_right, get_width
from bs4 import NavigableString, Tag
from cases.variables import THRESHOLDS


def unwrap(el):
    parent = el.parent
    if not parent:
        return
    el.unwrap()

    if parent.name == 'entry' and len(parent.contents) > 1:
        i = len(parent.contents)-2
        for c in parent.contents[1:][::-1]:
            if isinstance(c, NavigableString) and isinstance(parent.contents[i], NavigableString):
                parent.contents[i].replace_with('%s%s' % (parent.contents[i], c))
                c.extract()
            i -= 1


def format_table(soup, el):
    contents_reg = re.compile('^\W*(Para No|Table of Contents|Contents|Paragraph Number)\W*$')
    if not el.find('entry'):
        el.decompose()
        return

    matches = el.find_all(text=contents_reg)

    if matches or True:
        el.wrap(soup.new_tag('contents'))
        for m in matches:
            m.extract()
    else:
        if el.find('entry', text=re.compile('^\s*(\[\d+\]|\d+)\s*$')):
            el.wrap(soup.new_tag('contents'))

    """ unwrap method need to be generalized, use this version """
    for strong in el.find_all(['strong', 'emphasis']):
        unwrap(strong)

    for c in el.contents:
        if not isinstance(c, Tag):
            c.extract()



    """ get size limits """
    left = min(get_left(x) for x in el.find_all('entry') if get_left(x))
    right = max(get_right(x) for x in el.find_all('entry') if get_right(x))

    contents_split = re.compile('^(.*?)(\.*)\s?(\[?\d+\]?)\s?$')

    """ Find cases where there is no columns but a single line,
        eg  Introduction.......... 1
        or  The interface between 10 """
    for row in el.find_all('row'):
        if len(row.contents) == 1 and get_right(row) == right:
            match = contents_split.match(row.contents[0].text)
            if not match:
                continue
            row.contents[0].string.replace_with(match.group(1))
            entry = soup.new_tag('entry')
            entry.append(match.group(3))
            row.append(entry)

    """ Find case of a row not ending with a number and not finding a previous
        row join.

        example:
            The relationship between the parens patriae jurisdiction  45
            and the PPPRA jurisdiction

            vs

            The relationship between the parens patriae jurisdiction
            and the PPPRA jurisdiction                                45

        Not perfect by a long shot but all I can think of at the moment
    """
    forward = False

    def direction(el):
        if forward:
            return el.next_sibling
        return el.previous_sibling

    for row in el.find_all('row'):
        if len(row.contents) == 1 and not row.contents[0].is_empty_element and (
            not direction(row) or get_left(row) != get_left(direction(row))):
            forward = True
            break


    # if a row has only 1 entry, put it on next or previous
    rows = el.find_all('row')
    if forward:
        rows = rows[::-1]
    for row in rows:
        if len(row.contents) == 1  and direction(row) and get_left(row) == get_left(direction(row)):
            if contents_reg.match(row.contents[0].text):
                row.decompose()
                continue
            sibling = direction(row).find('entry')
            if not sibling:
                continue
            if forward and get_width(row) < THRESHOLDS['table_column_overflow']:
                continue
            elif not forward and get_width(sibling) < THRESHOLDS['table_column_overflow']:
                continue

            for e in row.contents[0].contents[:][::-1]:
                if forward:
                    sibling.insert(0, ' ')
                    sibling.insert(0, e)
                else:
                    sibling.append(' ')
                    sibling.append(e)
            row.decompose()


    for entry in el.find_all('entry'):
        entry.attrs = {}
        if entry.is_empty_element:
            entry.decompose()

    for row in el.find_all('row'):
        if row.is_empty_element:
            row.decompose()

    for row in el.find_all('row'):
        this_left = get_left(row)
        row.attrs = {}
        if this_left > left or (row.contents[0] and row.contents[0].contents[0].startswith('(')):
            row.attrs['minor'] = "true"


def format_tables(soup):
    """ The first pass is very conservative about joining things between different pages,
        so for now we will assume that a heading between two tables at the top of a page
        is just a row in that table. maybe. """

    for title in soup.find_all('title'):
        if (title.previous_sibling and title.previous_sibling.name == 'table' and
            title.next_sibling and title.next_sibling.name == 'table') and get_top(title) > THRESHOLDS['top_of_page']:
            row = soup.new_tag('row')
            row.attrs = title.attrs
            prev = title.previous_sibling
            next_sibling = title.next_sibling
            row.append(extend_el(title, soup.new_tag('entry')))
            prev.append(row)
            extend_el(next_sibling, prev)

    for el in soup.find_all('table')[:]:
        format_table(soup, el)