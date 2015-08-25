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
from pdfminer.layout import LTContainer, LTPage, LTText, LTLine, LTRect, LTCurve, LTFigure, LTImage, \
    LTChar, LTTextLine, LTTextBox, LTTextBoxVertical, LTTextGroup, LTTextGroupLRTB, LTTextLineHorizontal, LTComponent
from pdfminer.utils import bbox2str, enc, apply_matrix_pt
from pdfminer.pdffont import PDFCIDFont
# source
"""https://forms.justice.govt.nz/solr/jdo/select?q=*:*&rows=500000&fl=FileNumber%2C%20Jurisdiction%2C%20MNC%2C%20Appearances%2C%20JudicialOfficer%2C%20CaseName%2C%20JudgmentDate%2C%20Location%2C%20DocumentName%2C%20id&wt=json&json.wrf=json%22%22%22"""


""" force horizontal lines """
def find_neighbors (self, plane, ratio):
    objs = plane.find((self.x0-1000, self.y0+2, self.x1+1000, self.y1-2))
    objs = [obj for obj in objs
                if (isinstance(obj, LTTextLineHorizontal))]
    return objs

LTTextLineHorizontal.find_neighbors = find_neighbors

def init_char(self, matrix, font, fontsize, scaling, rise,
                 text, textwidth, textdisp):
        LTText.__init__(self)
        self._text = text
        self.matrix = matrix
        self.fontsize = fontsize
        self.font = font
        self.fontname = font.fontname
        self.adv = textwidth * fontsize * scaling
        # compute the boundary rectangle.
        if font.is_vertical():
            # vertical
            width = font.get_width() * fontsize
            (vx, vy) = textdisp
            if vx is None:
                vx = width * 0.5
            else:
                vx = vx * fontsize * .001
            vy = (1000 - vy) * fontsize * .001
            tx = -vx
            ty = vy + rise
            bll = (tx, ty+self.adv)
            bur = (tx+width, ty)
        else:
            # horizontal
            height = font.get_height() * fontsize
            descent = font.get_descent() * fontsize
            ty = descent + rise
            bll = (0, ty)
            bur = (self.adv, ty+height)
        (a, b, c, d, e, f) = self.matrix
        self.upright = (0 < a*d*scaling and b*c <= 0)
        (x0, y0) = apply_matrix_pt(self.matrix, bll)
        (x1, y1) = apply_matrix_pt(self.matrix, bur)
        if x1 < x0:
            (x0, x1) = (x1, x0)
        if y1 < y0:
            (y0, y1) = (y1, y0)
        LTComponent.__init__(self, (x0, y0, x1, y1))
        if font.is_vertical():
            self.size = self.width
        else:
            self.size = self.height
        return

LTChar.__init__ = init_char


