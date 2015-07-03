from __future__ import division
from bs4 import BeautifulSoup, element
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
from collections import defaultdict, namedtuple
from lxml import etree, html
from flask import current_app
from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
from pdfminer.converter import XMLConverter, HTMLConverter
from pdfminer.converter import PDFPageAggregator, PDFConverter
from pdfminer.layout import LAParams
from pdfminer.pdfpage import PDFPage
from cStringIO import StringIO
from pdfminer.pdfparser import PDFParser
from pdfminer.pdfdocument import PDFDocument
from pdfminer.layout import LTContainer, LTPage, LTText, LTLine, LTRect, LTCurve, LTFigure, LTImage, LTChar, LTTextLine, LTTextBox, LTTextBoxVertical, LTTextGroup
from pdfminer.utils import bbox2str, enc
# source
"""https://forms.justice.govt.nz/solr/jdo/select?q=*:*&rows=500000&fl=FileNumber%2C%20Jurisdiction%2C%20MNC%2C%20Appearances%2C%20JudicialOfficer%2C%20CaseName%2C%20JudgmentDate%2C%20Location%2C%20DocumentName%2C%20id&wt=json&json.wrf=json%22%22%22"""



Match = namedtuple('Match', 'string open close')

class DocStateMachine(object):
    def __init__(self, inputs, doc):
        self.inputs = inputs
        self.positions = [0] * len(inputs)
        self.doc = doc

    def step(self, char):
        for i in xrange(len(self.inputs)):
            if self.inputs[i].string[self.positions[i]] == char:
                self.positions[i] += 1
                if len(self.inputs[i].string) == self.positions[i]:
                    self.positions[i] = 0
                    if self.inputs[i].close:
                        self.doc.close_tag(self.inputs[i].close, flush=False)
                    if self.inputs[i].open:
                        self.doc.open_tag(self.inputs[i].open, flush=False)
            else:
                self.positions[i] = 0

    def reset(self):
        for i in xrange(len(self.inputs)):
            self.positions[i] = 0


