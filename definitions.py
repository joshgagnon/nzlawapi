# -*- coding: utf-8 -*-
from db import get_act_exact
from util import tohtml, generate_path_string
#from nltk.stem import *
from lxml import etree
#from nltk.stem.snowball import SnowballStemmer
from nltk.stem.wordnet import WordNetLemmatizer
#from nltk.corpus import wordnet as wn
from xml.dom import minidom
from copy import deepcopy
from collections import defaultdict
from itertools import chain
import re
import os
import uuid

lmtzr = WordNetLemmatizer()

"""
    naming conventions in http://www.lawfoundation.org.nz/style-guide/nzlsg_12.html#4.1.1
"""


def key_regex(string):
    match_string = u"(^|\W)(%s[es'’]{,3})($|\W)" % re.sub('[][()]', '', string)
    return re.compile(match_string, flags=re.I)


class Definition(object):

    def __init__(self, full_word, key, xml, regex, id=None, expiry_tag=None):
        if not id:
            id = 'def-%s' % xml.xpath('.//def-term')[0].attrib.get('id', uuid.uuid4())
        else:
            id = 'def-%s' % id
        self.full_word = full_word
        self.key = key
        self.xml = xml
        self.regex = regex
        self.id = id
        self.expiry_tag = expiry_tag

    def __eq__(self, other):
        return self.id == other.id

    def combine(self, other):
        root = etree.Element('para')
        root.append(self.xml)
        root.append(other.xml)
        self.xml = root

    def render(self):
        return {
            'title': self.full_word,
            'html': etree.tostring(tohtml(self.xml, os.path.join('xslt', 'transform_def.xslt')), encoding='UTF-8', method="html")
        }


class Definitions(object):

    def __init__(self):
        self.pool = defaultdict(list)
        self.active = defaultdict(list)
        self.regex = None

    def get_active(self, key):
        if key in self.active:
            return self.active[key][-1]
        else:
            raise KeyError

    def add(self, definition):
        for d in self.pool[definition.expiry_tag]:
            if d.full_word == definition.full_word:
                # same scope, must join together
                d.combine(definition)
                return
        self.pool[definition.expiry_tag].append(definition)
        if not definition.expiry_tag:
            self.active[definition.key].append(definition)

    def items(self):
        return list(chain.from_iterable(self.pool.values()))

    def enable_tag(self, tag):
        for definition in self.pool[tag]:
            self.active[definition.key].append(definition)
            self.regex = None

    def expire_tag(self, tag):
        for definition in self.pool[tag]:
            self.active[definition.key].remove(definition)
            if not len(self.active[definition.key]):
                del self.active[definition.key]
            self.regex = None

    def ordered_defs(self):
        current = map(lambda x: x[-1], self.active.values())
        return sorted(current, key=lambda x: len(x.key), reverse=True)

    def combined_reg(self):
        keys = map(lambda x: x.key, self.ordered_defs())
        match_string = u"(^|\W)(%s)([es'’]{,3})($|\W)" % re.sub('[][()]', '', '|'.join(keys))
        return re.compile(match_string, flags=re.I)

    def get_regex(self):
        if not self.regex:
            self.regex = self.combined_reg()
        return self.regex

    def render(self):
        return {v.id: v.render() for v in self.items()}

    def __deepcopy__(self):
        newone = type(self)()
        newone.pool = self.pool.copy()
        newone.active = self.active.copy()
        return newone


class Monitor(object):
    i = 0

    def __init__(self, max):
        self.max = max

    def cont(self):
        self.i += 1
        return self.i < self.max


