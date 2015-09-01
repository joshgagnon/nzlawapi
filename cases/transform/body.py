# -*- coding: utf-8 -*-
import re
from common import get_left, separator_reg
from bs4 import element, NavigableString
from tables import format_tables


def generate_body(soup):
    number_reg = re.compile('^\[(\d+)\]')

    brackets_reg = re.compile('^\W*\(.*\)\W*$')

    body = soup.find('body')

    def remove_empty_nodes(soup):
        # Remove empty nodes
        for el in soup.find_all(['emphasis', 'strong', 'paragraph', 'title']):
            if not len(el.contents):
                el.decompose()

    format_indents(soup)

    for paragraph in body.contents[:]:
        number = number_reg.match(paragraph.text)
        if paragraph.name in ['table']:
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
        # In capitals?  probably  a title
        elif paragraph.text and (paragraph.text.upper() == paragraph.text or \
            len(paragraph.contents) == 1 and paragraph.contents[0].name == 'strong') or \
            paragraph.attrs.get('bold') == '1':
            paragraph.name = 'title'
            if len(paragraph.contents) and not isinstance(paragraph.contents[0], NavigableString):
                paragraph.contents[0].unwrap()
            if paragraph.is_empty_element:
                paragraph.decompose()
        elif paragraph.text and brackets_reg.match(paragraph.text) and paragraph.attrs['center'] == '1':
            paragraph.name = 'subtitle'
        elif len(paragraph.contents) == 1 and paragraph.contents[0].name == 'emphasis':
            paragraph.name = 'subtitle'
            paragraph.contents[0].unwrap()
        elif paragraph.previous_sibling and paragraph.previous_sibling.name == 'signature-line':
            paragraph.name = 'signature-name'
        else:
            # we must stitch this paragraph to the previous one
            paragraph.previous_sibling.append(' ')
            for child in paragraph.contents[:]:
                paragraph.previous_sibling.append(child)



    format_tables(soup)

    for paragraph in body.find_all('paragraph', recursive=False):
        # next, wrap everything thats not quotes or emphasis in text element
        children = []
        current = soup.new_tag("text")
        for child in paragraph.contents[:]:
            if isinstance(child, element.Tag) and child.name not in ['superscript', 'emphasis']:
                if len(current.contents):
                    children.append(current)
                    current = soup.new_tag("text")
                children.append(child)
            else:
                if isinstance(child, element.NavigableString):
                    child.string = child.string.strip()
                current.append(child)
        if len(current.contents):
            children.append(current)
        paragraph.clear()
        paragraph.attrs = {}
        for child in children:
            paragraph.append(child)



    for superscript in body.find_all('superscript'):
        if not len(superscript.contents):
            superscript.decompose()
            continue
        superscript.name = 'footnote'
        superscript.string = superscript.string.strip()


    for content in body.contents:
        content.attrs = {}

    remove_empty_nodes(body)

    return body





def format_indents(soup):
    """ Needs clean up """
    for indent in soup.find_all('indent'):
        if not len(indent.contents):
            indent.decompose()

    listlike_reg = re.compile(u'^\s*\(?([a-z\d+•\*])\)?\s+(.*)', flags=re.IGNORECASE)

    prev_left = None
    for indent in soup.find_all('indent'):
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
    soup.find('footer-page').decompose()
    for f in soup.find_all('footer-field'):
        if not soup.find('superscript'):
            continue
        footnote = soup.new_tag('footnote-text')
        for child in f.contents[:]:
            if child.name == 'superscript':
                child.name = 'key'
                footnote.append(child)
                text = soup.new_tag('text')
                footnote.append(text)
            else:
                text.append(child)
        footer.append(footnote)
    for f in footer.find_all('footnote-text'):
        if not len(f.contents):
            f.decompose()
    if footer.findChildren():
        return footer
    return None