class DocState(object):

    CONTROL = re.compile(ur'[\x00-\x08\x0b-\x0c\x0e-\x1f\n]')

    has_new_line = False
    bbox = None
    prev_bbox = None
    size = None
    font = None
    body = None
    footer = None
    last_char = None

    thresholds = {
        'para': 30,
        'para_top': 710.0,
        'footer': 100,
        'footer_size': 10,
        'quote': 145,
        'quote_size': 11.0,
        'superscript': 8.0,
        'fudge': 2.0,
        'right_align_thresholds': [300, 520]
    }


    def __init__(self):
        self.state = DocStateMachine([
            Match(string='[1]', open='body,paragraph', close='intituling'),
            Match(string='REASON', open='body,paragraph', close='intituling')
            ], self)
        self.body = StringIO()
        self.footer = StringIO()
        self.buffer = StringIO()
        self.out = self.body
        self.body_stack = []
        self.foot_stack = []
        self.switch_footer()
        self.open_tag('footer')
        self.switch_body()
        self.open_tag('intituling')


    def para_threshold(self):

        def right_aligned(bbox):
            return (bbox[0] > self.thresholds['right_align_thresholds'][0] and
                bbox[2] > self.thresholds['right_align_thresholds'][1])

        if not self.prev_bbox:
            return False
        if self.bbox[1] > self.thresholds['para_top']:
            return False
        # If lines are sufficently apart vertically
        # Or lines dont overlap horizonitally
        return ((self.prev_bbox[3] - self.bbox[3]) > self.thresholds['para'] or
                self.prev_bbox[2] < self.bbox[0])

    def line_threshold(self):
        if not self.prev_bbox:
            return False

        return (self.prev_bbox[3] - self.bbox[3]) > 4


    def new_line(self, bbox):
        self.has_new_line = True
        self.prev_bbox = self.bbox
        self.bbox = bbox


    def open_tag(self, tag, flush=True, attributes=None):
        if flush:
            self.flush()
        for t in tag.split(','):
            if t not in self.tag_stack:
                self.tag_stack.append(t)
                if attributes:
                    self.out.write('<%s %s>' % (t, attributes))
                else:
                    self.out.write('<%s>' % t)


    def close_tag(self, tag, flush=True):
        if tag in self.tag_stack and flush:
            self.flush()
        while tag in self.tag_stack:
            _tag = self.tag_stack.pop()
            self.out.write('</%s>' % _tag)

    def flush(self):
        self.out.write(self.buffer.getvalue())
        self.buffer.close()
        self.buffer = StringIO()

    def handle_new_line(self):
        self.has_new_line = False

        if self.is_footer():
            self.switch_footer()
        else:
            self.switch_body()

        if self.is_footer():
            self.open_tag('footer_page')
            self.close_tag('footer_field')
            self.open_tag('footer_field')

        elif not self.is_intituling():
            if not self.is_quote() and self.para_threshold():
                self.close_tag('paragraph')

            if 'paragraph' not in self.tag_stack:
                self.open_tag('paragraph')

            elif self.last_char != ' ':
                self.write_text(' ')
        else:
            self.close_tag('intituling_field')
            self.open_tag('intituling_field',
                attributes='left="%d" top="%d" bold="%s"' % (self.bbox[0], self.bbox[1], '1' if self.is_bold(self.font) else '0'))

    def handle_style(self):
        if self.is_superscript():
            self.open_tag('superscript')
        elif 'superscript' in self.tag_stack:
            self.close_tag('superscript')
            self.buffer.write(' ')

        if self.is_quote():
            if 'quote' not in self.tag_stack:
                self.open_tag('quote')

        elif 'quote' in self.tag_stack:
            self.close_tag('quote')


    def is_superscript(self):
        return self.size < self.thresholds['superscript']

    def is_quote(self):
        return self.bbox[0] > self.thresholds['quote'] and self.size < self.thresholds['quote_size']

    def is_footer(self):
        return self.bbox and self.bbox[1] < self.thresholds['footer'] and (self.size and self.size < self.thresholds['footer_size'])

    def is_intituling(self):
        return 'intituling' in self.body_stack

    def handle_hline(self, item):
        return self.close_tag('intituling')

    def switch_footer(self):
        if self.out != self.footer:
            self.flush()
            self.out = self.footer
            self.tag_stack = self.foot_stack
            # transistion from body/footer, clear prev
            self.prev_bbox = None

    def switch_body(self):
        if self.out == self.footer:
            self.close_tag('footer_page')
        self.out = self.body
        self.tag_stack = self.body_stack

    def finalize(self):
        self.switch_body()
        for tag in self.tag_stack[::-1]:
            self.close_tag(tag)
        self.switch_footer()
        for tag in self.tag_stack[::-1]:
            self.close_tag(tag)
        return ( '<case>' + self.body.getvalue() + self.footer.getvalue() +'</case>')

    def is_bold(self, font):
        return 'bold' in font.lower()

    def write_text(self, text, item=None):
        text = self.CONTROL.sub(u'', text)
        if item and text.strip():
            if hasattr(item, 'size'):
                if self.size != item.size:
                    self.size = item.size

            if hasattr(item, 'fontname'):
                if self.font != item.fontname:
                    self.font = item.fontname

        if self.has_new_line:
            self.handle_new_line()
        self.handle_style()
        self.buffer.write(enc(text, 'utf-8'))
        self.state.step(enc(text, 'utf-8'))
        self.last_char = text
        return