def encodeXMLText(text):
    text = text.replace("&", "&amp;")
    text = text.replace("\"", "&quot;")
    text = text.replace("'", "&apos;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    return text

Match = namedtuple('Match', 'string open close tests')


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
                    if all([getattr(self.doc, t)() for t in self.inputs[i].tests]):
                        if self.inputs[i].close:
                            self.doc.close_tag(self.inputs[i].close, flush=False)
                        if self.inputs[i].open:
                            self.doc.open_tag(self.inputs[i].open, flush=False)
            else:
                self.positions[i] = 0

    def reset(self):
        for i in xrange(len(self.inputs)):
            self.positions[i] = 0


def dist(r1, r2):
    x, y = sorted((r1, r2))
    if x[0] <= x[1] < y[0] and all(y[0] <= y[1] for y in (r1, r2)):
        return y[0] - x[1]
    return 0


RULES = [
    Match(string='[1]', open='body,paragraph', close='intituling,table', tests=['is_left_aligned', 'is_intituling']),
    Match(string='REASON', open='body,paragraph', close='intituling', tests=['is_bold', 'is_intituling']),
    Match(string='Para No', open='table', close='paragraph', tests=['is_bold', 'is_right_aligned']),
    Match(string='Table of Contents', open='table', close='paragraph', tests=['is_bold', 'is_center_aligned']),
]


class DocState(object):
    """ The pdfminer gives us the first stage of grouping, but I have
        keep it agnostic as to case pdf layout.  This class, on the other hand,
        will have an opinion about expected layouts, and will separate intituling,
        paragraphs, footers and tables. """

    CONTROL = re.compile(ur'[\x00-\x08\x0b-\x0c\x0e-\x1f\n]')

    calibrated = False
    has_new_line = False
    has_new_chunk = False
    bbox = None
    prev_bbox = None
    line_bbox = None
    prev_line_bbox = None
    size = None
    font = None
    body = None
    footer = None
    last_char = None
    max_width = [None, None]

    # train these numbers
    thresholds = {
        'paragraph_vertical_threshold': 15,
        'quote_vertical_threshold': 12,
        'table_vertical_threshold': 20,
        'footer': 100,
        'footer_size': 10,
        'quote': 140,
        'quote_size': 12.0,
        'superscript': 10.0,
        'superscript_offset': 2.2,
        'line_tolerance': 4.0,
        'column_gap': 100,
        'indent_threshold': 10.0,
        'right_align_thresholds': [280, 480],
        'left_align_thresholds': [160],
        'center_align_thresholds': [250, 400]
    }

    def __init__(self):
        self.state = DocStateMachine(RULES, self)
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
        self.font = None
        self.unknown_font = False

    def para_threshold(self, threshold_key='paragraph_vertical_threshold'):
        (prev_bbox, bbox) = (self.prev_line_bbox, self.line_bbox)
        # if not first bbox
        if not self.prev_bbox:
            return False

        # vertical distance so great it is likely a new paragraph
        if dist((prev_bbox[1], prev_bbox[3]), (bbox[1], bbox[3])) > self.thresholds[threshold_key]:
            return True

        # has started a new line horizontal before the previous, probably a column in table
        if bbox[2] < prev_bbox[0]:
            return True
        if self.is_center_aligned(prev_bbox):
            return True
        if self.is_right_aligned():
            return True

    def footer_threshold(self):
        return self.line_bbox[0] < (self.max_width[0] + self.thresholds['indent_threshold'])

    def column_join_threshold(self):
        if (self.prev_bbox and
            abs(self.prev_bbox[1] - self.bbox[3]) > self.thresholds['line_tolerance'] and
                self.bbox[0] - self.prev_bbox[2] > self.thresholds['column_gap']):
            # emit join
            return True

    def line_threshold(self, value=None):
        if not self.prev_bbox:
            return False
        return abs(self.prev_bbox[3] - value if value is not None else self.bbox[3]) > self.thresholds['line_tolerance']

    def new_chunk(self, bbox):
        self.has_new_chunk = True
        self.prev_bbox = self.bbox
        self.bbox = bbox

    def new_line(self, bbox):
        self.has_new_line = True
        self.prev_line_bbox = self.line_bbox
        self.line_bbox = bbox


    def open_tag(self, tag, flush=True, attributes=None):
        if flush:
            self.flush()
        for t in tag.split(','):
            if t not in self.tag_stack:
                self.tag_stack.append(t)
                if t in ['paragraph', 'intituling-field', 'entry'] and self.bbox:
                    attributes = ('left="%d" top="%d" right="%d" bottom="%d" italic="%s" bold="%s" center="%s" unkown-font="%s"' %
                          (self.bbox[0], self.bbox[1], self.bbox[2], self.bbox[3],
                            '1' if self.is_italic(self.font) else '0',
                            '1' if self.is_bold(self.font) else '0',
                            '1' if self.is_center_aligned() else '0',
                            '1' if self.unknown_font else '0'
                            ))
                    self.out.write('<%s %s>' % (t, attributes))
                else:
                     self.out.write('<%s>' % t)

    def close_tag(self, tag, flush=True):
        for t in tag.split(','):
            if t in self.tag_stack and flush:
                self.flush()
            while t in self.tag_stack:
                _tag = self.tag_stack.pop()
                self.out.write('</%s>' % _tag)

    def flush(self):
        self.out.write(self.buffer.getvalue())
        self.buffer.close()
        self.buffer = StringIO()

    def handle_hline(self, item):
        pass

    def handle_new_chunk(self):
        self.has_new_chunk = False

        if self.is_footer():

            if self.footer_threshold() or self.is_intituling():
                self.close_tag('footer-field')
            self.open_tag('footer-field')

        elif self.is_intituling():
            # we will keep everyline in the intituling separate
            self.close_tag('intituling-field')
            self.open_tag('intituling-field')

        elif self.is_table():
            self.close_tag('entry')
            self.open_tag('entry')

    def handle_new_line(self):
        self.has_new_line = False
        handle_space = False
        if not self.max_width[0] or self.bbox[0] < self.max_width[0]:
            self.max_width[0] = self.bbox[0]
        if not self.max_width[1] or self.bbox[2] > self.max_width[1]:
            self.max_width[1] = self.bbox[2]

        if self.is_footer():
            self.switch_footer()
            self.open_tag('footer-page')
        else:
            self.switch_body()

        if self.is_intituling():
            pass
        elif self.is_footer():
            pass

        elif self.is_table():
            self.close_tag('row')
            self.open_tag('row')

            if self.is_header(self.line_bbox):
                self.close_tag('table')
                self.open_tag('paragraph')

        elif self.is_quote():
            if 'quote' not in self.tag_stack:
                self.open_tag('quote')
            if self.para_threshold('quote_vertical_threshold'):
                self.close_tag('quote-paragraph')
            if 'quote-paragraph' not in self.tag_stack:
                self.open_tag('quote-paragraph')
            else:
                handle_space = True

        elif self.is_left_indented():
            if 'indent' in self.tag_stack and self.para_threshold():
                self.close_tag('indent')
            if 'indent' not in self.tag_stack:
                self.open_tag('indent')
            else:
                handle_space = True
        else: # if standard paragraph
            if 'quote' in self.tag_stack:
                self.close_tag('quote')

            if 'indent' in self.tag_stack:
                self.close_tag('indent')

            if self.para_threshold() or self.is_center_aligned(self.line_bbox):
                self.close_tag('paragraph')

            if 'paragraph' not in self.tag_stack:
                self.open_tag('paragraph')
            else:
                handle_space = True
        if handle_space and self.last_char != ' ':
            # we have to add a space between line, if not one already
            self.write_text(' ')

    def handle_style(self):
        if self.is_superscript():
            self.open_tag('superscript')

        elif 'superscript' in self.tag_stack:
            self.close_tag('superscript')
            self.buffer.write(' ')

        if self.is_italic(self.font):
            self.open_tag('emphasis')

        elif 'emphasis' in self.tag_stack:
            self.close_tag('emphasis')

        if not self.calibrated and self.size:
            self.thresholds['footer_size'] = self.size - 2
            #self.thresholds['superscript_size'] = self.size - 4
            self.calibrated = True

    def is_superscript(self):

        return self.size < self.thresholds['superscript']  and self.char_bbox[1] > (self.line_bbox[1] + self.thresholds['superscript_offset'])

    def is_quote(self):
        return self.bbox[0] > self.thresholds['quote'] and self.size < self.thresholds['quote_size']

    def is_footer(self):
        return (self.calibrated and
            (self.size and self.size < self.thresholds['footer_size']))

    def is_body(self):
        return not self.is_footer() and not self.is_intituling()

    def register_font(self, item):

        if hasattr(item, 'fontsize'):
            if self.size != item.fontsize:
                self.size = item.fontsize

        if hasattr(item, 'fontname'):
            if self.font != item.fontname:
                self.font = item.fontname

            self.unknown_font = isinstance(item.font, PDFCIDFont)
        self.char_bbox = item.bbox


    def is_bold(self, font=None):
        font = font or self.font
        return font and 'bold' in font.lower()

    def is_italic(self, font):
        return font and 'italic' in font.lower()

    def is_intituling(self):
        return 'intituling' in self.body_stack

    def is_table(self):
        return 'table' in self.body_stack

    def is_right_aligned(self, bbox=None):
        bbox = bbox or self.bbox
        return (bbox[0] > self.thresholds['right_align_thresholds'][0])

    def is_left_aligned(self, bbox=None):
        bbox = bbox or self.bbox
        return (bbox[0] < self.thresholds['left_align_thresholds'][0])

    def is_center_aligned(self, bbox=None):
        bbox = bbox or self.bbox
        return (bbox[0] > self.thresholds['center_align_thresholds'][0] and
                bbox[2] < self.thresholds['center_align_thresholds'][1])

    def is_left_indented(self, bbox=None):
        bbox = bbox or self.line_bbox
        return bbox[0] > (self.max_width[0] + self.thresholds['indent_threshold']) and not self.is_center_aligned(bbox) and not self.is_right_aligned()

    def is_header(self, bbox=None):
        bbox = bbox or self.bbox
        if self.is_center_aligned(bbox) and self.is_bold():
            return True
        if self.is_left_aligned(bbox) and bbox[2] < self.thresholds['center_align_thresholds'][1] and self.is_bold():
            return True

    def switch_footer(self):
        if self.out != self.footer:
            self.flush()
            self.out = self.footer
            self.tag_stack = self.foot_stack
            # transistion from body/footer, clear prev
            self.prev_bbox = None

    def switch_body(self):
        if self.out == self.footer:
            self.close_tag('footer-page')
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

    def write_text(self, text, item=None):

        text = self.CONTROL.sub(u'', text)
        text = encodeXMLText(text)
        if item and text.strip():
            self.register_font(item)
        if self.has_new_line:
            self.handle_new_line()
        if self.has_new_chunk:
            self.handle_new_chunk()
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
        self.laparams = laparams
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
            def sort_x(a, b):
                return int(a.x0 - b.x0)

            if isinstance(item, LTPage):
                for child in item:
                    render(child)

            elif isinstance(item, LTLine):
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
                    self.doc.new_chunk(item.bbox)
                    #print item
                    for child in item:
                        render(child)

            elif isinstance(item, LTTextBox):
                # major change: sort boxes by x
                item._objs = sorted(item._objs, cmp=sort_x)
                self.doc.new_line(item.bbox)
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
    laparams = LAParams(detect_vertical=False, char_margin=6, line_margin=0.01)#,line_margin=2)
    # Create a PDF page aggregator object.
    device = PDFPageAggregator(rsrcmgr, laparams=laparams)
    interpreter = PDFPageInterpreter(rsrcmgr, device)
    password = ''
    path = canoncialize_pdf(path, tmp)
    # print path
    with open(path, 'rb') as fp:
        parser = PDFParser(fp)
        document = PDFDocument(parser)
        device = Converter(rsrcmgr, retstr, codec='utf-8', laparams=laparams)

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
    """ reorder the intituling-fields by 'top' attribute  """
    intituling = soup.find('intituling')
    fields = intituling.find_all('intituling-field')

    fields = sorted(fields, key=lambda x: float(x.attrs['top']), reverse=True)
    intituling.clear()
    for f in fields:
        intituling.append(f)
    return soup


def massage_xml(soup, debug):
    if debug:
        print soup.prettify()
    intituling = generate_intitular(soup)
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


def generate_body(soup):
    number_reg = re.compile('^\[(\d+)\]')
    separator_reg = re.compile('^__{3,}')
    brackets_reg = re.compile('^\W*\(.*\)\W*$')

    body = soup.find('body')

    format_indents(soup)

    for paragraph in body.contents[:]:
        number = number_reg.match(paragraph.text)
        if paragraph.name == 'table':
            format_table(soup, paragraph)
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
        elif paragraph.text and (paragraph.text.upper() == paragraph.text or paragraph.attrs['bold'] == '1'):
            paragraph.name = 'title'
        elif paragraph.text and brackets_reg.match(paragraph.text) and paragraph.attrs['center'] == '1':
            paragraph.name = 'subtitle'
        elif paragraph.previous_sibling and paragraph.previous_sibling.name == 'signature-line':
            paragraph.name = 'signature-name'
        else:
            # we must stitch this paragraph to the previous one
            if paragraph.previous_sibling.contents[-1].string and not paragraph.previous_sibling.contents[-1].string.endswith(' '):
                paragraph.previous_sibling.append(' ')
            for child in paragraph.contents[:]:
                paragraph.previous_sibling.append(child)
            paragraph.decompose()
        if paragraph.attrs:
            for k in paragraph.attrs.keys():
                del paragraph[k]

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
        for child in children:
            paragraph.append(child)

    for superscript in body.find_all('superscript'):
        if not len(superscript.contents):
            superscript.decompose()
            continue
        superscript.name = 'footnote'
        superscript.string = superscript.string.strip()

    return body


def format_table(soup, el):
    contents_reg = re.compile('^\W*(Para No|Table of Contents)\W*$')
    matches = el.find_all(text=contents_reg)
    if matches:
        el.wrap(soup.new_tag('contents'))
        for m in matches:
            m.extract()
    # remove empty entry'
    while el.find('emphasis'):
        entry = el.find('emphasis')
        entry.find_parents('row')[0].decompose()

    while el.find('entry', {'unkown-font': '1'}):
        entry = el.find('entry', {'unkown-font': '1'})
        entry.find_parents('row')[0].decompose()

    for entry in el.find_all('entry'):
        entry.attrs = {}
        if entry.is_empty_element:
            entry.decompose()
    for entry in el.find_all('row'):
        if entry.is_empty_element:
            entry.decompose()



def format_indents(soup):
    for indent in soup.find_all('indent'):
        if not len(indent.contents):
            indent.decompose()

    listlike_reg = re.compile('^\ *\(?([a-z\d+])\)?\ +(.*)', flags=re.IGNORECASE)


    for indent in soup.find_all('indent'):
        match = listlike_reg.match(indent.contents[0])
        if not match:
            continue
        indent.name = 'entry'
        label = soup.new_tag('label')
        label.string = match.group(1)
        text = soup.new_tag('text')
        text.string = match.group(2)
        indent.contents[0].replace_with('')
        for c in indent.contents[:]:
            text.append(c)
        indent.insert(0, label)
        indent.insert(1, text)

        if not (indent.previous_sibling and indent.previous_sibling.name == 'list'):
            new_list = soup.new_tag('list')
            entry = indent.replace_with(new_list)
            new_list.append(entry)
        else:
            indent.previous_sibling.append(indent)







def generate_intitular(soup):
    #print soup.prettify()
    intituling = soup.new_tag('intituling')

    full_citation = soup.new_tag('full-citation')
    full_citation.string = find_full_citation(soup)
    intituling.append(full_citation)

    court = soup.new_tag('court')
    court.string = find_court(soup)
    intituling.append(court)

    court_file = soup.new_tag('court-file')
    court_file.string = find_court_file(soup)

    registry_string = find_registry(soup)
    if registry_string:
        registry = soup.new_tag('registry')
        registry.string = registry_string
        intituling.append(registry)

    intituling.append(court_file)

    neutral_string = find_neutral(soup)
    if neutral_string:
        neutral = soup.new_tag('neutral-citation')
        neutral.string = neutral_string
        intituling.append(neutral)

    intituling.append(parties(soup))

    hearing_string = find_hearing(soup)
    if hearing_string:
        hearing = soup.new_tag('hearing')
        hearing.string = hearing_string
        intituling.append(hearing)

    for c in find_counsel(soup):
        counsel = soup.new_tag('counsel')
        counsel.string = c
        intituling.append(counsel)

    bench_string = find_bench(soup)
    if bench_string:
        bench = soup.new_tag('bench')
        bench.string = bench_string
        intituling.append(bench)

    judgment = soup.new_tag('judgment')
    judgment.string = find_judgment(soup)
    intituling.append(judgment)

    intituling.append(waistband(soup))

    for solicitor in solicitors(soup):
        intituling.append(solicitor)

    return intituling


def full_citation_lines(soup):
    fields = soup.find('footer-page').find_all('footer-field')
    strings = map(lambda x: x.text, fields)
    # find first line that has capitals up until the first number, doesn't contain solicitors
    capitals = re.compile('^[A-Z ]{2,}[0-9]*')
    solicitors = re.compile(r'^solicitors?:?', flags=re.IGNORECASE)
    for i, s in enumerate(strings):
        if not solicitors.match(s) and capitals.match(s):
            break
    return strings[i:]


def find_full_citation(soup):
    strings = full_citation_lines(soup)
    return ' '.join(strings)


def get_left(el):
    return float(el.attrs.get('left', 0))


def get_bold(el):
    return el.attrs.get('bold')


def find_reg_el(soup, reg, field='intituling-field'):
    for e in soup.find_all(field):
        if reg.match(e.text):
            return e


def find_until(el, reg=None, use_position=True, forward=True):
    results = []
    left = get_left(el)
    bold = get_bold(el)

    def direction(el):
        if forward:
            return el.next_sibling
        return el.previous_sibling

    while direction(el) and not (reg and reg.match(direction(el).text)) and (
        not use_position or get_left(direction(el)) == left) and get_bold(direction(el)) == bold:
        results.append(direction(el))
        el = direction(el)
    return results


def find_court(soup):
    reg = re.compile(r'.*OF NEW ZEALAND( REGISTRY)?\W*$', flags=re.IGNORECASE)
    return find_reg_el(soup, reg).text


def find_registry(soup):
    court_reg = re.compile(r'.*OF NEW ZEALAND( REGISTRY)?\W*$', flags=re.IGNORECASE)
    start = find_reg_el(soup, court_reg)
    registry = find_until(start, None, use_position=True)
    if registry:
        return registry[-1].text


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
    reg = re.compile(r'\W*\[(\d){4}\] NZ(HC|CA|SC) (\d+)\W*$')
    try:
        return find_reg_el(soup, reg).text.strip()
    except AttributeError:
        return None

def find_bench(soup):
    reg = re.compile(r'court:', flags=re.IGNORECASE)
    start = find_reg_el(soup, reg)
    if start:
        results = [start] + find_until(start, re.compile('\w+:'))
        return re.sub(reg, '', ' '.join(map(lambda x: x.text, results)))
    else:
        return None


def find_hearing(soup):
    reg = re.compile(r'hearing:', flags=re.IGNORECASE)
    start = find_reg_el(soup, reg)
    if start:
        results = [start] + find_until(start, re.compile('\w+:'))
        return re.sub(reg, '', ' '.join(map(lambda x: x.text, results)))
    else:
        return None

def find_judgment(soup):
    reg = re.compile(r'judgment:', flags=re.IGNORECASE)
    start = find_reg_el(soup, reg)
    return re.sub(reg, '', start.text)


def find_counsel(soup):
    reg = re.compile(r'(counsel:|appearances:)', flags=re.IGNORECASE)
    start = find_reg_el(soup, reg)
    results = [start]+ find_until(start, re.compile('\w+:'), use_position=False)
    return map(lambda x: re.sub(reg, '',  x.text.strip()), results)


def solicitors(soup):
    solicitors = []
    full_citation = full_citation_lines(soup)
    for s in find_solicitors(soup) or []:
        if s not in full_citation:
            solicitor = soup.new_tag('solicitor')
            solicitor.string = s
            solicitors.append(solicitor)
    return solicitors


def find_solicitors(soup):
    reg = re.compile(r'^solicitors?:?\W*', flags=re.IGNORECASE)
    start = find_reg_el(soup, reg, field=["footer-field", "intituling-field"])
    strings = []
    if start:
        if re.sub(reg, '', start.text):
            strings += [re.sub(reg, '', start.text)]
        results = find_until(start, None, use_position=False)
        strings += map(lambda x: x.text, results)
        strings = filter(lambda x: not x.startswith('('), strings)
        strings = filter(lambda x: x, strings)
        return strings


def waistband(soup):
    waistband_dict = find_waistband(soup)
    waistband = soup.new_tag('waistband')
    title = soup.new_tag('title')
    title.string = waistband_dict['title']
    waistband.append(title)

    if 'list' in waistband_dict:
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
    else:
        text = soup.new_tag('text')
        if waistband_dict['text']:
            text.string= waistband_dict['text']
            waistband.append(text)

    return waistband


def find_waistband(soup):
    reg = re.compile(r'^(JUDGMENT OF |SENTENCING)', flags=re.IGNORECASE)
    start = find_reg_el(soup, reg)
    parts = [start]+ find_until(start, None, use_position=False)
    parts = filter(None, map(lambda x: x.text, parts))
    entries = []
    entry = {'text': ''}
    # for now assume alphabetical list
    char = 'A'
    line = ''
    for p in parts[1:]:
        p = p.strip()
        if p.startswith('%s ' % char):
            entry = {'label': char, 'text':  p[2:]}
            entries.append(entry)
            char = chr(ord(char) + 1)
        else:
           entry['text'] += ' ' + p
    if len(entries) == 0:
        result = {'title': parts[0], 'text': entry['text']}
    else:
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
        party_dict = find_parties(soup)
    except AttributeError, e:
        party_dict = find_versus(soup)

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

def find_versus(soup):
    start = find_reg_el(soup, re.compile('^v$'))
    parties = {
        'plantiffs': [{'value': start.previous_sibling.string}]
    }

    defendants = [start.next_sibling] + find_until(start.next_sibling, use_position=False)
    parties['defendants'] = [{'value': ' '.join(map(lambda x: x.text, defendants))}]
    return parties


def generate_footer(soup):
    footer = soup.new_tag('footer')
    text = None
    #for f in soup.find_all('footer-field'):
    #    if not len(f.contents):
    #        f.decompose()
    # first footer should always be FULL CITATION
    for f in soup.find_all('footer-field')[1:]:
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
    if footer.findChildren():
        return footer
    return None


class NoText(Exception):
    pass



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


def iso_date(value):
    if value:
        return datetime.datetime(*map(int, re.split('\D', value)[:-1]))


def process_case(filename, debug=False):
    tmp = mkdtemp()
    xml = generate_parsable_xml(filename, tmp)
    soup = BeautifulSoup(xml, "xml")
    results = massage_xml(soup, debug)
    shutil.rmtree(tmp)
    #print results.prettify()
    return unicode(results)
