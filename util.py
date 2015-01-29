from lxml import etree
from collections import defaultdict
import os


class CustomException(Exception):
    pass


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


def generate_path_string(node):
    result = ''
    it = iter(node.iterancestors('label-para'))
    for n in it:
        if len(n.xpath('./label')):
            text = n.xpath('./label')[0].text
            if text:
                result = '(%s)' % text + result
    it = iter(node.iterancestors('subprov'))
    for n in it:
        if len(n.xpath('./label')):
            text = n.xpath('./label')[0].text
            if text:
                result = '(%s)' % text + result

    prov_str = 's'
    if len(node.xpath('ancestor::schedule')):
        prov_str = ' cl'

    it = iter(node.iterancestors('prov'))
    for n in it:
        if len(n.xpath('./label')):
            text = n.xpath('./label')[0].text
            if text:
                result = '%s %s' % (prov_str, text + result)

    it = iter(node.iterancestors('schedule'))
    for n in it:
        if len(n.xpath('./label')):
            result = 'sch %s' % n.xpath('./label')[0].text + result

    return '%s %s' % (node.getroottree().xpath('./cover/title')[0].text, result)


import re
from xml.dom import minidom

#TODO finish writing this
def node_replace(tree, create_wrapper, ignore_fields=None):
    ignore_fields = ignore_fields or ['a', 'skeleton', 'history-note', 'title', 'heading']

    def process_node(parent, defs, monitor=None):
        doc = parent.ownerDocument

        def create_def(word, definition, index):
            match = doc.createElement('catalex-def')
            match.setAttribute('def-id', definition.id)
            match.setAttribute('def-idx', 'idx-%d-%d' % (monitor.i, index))
            match.appendChild(doc.createTextNode(word))
            return match

        for node in parent.childNodes[:]:  # better clone, as we will modify
            if monitor and not monitor.cont():
                return
            if node.nodeType == node.ELEMENT_NODE and node.tagName in ignore_fields:
                continue
            elif node.nodeType == node.ELEMENT_NODE and node.getAttribute('id'):
                defs.enable_tag(node.getAttribute('id'))
            if node.nodeType == node.TEXT_NODE:
                reg = defs.get_regex()
                lines = [node.nodeValue]
                i = 0
                count = 0
                while i < len(lines):
                    line = lines[i]
                    while isinstance(line, basestring):
                        match = reg.search(line.lower())
                        if not match:
                            break
                        definition = defs.get_active(lmtzr.lemmatize(match.group(2)))
                        span = (match.span(2)[0], match.span(3)[1])
                        lines[i:i + 1] = [line[:span[0]], create_def(line[span[0]:span[1]], definition, count), line[span[1]:]]
                        i += 2
                        count += 1
                        line = line[span[1]:]
                    i += 1
                lines = filter(lambda x: x, lines)
                new_nodes = map(lambda x: doc.createTextNode(x) if isinstance(x, basestring) else x, lines)

                if len(new_nodes) > 1:
                    [parent.insertBefore(n, node) for n in new_nodes]
                    parent.removeChild(node)
            else:
                process_node(node, defs, monitor)

            if node.nodeType == node.ELEMENT_NODE and node.getAttribute('id'):
                defs.expire_tag(node.getAttribute('id'))


def etree_to_dict(t):
    d = {'children' : map(etree_to_dict, iter(t)), 'tag': t.tag}
    d.update(('@' + k, v) for k, v in t.attrib.iteritems())
    if (t.text or '').strip():
        d['#text'] = (t.text or '').strip()
    if (t.tail or '').strip():
        d['#tail'] = (t.tail or '').strip()
    return d