class Converter(PDFConverter):

    def __init__(self, rsrcmgr, outfp, codec='utf-8', pageno=1,
             laparams=None, imagewriter=None):
        PDFConverter.__init__(self, rsrcmgr, outfp, codec=codec, pageno=pageno, laparams=laparams)
        self.imagewriter = imagewriter
        self.doc = DocState()
        return

    def receive_layout(self, ltpage):

        def get_text(item):
            if isinstance(item, LTTextBox):
                for child in item:
                    return ''.join(get_text(child))

            elif isinstance(item, LTChar):
                return item.get_text()

            elif isinstance(item, LTText):
                return item.get_text()
            return ''


        def render(item):
            if isinstance(item, LTPage):
                for child in item:
                    render(child)

            elif isinstance(item, LTLine):
                #self.doc.out.write('<line linewidth="%d" bbox="%s" />\n' %
                #                 (item.linewidth, bbox2str(item.bbox)))
                self.doc.handle_hline(item)

            elif isinstance(item, LTRect):
                self.doc.handle_hline(item)

            elif isinstance(item, LTCurve):
                self.doc.out.write('<curve linewidth="%d" bbox="%s" pts="%s"/>\n' %
                                 (item.linewidth, bbox2str(item.bbox), item.get_pts()))

            elif isinstance(item, LTFigure):
                self.doc.out.write('<figure name="%s" bbox="%s">\n' %
                                 (item.name, bbox2str(item.bbox)))
                for child in item:
                    render(child)
                self.doc.out.write('</figure>\n')

            elif isinstance(item, LTTextLine):
                # only a new if some content
                if get_text(item).strip():
                    self.doc.new_line(item.bbox)
                    for child in item:
                        render(child)

            elif isinstance(item, LTTextBox):
                for child in item:
                    render(child)

            elif isinstance(item, LTChar):
                self.doc.write_text(item.get_text(), item)

            elif isinstance(item, LTText):
                for t in item.get_text():
                    self.doc.write_text(t, item)
            elif isinstance(item, LTImage):
                if self.imagewriter is not None:
                    name = self.imagewriter.export_image(item)
                    self.doc.out.write('<image src="%s" width="%d" height="%d" />\n' %
                                     (enc(name), item.width, item.height))
                else:
                    self.doc.out.write('<image width="%d" height="%d" />\n' %
                                     (item.width, item.height))
            else:
                assert 0, item
            return
        render(ltpage)
        return

    def get_result(self):
        return self.doc.finalize()


def generate_parsable_xml(path, tmp):
    rsrcmgr = PDFResourceManager()
    retstr = StringIO()

    # Set parameters for analysis.
    laparams = LAParams(detect_vertical=True, char_margin=7)
    # Create a PDF page aggregator object.
    device = PDFPageAggregator(rsrcmgr, laparams=laparams)
    interpreter = PDFPageInterpreter(rsrcmgr, device)
    password = ''
    path = canoncialize_pdf(path, tmp)
    with open(path, 'rb') as fp:
        parser = PDFParser(fp)
        document = PDFDocument(parser)
        device = Converter(rsrcmgr, retstr, codec='utf-8' , laparams = laparams)

        interpreter = PDFPageInterpreter(rsrcmgr, device)

        for page in PDFPage.create_pages(document):
            interpreter.process_page(page)

        return re.sub(' +', ' ', device.get_result())


def canoncialize_pdf(path, tmp):
    output = os.path.join(tmp, 'out.pdf')
    cmd = """gs -sDEVICE=pdfwrite -dNOPAUSE -dBATCH -dSAFER -sOutputFile=%s '%s'"""
    p = Popen(cmd % (output, path), shell=True, stdout=PIPE, stderr=PIPE)
    out, err = p.communicate()
    return output

def reorder_intituling(soup):
    """ reorder the intituling_fields by 'top' attribute  """
    intituling = soup.find('intituling')
    fields = intituling.find_all('intituling_field')

    fields = sorted(fields, key=lambda x: float(x.attrs['top']), reverse=True)
    intituling.clear()
    for f in fields:
        intituling.append(f)
    return soup

def massage_xml(soup):

    soup = reorder_intituling(soup)

    intituling = generate_intitular(soup)

    body = generate_body(soup)

    footer = generate_footer(soup)

    case = soup.new_tag('case')
    case.append(intituling)
    case.append(body)
    case.append(footer)

    return case


