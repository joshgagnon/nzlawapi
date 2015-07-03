# -*- coding: utf-8 -*-
from lxml import etree
from collections import defaultdict
import os
import urllib
import re
from xml.dom import minidom
import itertools
import time
import datetime



def timing(f):
    def wrap(*args, **kwargs):
        time1 = time.time()
        ret = f(*args, **kwargs)
        time2 = time.time()
        print '%s function took %0.3f ms' % (f.func_name, (time2 - time1) * 1000.0)
        return ret
    return wrap


class CustomException(Exception):
    status_code = 500

    def __init__(self, message, status_code=None, payload=None):
        Exception.__init__(self)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv['error'] = self.message
        return rv


large_parser = etree.XMLParser(huge_tree=True)

class Monitor(object):
    i = 0
    matches = 0

    def __init__(self, max=None):
        self.max = max

    def cont(self):
        self.i += 1
        return not self.max or self.i < self.max

    def match(self):
        self.matches += 1


def levenshtein(s1, s2):
    if len(s1) < len(s2):
        return levenshtein(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            # j+1 instead of j since previous_row and current_row are one character longer
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1       # than s2
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def tohtml(tree, transform=os.path.join('xslt', 'transform.xslt')):
    xslt = etree.parse(transform)
    transform = etree.XSLT(xslt)
    return transform(tree)

def get_title(tree):
    title = etree.tostring(tree.xpath('.//billref|.//title')[0], method="text", encoding="UTF-8")
    return unicode(title.decode('utf-8'))


#https://bitbucket.org/ianb/formencode/src/tip/formencode/doctest_xml_compare.py#cl-70
def xml_compare(x1, x2, reporter=None):
    if x1.tag != x2.tag:
        if reporter:
            reporter('Tags do not match: %s and %s' % (x1.tag, x2.tag))
        return False
    for name, value in x1.attrib.items():
        if x2.attrib.get(name) != value:
            if reporter:
                reporter('Attributes do not match: %s=%r, %s=%r'
                         % (name, value, name, x2.attrib.get(name)))
            return False
    for name in x2.attrib.keys():
        if name not in x1.attrib:
            if reporter:
                reporter('x2 has an attribute x1 is missing: %s'
                         % name)
            return False
    if not text_compare(x1.text, x2.text):
        if reporter:
            reporter('text: %r != %r' % (x1.text, x2.text))
        return False
    if not text_compare(x1.tail, x2.tail):
        if reporter:
            reporter('tail: %r != %r' % (x1.tail, x2.tail))
        return False
    cl1 = x1.getchildren()
    cl2 = x2.getchildren()
    if len(cl1) != len(cl2):
        print cl1, cl2
        if reporter:
            reporter('children length differs, %i != %i'
                     % (len(cl1), len(cl2)))
        return False
    i = 0
    for c1, c2 in zip(cl1, cl2):
        i += 1
        if not xml_compare(c1, c2, reporter=reporter):
            if reporter:
                reporter('children %i do not match: %s'
                         % (i, c1.tag))
            return False
    return True


def text_compare(t1, t2):
    if not t1 and not t2:
        return True
    if t1 == '*' or t2 == '*':
        return True
    return (t1 or '').strip() == (t2 or '').strip()


def get_path(node, force_part=False):
    result = unicode('')
    it = itertools.chain([node] if node.tag == 'label-para' else [], iter(node.iterancestors('label-para')))
    for n in it:
        if len(n.xpath('./label')):
            text = n.xpath('./label')[0].text
            if text:
                if '.' in text:
                    result = u'%s' % text + result
                else:
                    result = u'(%s)' % text + result
    it = itertools.chain([node] if node.tag == 'subprov' else [],  iter(node.iterancestors('subprov')))
    for n in it:
        if len(n.xpath('./label')):
            text = n.xpath('./label')[0].text
            if text:
                if '.' in text:
                    result = u'%s' % text + result
                else:
                    result = u'(%s)' % text + result

    prov_str = 's'
    if len(node.xpath('ancestor::schedule')):
        prov_str = ' cl'

    it = itertools.chain([node] if node.tag == 'prov' else [], iter(node.iterancestors('prov')))
    for n in it:
        if len(n.xpath('./label')):
            text = n.xpath('./label')[0].text
            if text:
                result = u'%s %s' % (prov_str, text + result)
            else:
                result = u'%s %s' % (prov_str, result)

    if force_part:
        it = itertools.chain([node] if node.tag == 'part' else [], iter(node.iterancestors('part')))
        for n in it:
            if len(n.xpath('./label')):
                text = n.xpath('./label')[0].text
                if text:
                    result = u'part %s ' % n.xpath('./label')[0].text + result

        it = itertools.chain([node] if node.tag == 'head1' else [], iter(node.iterancestors('head1')))
        for n in it:
            if len(n.xpath('./label')):
                text = n.xpath('./label')[0].text
                if text:
                    text = re.sub('part ', '', text, flags=re.I)
                    result = u'part %s ' % text + result

    it = itertools.chain([node] if node.tag == 'schedule' else [], iter(node.iterancestors('schedule')))
    for n in it:
        if len(n.xpath('./label')):
            result = u'sch %s' % (n.xpath('./label')[0].text or '') + result
    result = re.sub(r'\s+', ' ', result)
    return result


def generate_path_string(node, id=None, title=None):
    title = title or get_title(node.getroottree())
    # stupid stupid hack
    result = get_path(node, force_part= (title == 'Income Tax Act 2007'))
    return (u'%s %s' % (title, result),
        'query?%s' % urllib.urlencode({
            'location': result.encode('utf-8'),
            'doc_type': 'instrument',
            'find': 'location',
            'title': title.encode('utf-8')
            }), result)




class MatchError(Exception):
    pass


def node_replace(domxml, store, create_wrapper, lower=False, monitor=None, ignore_fields=None):
    ignore_fields = ignore_fields or ['a',  'extref', 'intref', 'skeleton', 'history-note', 'title', 'heading', 'def-term', 'cataref']

    def process_node(parent):
        for node in parent.childNodes[:]:  # better clone, as we will modify
            if monitor and not monitor.cont():
                return
            if node.nodeType == node.ELEMENT_NODE and node.tagName in ignore_fields:
                continue
            elif store.use_life_cycle and node.nodeType == node.ELEMENT_NODE and node.getAttribute('id'):
                store.enable_tag(node.getAttribute('id'))
            if node.nodeType == node.TEXT_NODE:
                reg = store.get_regex()
                lines = [node.nodeValue]
                i = 0
                count = 0
                offset = 0
                while i < len(lines):
                    line = lines[i]
                    while isinstance(line, basestring):
                        match = reg.search(line.lower() if lower else line, offset)
                        if not match or not match.group(2).strip():
                            break
                        if monitor:
                            monitor.match()
                        try:
                            result = store.get_active(match.group(2))
                            span = match.span(2)
                            lines[i:i + 1] = [line[:span[0]], create_wrapper(domxml, line[span[0]:span[1]], result, count), line[span[1]:]]
                            i += 2
                            count += 1
                            line = line[span[1]:]
                            offset = 0
                        # key error will occur if case doesn't match
                        except KeyError:
                            offset = match.span(2)[0]+1
                        except (MatchError):
                            break
                    i += 1
                lines = filter(lambda x: x, lines)
                new_nodes = map(lambda x: domxml.createTextNode(x) if isinstance(x, basestring) else x, lines)

                if count and len(new_nodes) > 0:
                    [parent.insertBefore(n, node) for n in new_nodes]
                    parent.removeChild(node)
            else:
                process_node(node)

            if store.use_life_cycle and node.nodeType == node.ELEMENT_NODE and node.getAttribute('id'):
                store.expire_tag(node.getAttribute('id'))

    process_node(domxml)
    return domxml


# This is faster in some cases, but doesn't have the case logic yet
def node_replace_aho(domxml, store, create_wrapper, lower=False, monitor=None, ignore_fields=None):
    ignore_fields = ignore_fields or ['a',  'extref', 'intref', 'skeleton', 'history-note', 'title', 'heading', 'def-term', 'cataref']

    def process_node(parent):
        for node in parent.childNodes[:]:  # better clone, as we will modify
            if monitor and not monitor.cont():
                return
            if node.nodeType == node.ELEMENT_NODE and node.tagName in ignore_fields:
                continue
            elif store.use_life_cycle and node.nodeType == node.ELEMENT_NODE and node.getAttribute('id'):
                store.enable_tag(node.getAttribute('id'))
            if node.nodeType == node.TEXT_NODE:
                aho = store.get_aho()
                line = node.nodeValue
                count = 0
                lines = []

                line = line.lower() if lower else line
                matches = aho.findall_long(line)
                for match in matches:
                    if not match or match[0] is None:
                        break
                    if monitor:
                        monitor.match()
                    try:
                        result = match[2]
                        span = match
                        lines += [line[:match[0]], create_wrapper(domxml, line[span[0]:span[1]], result, count), line[span[1]:]]
                        count += 1
                    # key error will occur if case doesn't match
                    except KeyError:
                        offset = match.match(2)[0]+1
                    except (MatchError):
                        break
                else:
                    lines = [line]
                lines = filter(lambda x: x, lines)
                new_nodes = map(lambda x: domxml.createTextNode(x) if isinstance(x, basestring) else x, lines)

                if count and len(new_nodes) > 0:
                    [parent.insertBefore(n, node) for n in new_nodes]
                    parent.removeChild(node)
            else:
                process_node(node)

            if store.use_life_cycle and node.nodeType == node.ELEMENT_NODE and node.getAttribute('id'):
                store.expire_tag(node.getAttribute('id'))

    process_node(domxml)
    return domxml

def etree_to_dict(t, end=None):
    d = {'children' : map(lambda x: etree_to_dict(x, end),
        [c for c in t if not end or not t.attrib.get(end)]), 'tag': t.tag}
    #d = {'children' : map(etree_to_dict, iter(t)), 'tag': t.tag}
    d.update(('@' + k, v) for k, v in t.attrib.iteritems())
    if (t.text or ''):
        d['#text'] = t.text or ''
    if (t.tail or ''):
        d['#tail'] = t.tail or ''
    return d

def remove_nbsp(input):
    if isinstance(input, str):
        input = unicode(input, 'utf-8')
    return input.replace(u"\u00A0", u' ').replace(u"\u2060", u'').encode('utf-8')


def safe_date(string, date_format='%Y-%m-%d'):
    try:
        return datetime.datetime.strptime(string, date_format).date()
    except:
        return None


def format_govt_date(date):
    months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    return '%s %s %s' % (date.day, months[date.month-1], date.year)