def process_node(parent, defs, title, monitor):
    ignore_fields = ['a', 'skeleton', 'history-note']
    doc = parent.ownerDocument

    def create_def(word, definition):
        match = doc.createElement('catalex-def')
        match.setAttribute('def-id', definition.id)
        match.appendChild(doc.createTextNode(word))
        return match

    for node in parent.childNodes[:]:  # better clone, as we will modify'
        if not monitor.cont():
            return
        if node.nodeType == node.ELEMENT_NODE and node.tagName in ignore_fields:
            continue
        elif node.nodeType == node.ELEMENT_NODE and node.getAttribute('id'):
            defs.enable_tag(node.getAttribute('id'))
        if node.nodeType == node.TEXT_NODE:
            reg = defs.get_regex()
            lines = [node.nodeValue]
            i = 0
            while i < len(lines):
                line = lines[i]
                while isinstance(line, basestring):
                    match = reg.search(line.lower())
                    if not match:
                        break
                    definition = defs.get_active(lmtzr.lemmatize(match.group(2)))
                    span = (match.span(2)[0], match.span(3)[1])
                    lines[i:i + 1] = [line[:span[0]], create_def(line[span[0]:span[1]], definition), line[span[1]:]]
                    i += 2
                    line = line[span[1]:]
                i += 1
            lines = filter(lambda x: x, lines)
            new_nodes = map(lambda x: doc.createTextNode(x) if isinstance(x, basestring) else x, lines)

            if len(new_nodes) > 1:
                [parent.insertBefore(n, node) for n in new_nodes]
                parent.removeChild(node)
        else:
            process_node(node, defs, title, monitor)

        if node.nodeType == node.ELEMENT_NODE and node.getAttribute('id'):
            defs.expire_tag(node.getAttribute('id'))


def infer_life_time(node):
    def get_id(node):
        if not node.attrib.get('id'):
            node.attrib['id'] = str(uuid.uuid4())
        return node.attrib.get('id')

    try:
        parent = node
        try:
            parent = node.iterancestors('para').next()
        except StopIteration:
            pass
        text = parent.xpath('.//text()')[0].strip().lower()
        if text.startswith('in this act'):
            return get_id(parent.iterancestors('act').next())
        if text.startswith('in this part'):
            return get_id(parent.iterancestors('part').next())
        if text.startswith('in this subpart'):
            return get_id(parent.iterancestors('subpart').next())
        if text.startswith('in the formula'):
            return get_id(parent.iterancestors('prov').next())
        if 'in subsection' in text or 'of subsection' in text:
            #prov on purpose
            return get_id(parent.iterancestors('prov').next())
        if 'this section' in text:
            return get_id(parent.iterancestors('prov').next())
        if 'in schedule' in text:
            return get_id(parent.iterancestors('schedule').next())

    except (AttributeError, IndexError), e:
        print 'infer life error', e
    except StopIteration:
        # couldn't find safe parent
        return str(uuid.uuid4())
    return get_id(parent.iterancestors('act').next())




def find_all_definitions(tree, definitions, expire=True):
    nodes = tree.xpath(".//def-term[not(ancestor::skeletons)]")

    def get_parent(node):
        try:
            return node.iterancestors('def-para').next()
        except StopIteration:
            return node.iterancestors('para').next()

    for node in nodes:
        # super ugly hack to prevent placeholders likept 'A'
        text = node.itertext().next()
        if len(text) > 1:
            parent = get_parent(node)
            clone = deepcopy(parent)
            src = etree.Element('catalex-src')
            # todo tricky rules
            src.attrib['src'] = node.attrib.get('id') or str(uuid.uuid4())
            src.text = generate_path_string(node)
            clone.append(src)
            base = lmtzr.lemmatize(text.lower())
            expiry_tag = infer_life_time(parent) if expire else None
            definitions.add(Definition(full_word=text, key=base, xml=clone, id=node.attrib.get('id'), regex=key_regex(base), expiry_tag=expiry_tag))
            if text.lower() != base:
                definitions.add(Definition(full_word=text, key=text.lower(), xml=clone, id=node.attrib.get('id'), regex=key_regex(text.lower()), expiry_tag=expiry_tag))


#todo rename
def process_definitions(tree, definitions):
    title = tree.xpath('./cover/title')[0].text
    find_all_definitions(tree, definitions, expire=True)
    print 'Completed definition extraction'
    print '%d nodes to scan' % len(tree.xpath('.//*'))
    monitor = Monitor(50000)
    domxml = minidom.parseString(etree.tostring(tree, encoding='UTF-8', method="html"))
    process_node(domxml, definitions, title, monitor)
    tree = etree.fromstring(domxml.toxml(), parser=etree.XMLParser(huge_tree=True))
    return tree


def insert_definitions(tree):
    interpretation = get_act_exact('Interpretation Act 1999')
    definitions = Definitions()
    find_all_definitions(interpretation, definitions, expire=False)
    tree = process_definitions(tree, definitions)
    return tree, definitions.render()
