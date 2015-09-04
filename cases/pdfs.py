# -*- coding: utf-8 -*-
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
from subprocess import Popen, PIPE
import re
import os
import copy
from cases.variables import THRESHOLDS
from collections import Counter


""" This module reads from a pdf file and generates an xml doc.
    It makes a few assumptions, and will divide the doc into intituling, body and footer,
    as well as create tables, indents, quotes and paragraphs """


""" force horizontal lines """
def find_neighbors (self, plane, ratio):
    objs = plane.find((self.x0-1000, min(self.y0+3, self.y1-3), self.x1+1000, max(self.y0+3 ,self.y1-3)))
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


class Match(object):
    def __init__(self, string, open=None, close=None, tests=[], post_action=None, dependants=[]):
        self.string = string
        self.open = open
        self.close = close
        self.tests = tests
        self.post_action = post_action
        self.dependants = dependants


class Not(object):
    def __init__(self, test):
        self.test = test

    def __repr__(self):
        return self.test


class DocStateMachine(object):
    def __init__(self, inputs, doc):
        self.inputs = inputs[:]
        self.positions = [0] * len(inputs)
        self.doc = doc

    def step(self, char):
        def do_test(test):
            result = getattr(self.doc, str(t))()
            return not result if isinstance(t, Not) else result

        def equal(char1, char2):
            return char1 == '*' or char1 == char2

        for i in xrange(len(self.inputs)):
            if equal(self.inputs[i].string[self.positions[i]], char):
                self.positions[i] += 1
                if len(self.inputs[i].string) == self.positions[i]:
                    self.positions[i] = 0
                    if all([do_test(t) for t in self.inputs[i].tests]):
                        if self.inputs[i].close:
                            self.doc.close_tag(self.inputs[i].close, flush=False)
                        if self.inputs[i].open:
                            self.doc.open_tag(self.inputs[i].open, flush=False)
                        if self.inputs[i].post_action:
                            self.inputs[i].post_action(self.doc)
                        if self.inputs[i].dependants:
                            self.inputs += self.inputs[i].dependants
                            self.positions += [0] * len(self.inputs[i].dependants)
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

def close_entry(doc):
    doc.close_tag('entry')
    doc.open_tag('entry')


RULES = [
    Match(string='[1]', open='body,paragraph', close='intituling,table', tests=['is_left_aligned', 'is_intituling']),
    #Match(string='JUDGMENT', tests=['is_center_aligned', 'is_intituling'], dependants=[
        #Match(string='*', open='body,paragraph', close='intituling', tests=['is_left_aligned', 'is_bold', Not('is_table'), 'is_intituling'])
    #]),
    Match(string='REASON', open='body,paragraph', close='intituling', tests=['is_bold', 'is_intituling']),
    Match(string='Introduction', open='body,paragraph', close='intituling', tests=['is_bold', 'is_intituling']),
    Match(string='Para No', open='table', close='paragraph,intituling', tests=['is_bold', 'is_right_aligned']),
    Match(string='Table of Contents', open='body,table', close='paragraph,intituling', tests=['is_bold', 'is_center_aligned']),
    Match(string='[', open='table,row,entry', close='paragraph,intituling', tests=['is_right_aligned', 'is_body', Not('is_table')], post_action=close_entry),
]