def generate_body(soup):
    reg = re.compile('^\[(\d+)\]')
    body = soup.find('body')
    for paragraph in body:
        number = reg.match(paragraph.text)
        if number:
            first = paragraph.strings.next()
            first.replace_with(re.sub(reg, '', first))
            label = soup.new_tag("label")
            label.string = number.group(1)
            paragraph.insert(0, label)
            # next, wrap everything thats not quotes in text element
        else:
            paragraph.name = 'title'
            continue

        children = []
        current = soup.new_tag("text")
        for child in paragraph.contents[:]:
            if isinstance(child, element.Tag) and child.name not in ['superscript']:
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
        for child in children:
            paragraph.append(child)

    for superscript in body.find_all('superscript'):
        superscript.name = 'footnote'
        superscript.string = superscript.string.strip()

    return body


def generate_intitular(soup):
    print soup.prettify()
    intituling = soup.new_tag('intituling')

    full_citation = soup.new_tag('full-citation')
    full_citation.string = soup.find('footer_field').text
    intituling.append(full_citation)

    court = soup.new_tag('court')
    court.string = find_court(soup)
    intituling.append(court)

    court_file = soup.new_tag('court-file')
    court_file.string = find_court_file(soup)
    intituling.append(court_file)

    neutral = soup.new_tag('neutral-citation')
    neutral.string = find_neutral(soup)
    intituling.append(neutral)

    intituling.append(parties(soup))
    for c in find_counsel(soup):
        counsel = soup.new_tag('counsel')
        counsel.string = c
        intituling.append(counsel)

    bench = soup.new_tag('bench')
    bench.string = find_bench(soup)
    intituling.append(bench)

    judgment = soup.new_tag('judgment')
    judgment.string = find_judgment(soup)
    intituling.append(judgment)


    intituling.append(waistband(soup))

    solicitor = soup.new_tag('solicitor')
    solicitor.string = find_solicitor(soup)
    intituling.append(solicitor)

    return intituling


def get_left(el):
    return float(el.attrs.get('left', 0))


def get_bold(el):
    return el.attrs.get('bold')


def find_reg_el(soup, reg, field='intituling_field'):
    for e in soup.find_all(field):
        if reg.match(e.text):
            return e


def find_until(el, reg=None, use_position=True):
    results = []
    left = get_left(el)
    bold = get_bold(el)
    while el.next_sibling and not (reg and reg.match(el.next_sibling.text)) and (not use_position or get_left(el.next_sibling) == left) and get_bold(el.next_sibling) == bold:
        results.append(el.next_sibling)
        el = el.next_sibling
    return results


def find_court(soup):
    reg = re.compile(r'.*OF NEW ZEALAND( REGISTRY)?$', flags=re.IGNORECASE)
    return find_reg_el(soup, reg).text


def find_court_file(soup):
    courtfile_variants = [
        '(SC |CA )?(CA|SC|CIV|CIVP|CRI):?[-0-9/\.,(and)(to)(&) ]{2,}(-\w)?',
        'T NO\. S\d{4,}',
        '(S|T)\d{4,}',
        'B \d+IM\d+',
        '\d{2,}\/\d{2,}',
        '\d{4}-\d{3}-\d{6}',
        'AP \d{2}\/\d{4}']

    courtfile_num = re.compile('^((%s)( & )?)+$' % '|'.join(courtfile_variants), flags=re.IGNORECASE)
    return find_reg_el(soup, courtfile_num).text


def find_neutral(soup):
    reg = re.compile(r'\[(\d){4}\] NZ(HC|CA|SC) (\d+)$')
    return find_reg_el(soup, reg).text


def find_bench(soup):
    reg = re.compile(r'court:', flags=re.IGNORECASE)
    start = find_reg_el(soup, reg)
    results = [start] + find_until(start, re.compile('\w+:'))
    return re.sub(reg, '', ' '.join(map(lambda x: x.text, results)))


def find_judgment(soup):
    reg = re.compile(r'judgment:', flags=re.IGNORECASE)
    start = find_reg_el(soup, reg)
    return re.sub(reg, '', start.text)


def find_counsel(soup):
    reg = re.compile(r'counsel:', flags=re.IGNORECASE)
    start = find_reg_el(soup, reg)
    results = [start]+ find_until(start, re.compile('\w+:'), use_position=False)
    return map(lambda x: re.sub(reg, '',  x.text), results)


