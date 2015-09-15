# -*- coding: utf-8 -*-
import re
from common import get_left, separator_reg, is_center, is_right_aligned
from bs4 import element, NavigableString, Tag
from tables import format_tables


def is_title(paragraph):
    #In capitals?  or bold? probably  a title
    return paragraph.text and (paragraph.text.upper() == paragraph.text or \
            len(paragraph.contents) == 1 and paragraph.contents[0].name == 'strong') or \
            paragraph.attrs.get('bold') == '1'


def convert_to_title(paragraph):
    paragraph.name = 'title'
    if len(paragraph.contents) and not isinstance(paragraph.contents[0], NavigableString):
        paragraph.contents[0].unwrap()
    if paragraph.is_empty_element:
        paragraph.decompose()


""" Currently can't think of a way of guaranteeing first title is in body without
    some sort of look forward technique, which means we can't do it in the first pass.
    But I would like to move this logic to pdfs.py  """
def tweak_intituling_interface(soup):
    body = soup.find('body')
    if not body:
        return soup
    first_para = body.find('paragraph')
    if not first_para.text or re.compile('^\s*\[1\]').match(first_para.text):
        last_line = soup.find('intituling').find_all('intituling-field')[-1]
        if last_line.find('strong') and not is_center(last_line) and not last_line.find('hline'):
            soup.find('body').insert(0, last_line)
            last_line.name = 'paragraph'
    return soup


def is_signature(paragraph):
    return (paragraph.previous_sibling and paragraph.previous_sibling.name == 'signature-line' or
        (not paragraph.next_sibling and is_right_aligned(paragraph)))



def generate_body(soup):
    number_reg = re.compile('^\[(\d+)\]')

    brackets_reg = re.compile('^\W*\(.*\)\W*$')

    body = soup.find('body')
    if not body:
        return None

    format_indents(soup)

    for paragraph in body.contents[:]:
        number = number_reg.match(paragraph.text)
        if paragraph.name in ['table', 'image']:
            pass
        # If a number, then a new paragraph
        elif number:
            first = paragraph.strings.next()
            first.replace_with(re.sub(number_reg, '', first))
            label = soup.new_tag("label")
            label.string = number.group(1)
            paragraph.insert(0, label)
        elif separator_reg.match(paragraph.text):
            paragraph.clear()
            paragraph.name = 'signature-line'
        elif is_signature(paragraph):
            paragraph.name = 'signature-name'
        elif paragraph.text.startswith('This page has been deliberately left blank'):
            paragraph.decompose()
        elif is_title(paragraph):
            convert_to_title(paragraph)
        elif paragraph.text and brackets_reg.match(paragraph.text) and is_center(paragraph):
            paragraph.name = 'subtitle'
        elif len(paragraph.contents) == 1 and paragraph.contents[0].name == 'emphasis':
            paragraph.name = 'subtitle'
            paragraph.contents[0].unwrap()
        else:
            # we must stitch this paragraph to the previous one
            paragraph.previous_sibling.append(' ')
            for child in paragraph.contents[:]:
                paragraph.previous_sibling.append(child)

    format_tables(soup)

    for paragraph in list(body.find_all('paragraph', recursive=False)):
        # next, wrap everything thats not quotes or emphasis in text element
        children = []
        current = soup.new_tag("text")
        for child in paragraph.contents[:]:
            if isinstance(child, element.Tag) and child.name not in ['superscript', 'emphasis']:
                if len(current.contents):
                    children.append(current)
                    current = soup.new_tag("text")
                children.append(child.extract())
            else:
                if isinstance(child, NavigableString):
                    child.string = child.string.strip()
                current.append(child)
        if len(current.contents):
            children.append(current.extract())
        # avoids a bug in bs4
        #paragraph.clear()
        paragraph.attrs = {}
        for child in children:
            paragraph.append(child)

   #body = BeautifulSoup(body.encode(), 'lxml-xml')

    for superscript in list(body.find_all('superscript')):
        if not len(superscript.contents):
            superscript.decompose()
            continue
        superscript.name = 'footnote'
        if isinstance(superscript.contents[-1], NavigableString):
            superscript.contents[-1].replace_with(superscript.contents[-1].strip())


    for content in body.contents:
        if content.name not in ['image']:
            content.attrs = {}

    return body



def format_indents(soup):
    """ Needs clean up """
    for indent in soup.find_all('indent'):
        if not len(indent.contents):
            indent.decompose()

    listlike_reg = re.compile(u'^\s*\(?([a-z\d+•\*]|[ivx]{1,4})\)?\s+(.*)', flags=re.IGNORECASE)

    prev_left = None
    for indent in soup.find_all('indent'):
        match = None
        if indent.find('sml-image'):
            indent.find('sml-image').extract()
            indent.insert(0, NavigableString(u'• '))

        if isinstance(indent.contents[0], NavigableString):
            match = listlike_reg.match(indent.contents[0])

        left = get_left(indent)
        if not match or (prev_left and left > prev_left):
            if indent.previous_sibling and indent.previous_sibling and indent.previous_sibling.name == 'list':
                text = indent.previous_sibling.find_all('text')[-1]
                text.append(' ')
                for c in indent.contents[:]:
                    text.append(c)
                indent.decompose()
                continue

        indent.name = 'entry'
        if match:
            text = soup.new_tag('text')
            text.string = match.group(2)

            indent.contents[0].replace_with('')

            for c in indent.contents[:]:
                text.append(c)
            insert = 0
            if match.group(1) != u'•':
                label = soup.new_tag('label')
                label.string = match.group(1)
                indent.insert(insert, label)
                insert += 1
            indent.insert(insert, text)
        else:
            text = soup.new_tag('text')
            #indent.contents[0].replace_with('')
            for c in indent.contents[:]:
                text.append(c)
            indent.insert(0, text)

        if not (indent.previous_sibling and indent.previous_sibling.name == 'list'):
            new_list = soup.new_tag('list')
            entry = indent.replace_with(new_list)
            new_list.append(entry)
        else:
            indent.previous_sibling.append(indent)
        indent.attrs = {}
        prev_left = left



def generate_footer(soup):
    footer = soup.new_tag('footer')
    text = None
    # remove firstpage

    for f in soup.find_all('footer-field'):
        if not f.parent.find('superscript'):
            continue
        footnote = soup.new_tag('footnote-text')
        for child in f.contents[:]:
            if child.name == 'superscript':
                child.name = 'key'
                footnote.append(child)
                text = soup.new_tag('text')
                footnote.append(text)
            elif text:
                text.append(child)

        footer.append(footnote)
    for f in footer.find_all('footnote-text'):
        if not len(f.contents):
            f.decompose()
    if footer.findChildren():
        return footer
    return None