class DocState(object):
    """ The pdfminer gives us the first stage of grouping, but I have
        keep it agnostic as to case pdf layout.  This class, on the other hand,
        will have an opinion about expected layouts, and will separate intituling,
        paragraphs, footers and tables. """

    CONTROL = re.compile(ur'[\x00-\x08\x0b-\x0c\x0e-\x1f\n]')

    has_new_line = False
    has_new_chunk = False
    bbox = None
    prev_bbox = None
    line_bbox = None
    char_bbox = None
    prev_line_bbox = None
    size = None
    font = None
    body = None
    footer = None
    last_char = None
    max_width = [None, None]



    def __init__(self):
        self.state = DocStateMachine(RULES, self)
        self.body = StringIO()
        self.footer = StringIO()
        self.buffer = StringIO()
        self.out = self.body
        self.body_stack = []
        self.foot_stack = []
        self.body_style_stack = []
        self.foot_style_stack = []
        self.switch_footer()
        self.open_tag('footer')
        self.switch_body()
        self.open_tag('intituling')
        self.font = None
        self.unknown_font = False
        self.font_stats = {'mean': 0, 'count': 0}
        self.thresholds = copy.deepcopy(THRESHOLDS)

    def analyse_stats(self, sizes):
        mean = sum(sizes) / len(sizes)
        mode = Counter(sizes).most_common(1)[0][0]
        self.thresholds['footer_size'] = mode - 1;
        self.thresholds['quote_size'] = mode;


    def para_threshold(self, threshold_key='paragraph_vertical_threshold'):
        (prev_bbox, bbox) = (self.prev_line_bbox, self.line_bbox)
        # if not first bbox
        if not self.prev_bbox:
            return False

        # vertical distance so great it is likely a new paragraph
        if dist((prev_bbox[1], prev_bbox[3]), (bbox[1], bbox[3])) > self.thresholds[threshold_key]:
            return True

        if bbox[2] - prev_bbox[2] > self.thresholds['paragraph_early_newline']:
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
                if t in ['paragraph', 'intituling-field', 'row', 'entry', 'indent'] and self.bbox:
                    bbox = self.bbox if t in ['intituling-field', 'entry'] else self.line_bbox
                    attributes = ('left="%d" top="%d" right="%d" bottom="%d" italic="%s" bold="%s" center="%s"' %
                          (bbox[0], bbox[1], bbox[2], bbox[3],
                            '1' if self.is_italic(self.font) else '0',
                            '1' if self.is_bold(self.font) else '0',
                            '1' if self.is_center_aligned() else '0'
                            ))
                    self.out.write('<%s %s>' % (t, attributes))
                else:
                     self.out.write('<%s>' % t)


    def close_tag(self, tag, flush=True):
        if flush:
            [self.close_style(s) for s in self.style_stack]

        for t in tag.split(','):
            if t in self.tag_stack and flush:
                self.flush()
            while t in self.tag_stack:
                _tag = self.tag_stack.pop()
                self.out.write('</%s>' % _tag)

    def open_style(self, style):
        if style not in self.style_stack:
            self.style_stack.append(style)
            self.buffer.write('<%s>' % style)

    def close_style(self, style):
        while style in self.style_stack:
            _tag = self.style_stack.pop()
            self.buffer.write('</%s>' % _tag)

    def flush(self):
        self.out.write(self.buffer.getvalue())
        self.buffer.close()
        self.buffer = StringIO()


    def handle_hline(self, item):
        self.handle_style()
        if (item.bbox[3] - item.bbox[1] < 3.0 and
            abs(item.bbox[0] - self.line_bbox[0]) < 1.0 and
            abs(item.bbox[2] - self.line_bbox[2]) < 1.0 and
            item.bbox[3] - self.line_bbox[1] < 2.0):
            [self.close_style(s) for s in self.style_stack]
            self.open_tag('underline')
            self.close_tag('underline')


    def handle_new_chunk(self):
        self.has_new_chunk = False

        if self.is_footer():
            if self.is_intituling():
                self.close_tag('footer-field')
            self.open_tag('footer-field')

        elif self.is_intituling():
            # we will keep everyline in the intituling separate
            self.close_tag('intituling-field')
            self.open_tag('intituling-field')

        elif self.is_table():
            self.close_tag('entry')
            self.open_tag('entry')

    def handle_page(self):
        self.switch_body()

    def handle_new_line(self):
        self.has_new_line = False
        handle_space = False
        if not self.max_width[0] or self.bbox[0] < self.max_width[0]:
            self.max_width[0] = self.bbox[0]
        if not self.max_width[1] or self.bbox[2] > self.max_width[1]:
            self.max_width[1] = self.bbox[2]

        elif 'superscript' in self.style_stack:
            self.close_style('superscript')
            self.buffer.write(' ')

        if self.is_footer():
            self.switch_footer()
            self.open_tag('footer-page')
            if self.footer_threshold():
                self.close_tag('footer-field')
            self.open_tag('footer-field')
        else:
            self.switch_body()

        if self.is_footer():
            pass
        elif self.is_intituling():
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

            if 'indent' in self.tag_stack:
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
            self.open_style('superscript')

        elif 'superscript' in self.style_stack:
            self.close_style('superscript')
            self.buffer.write(' ')

        if self.is_italic(self.font):
            self.open_style('emphasis')

        elif 'emphasis' in self.style_stack:
            self.close_style('emphasis')

        if self.is_bold(self.font):
            self.open_style('strong')

        elif 'strong' in self.style_stack:
            self.close_style('strong')

        if not self.is_footer():
            self.switch_body()

    def is_superscript(self):
        return self.size < self.thresholds['superscript']  and (self.char_bbox and self.char_bbox[1] > (self.line_bbox[1] + self.thresholds['superscript_offset']))

    def is_quote(self, bbox=None):
        bbox = bbox or self.line_bbox
        margin = bbox[0] > self.thresholds['quote']
        size = self.size < self.thresholds['quote_size']
        return margin and size

    def is_footer(self):
        correct_size = (self.size and self.size <= self.thresholds['footer_size'])
        return correct_size and (not self.is_quote() or self.out == self.footer)

   # def larger_than_footer(self):
        #print self.size, self.thresholds['footer_size']
    #    return (self.size and self.size > self.thresholds['footer_size'])

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
        """ nothing should be centered until we get something else """
        if not self.max_width[0]:
            return
        """ should be within 'center_tolerance_threshold' of margins
            and at least center_margin_min from the edge """
        return ( self.thresholds['center_tolerance_threshold'] >
                abs((bbox[0]- self.max_width[0]) -  (self.max_width[1] - bbox[2])) and
                (bbox[0]- self.max_width[0] > self.thresholds['center_margin_min'] and
                 self.max_width[1] - bbox[2] >  self.thresholds['center_margin_min']))

    def is_left_indented(self, bbox=None):
        bbox = bbox or self.line_bbox
        return bbox[0] > (self.max_width[0] + self.thresholds['indent_threshold']) and not self.is_center_aligned(bbox) and not self.is_right_aligned()

    def is_header(self, bbox=None):
        bbox = bbox or self.bbox
        """ headers can be center and bold, or left and bold if they are vertically far enough away """
        if self.is_center_aligned(bbox) and self.is_bold():
            return True
        if self.is_left_aligned(bbox) and bbox[2] < self.thresholds['right_align_thresholds'][1] and self.is_bold() and self.para_threshold('table_vertical_threshold'):
            return True

    def switch_footer(self):
        if self.out != self.footer:
            self.flush()
            self.out = self.footer
            self.tag_stack = self.foot_stack
            self.style_stack = self.foot_style_stack
            # transistion from body/footer, clear prev
            self.prev_bbox = None

    def switch_body(self):
        if self.out == self.footer:
            self.close_tag('footer-page')
        self.out = self.body
        self.tag_stack = self.body_stack
        self.style_stack = self.body_style_stack

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
        if item and text.strip():
            self.register_font(item)
            if self.has_new_line:
                self.handle_new_line()
            if self.has_new_chunk:
                self.handle_new_chunk()
        self.handle_style()
        self.state.step(enc(text, 'utf-8'))
        self.buffer.write(enc(text, 'utf-8'))
        self.last_char = text
        return