def find_solicitor(soup):
    reg = re.compile(r'solicitors?:', flags=re.IGNORECASE)
    start = find_reg_el(soup, reg, field="footer_field")
    results = find_until(start, None, use_position=False)
    return results[0].text


def waistband(soup):
    waistband_dict = find_waistband(soup)
    waistband = soup.new_tag('waistband')
    title = soup.new_tag('title')
    title.string = waistband_dict['title']
    waistband.append(title)
    waistband_list = soup.new_tag('list')
    waistband.append(waistband_list)

    for e in waistband_dict['list']:
        entry = soup.new_tag('entry')
        label = soup.new_tag('label')
        label.string = e['label']
        text = soup.new_tag('text')
        text.string= e['text']
        entry.append(label)
        entry.append(text)
        waistband_list.append(entry)

    return waistband


def find_waistband(soup):
    reg = re.compile(r'JUDGMENT OF THE COURT', flags=re.IGNORECASE)
    start = find_reg_el(soup, reg)
    parts = [start]+ find_until(start, None, use_position=False)
    parts = filter(None, map(lambda x: x.text, parts))
    entries = []
    entry = {}
    # for now assume alphabetical list
    char = 'A'
    line = ''
    for p in parts[1:]:
        if p.startswith('%s ' % char):
            entry = {'label': char, 'text':  p[2:]}
            entries.append(entry)
            char = chr(ord(char) + 1)
        else:
           entry['text'] += ' ' + p
    if line:
        entries.append({'label': char, 'text': line})
    result = {'title': parts[0], 'list': entries}

    return result


def parties(soup):
    parties = soup.new_tag('parties')
    plantiffs = soup.new_tag('plantiffs')
    defendants = soup.new_tag('defendants')
    parties.append(plantiffs)
    parties.append(defendants)

    def party(row, name):
        el = soup.new_tag(name)
        descriptor = soup.new_tag('descriptor')
        descriptor.string = p['descriptor']
        qualifier = soup.new_tag('qualifier')
        qualifier.string = p['qualifier']
        value = soup.new_tag('value')
        value.string = p['value']
        el.append(qualifier)
        el.append(value)
        el.append(descriptor)
        return el

    party_dict = find_parties(soup)

    for p in party_dict['plantiffs']:
        plantiffs.append(party(p, 'plantiff'))

    for p in party_dict['defendants']:
        defendants.append(party(p, 'defendant'))

    return parties


def find_parties(soup):
    parties = {'plantiffs': [], 'defendants': []}
    reg = re.compile(r'BETWEEN', flags=re.IGNORECASE)
    between = find_reg_el(soup, reg)
    plantiffs = between.next_sibling
    plantiffs = [plantiffs] + find_until(plantiffs)
    #for plantiff in plantiffs:
    parties['plantiffs'].append({
        'qualifier': between.text,
        'value': ' '.join(map(lambda x: x.text, plantiffs[:-1])),
        'descriptor': plantiffs[-1].text
        })
    defendant_descriptor = plantiffs[-1].next_sibling
    defendants = defendant_descriptor.next_sibling
    defendants = [defendants] + find_until(defendants)
    #for defendant in defendants:
    parties['defendants'].append({
        'qualifier': defendant_descriptor.text,
        'value': ' '.join(map(lambda x: x.text, defendants[:-1])),
        'descriptor': defendants[-1].text
        })
    return parties


def generate_footer(soup):
    footer = soup.new_tag('footer')
    for f in soup.find_all('footer_field')[1:]:
        if not soup.find('superscript'):
            continue
        footnote = soup.new_tag('footnote-text')
        for child in f.contents[:]:
            if child.name == 'superscript':
                child.name = 'key'
                footnote.append(child)
            else:
                text = soup.new_tag('text')
                text.append(child.strip())
                footnote.append(text)
        footer.append(footnote)
    return footer


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
    xml = generate_parsable_xml(filename, tmp)
    soup = BeautifulSoup(xml, "xml")
    results = massage_xml(soup)
    shutil.rmtree(tmp)
    print results.prettify()
    return unicode(results)
