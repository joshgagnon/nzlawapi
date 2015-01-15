# -*- coding: utf-8 -*-
from db import get_act_exact
from util import tohtml
#from nltk.stem import *
from lxml import etree
#from nltk.stem.snowball import SnowballStemmer
from nltk.stem.wordnet import WordNetLemmatizer
#from nltk.corpus import wordnet as wn
from xml.dom import minidom
from copy import deepcopy
from collections import namedtuple, MutableMapping, defaultdict
from itertools import chain
import re
import os
import uuid

lmtzr = WordNetLemmatizer()

"""
    naming conventions in http://www.lawfoundation.org.nz/style-guide/nzlsg_12.html#4.1.1
"""


def key_regex(string):
    match_string = u"(^|\W)(%s['’]?[es]{,2}['’]?)($|\W)" % re.sub('[][()]', '', string)
    return re.compile(match_string, flags=re.I)


class Definition(namedtuple('Definition', ['full_word', 'key', 'xml', 'regex', 'id', 'expiry_tag'])):

    def __new__(self, full_word, key, xml, regex, id=None, expiry_tag=None):
        if not id:
            id = 'def-%s' % xml.xpath('.//def-term')[0].attrib.get('id', uuid.uuid4())
        return self.__bases__[0].__new__(self, full_word, key, xml, regex, id, expiry_tag)

    def __eq__(self, other):
        return self.id == other.id

    def render(self):
        return {
            'title': self.full_word,
            'html': etree.tostring(tohtml(self.xml, os.path.join('xslt', 'transform_def.xslt')), encoding='UTF-8', method="html")
        }


class Definitionsxz(MutableMapping):

    def __init__(self):
        self.store = defaultdict(list)
        self.retired = []

    def __getitem__(self, key):
        if key in self.store:
            return self.store[key][-1]
        else:
            raise KeyError

    def __setitem__(self, key, value):
        self.store[key].append(value)

    def __delitem__(self, key):
        self.store[key].pop()

    def __iter__(self):
        return iter(self.store)

    def __len__(self):
        return len(self.store)

    def all(self):
        return set(list(chain.from_iterable(self.store.values())) + self.retired)

    def enable_tag(self, tag):
        pass

    def expire_tag(self, tag):
        for k in list(self.store):
            [self.retired.append(d) for d in self.store[k] if d.expiry_tag == tag]
            self.store[k][:] = [d for d in self.store[k] if d.expiry_tag != tag]
            if not len(self.store[k]):
                del self.store[k]

    def __repr__(self):
        return self.store.__repr__()

    def __deepcopy__(self):
        newone = type(self)()
        newone.retired = self.retired[:]
        newone.store = self.store.copy()
        return newone


class Definitions(object):

    def __init__(self):
        self.pool = defaultdict(list)
        self.active = defaultdict(list)

    def active(self, key):
        if key in self.active:
            return self.active[key][-1]
        else:
            raise KeyError

    def add(self, definition):
        self.pool[definition.expiry_tag].append(definition)
        if not definition.expiry_tag:
            self.active[definition.key].append(definition)

    def items(self):
        return list(chain.from_iterable(self.pool.values()))

    def enable_tag(self, tag):
        for definition in self.pool[tag]:
            self.active[definition.key].append(definition)

    def expire_tag(self, tag):
        for definition in self.pool[tag]:
            self.active[definition.key].remove(definition)
            if not len(self.active[definition.key]):
                del self.active[definition.key]

    def ordered_defs(self):
        current = map(lambda x: x[-1], self.active.values())
        return sorted(current, key=lambda x: len(x.key), reverse=True)

    def render(self):
        return {v.id: v.render() for v in self.items()}

    def __deepcopy__(self):
        newone = type(self)()
        newone.pool = self.pool.copy()
        newone.active = self.active.copy()
        return newone


def infer_life_time(node):
    try:
        text = etree.tostring(node).lower()
        if 'this act' in text:
            return node.iterancestors('act').next().attrib.get('id')
        if 'this part' in text:
            return node.iterancestors('part').next().attrib.get('id')
        if 'this subpart' in text:
            return node.iterancestors('subpart').next().attrib.get('id')
        if 'this section' in text:
            return node.iterancestors('prov').next().attrib.get('id')
        if 'in subsection' in text:
            #prov on purpose
            return node.iterancestors('prov').next().attrib.get('id')
    except (AttributeError, IndexError):
        pass
    return None


def process_node(parent, defs, title):
    doc = parent.ownerDocument

    def create_def(word, definition):
        match = doc.createElement('catalex-def')
        match.setAttribute('def-id', definition.id)
        match.appendChild(doc.createTextNode(word))
        return match

    for node in parent.childNodes[:]:  # better clone, as we will modify'

        if node.nodeType == node.ELEMENT_NODE and node.tagName == 'a':
            continue
        elif node.nodeType == node.ELEMENT_NODE and node.getAttribute('id'):
            defs.enable_tag(node.getAttribute('id'))
        elif node.nodeType == node.TEXT_NODE:
            lines = [node.nodeValue]
            for definition in defs.ordered_defs():
                i = 0
                while i < len(lines):
                    line = lines[i]
                    while isinstance(line, basestring):
                        match = definition.regex.search(line.lower())
                        if not match:
                            break
                        span = match.span(2)
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
            process_node(node, defs, title)

        if node.nodeType == node.ELEMENT_NODE and node.getAttribute('id'):
            defs.expire_tag(node.getAttribute('id'))


def find_all_definitions(tree, definitions, expire=True):
    title = tree.xpath('./cover/title')[0].text
    nodes = tree.xpath(".//def-para[descendant::def-term]")
    # todo, missing def-terms without def-para
    for node in nodes:
        keys = node.xpath('.//def-term')
        prov = node.iterancestors(tag='prov').next().xpath('./label')[0].text
        for key in keys:
            # super ugly hack to prevent placeholders like 'A'
            if len(key.text) > 1:
                clone = deepcopy(node)
                src = etree.Element('catalex-src')
                # todo tricky rules
                src.attrib['src'] = key.attrib.get('id')
                src.text = '%s s %s' % (title, prov)
                clone.append(src)
                base = lmtzr.lemmatize(key.text.lower())
                expiry_tag = infer_life_time(node.getparent()) if expire else None
                definitions.add(Definition(full_word=key.text, key=base, xml=clone, regex=key_regex(base), expiry_tag=expiry_tag))
                if key.text.lower() != base:
                    definitions.add(Definition(full_word=key.text, key=key.text.lower(), xml=clone, regex=key_regex(base), expiry_tag=expiry_tag))


#todo rename
def process_definitions(tree, definitions):
    title = tree.xpath('./cover/title')[0].text
    find_all_definitions(tree, definitions, expire=True)
    domxml = minidom.parseString(etree.tostring(tree, encoding='UTF-8', method="html"))
    process_node(domxml, definitions, title)
    tree = etree.fromstring(domxml.toxml(), parser=etree.XMLParser(huge_tree=True))
    return tree


def insert_definitions(tree):
    interpretation = get_act_exact('Interpretation Act 1999')
    definitions = Definitions()
    find_all_definitions(interpretation, definitions, expire=False)
    tree = process_definitions(tree, definitions)
    return tree, definitions.render()