class Converter(PDFConverter):

    def __init__(self, rsrcmgr, doc, codec='utf-8', pageno=1,
             laparams=None, imagewriter=None):
        PDFConverter.__init__(self, rsrcmgr, None, codec=codec, pageno=pageno, laparams=laparams)
        self.imagewriter = imagewriter
        self.laparams = laparams
        self.doc = doc
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

            def sort_y(a, b):
                return int(b.y0 - a.y0)

            if isinstance(item, LTPage):
                self.doc.handle_page()
                item._objs = sorted(item._objs, cmp=sort_y)
                for child in item:
                    #print child
                    render(child)

            elif isinstance(item, LTLine):
                self.doc.handle_hline(item)

            elif isinstance(item, LTRect):
                self.doc.handle_hline(item)

            elif isinstance(item, LTCurve):
                if False:
                    self.doc.out.write('<curve linewidth="%d" bbox="%s" pts="%s"/>\n' %
                                     (item.linewidth, bbox2str(item.bbox), item.get_pts()))

            elif isinstance(item, LTFigure):
                if False:
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


class StatsConverter(Converter):
    def __init__(self, *args, **kwargs):
        Converter.__init__(self, *args, **kwargs)
        self.sizes = []

    def receive_layout(self, ltpage):
        def recurse(item):
            try:
                for i in item:
                    recurse(i)
            except TypeError:
                if hasattr(item, 'fontsize'):
                    self.sizes.append(item.fontsize)
        recurse(ltpage)

    def finalize():
        self.doc.analyse_stats(sizes=self.sizes)


def generate_parsable_xml(path, tmp):
    rsrcmgr = PDFResourceManager()
    # Set parameters for analysis.
    laparams = LAParams(detect_vertical=False, char_margin=3, line_margin=0.01)#,line_margin=2)
    # Create a PDF page aggregator object.
    password = ''
    path = canoncialize_pdf(path, tmp)
    # print path
    with open(path, 'rb') as fp:
        parser = PDFParser(fp)
        document = PDFDocument(parser)
        doc = DocState()
        stats_device = StatsConverter(rsrcmgr, doc, codec='utf-8', laparams=laparams)
        device = Converter(rsrcmgr, doc, codec='utf-8', laparams=laparams)
        interpreter = PDFPageInterpreter(rsrcmgr, stats_device)
        for page in PDFPage.create_pages(document):
            interpreter.process_page(page)
        interpreter.device = device
        for page in PDFPage.create_pages(document):
            interpreter.process_page(page)
        return re.sub(' +', ' ', device.get_result())



def canoncialize_pdf(path, tmp):
    output = os.path.join(tmp, 'out.pdf')
    cmd = """gs -sDEVICE=pdfwrite -dNOPAUSE -dBATCH -dSAFER -sOutputFile=%s '%s'"""
    p = Popen(cmd % (output, path), shell=True, stdout=PIPE, stderr=PIPE)
    out, err = p.communicate()
    return output



