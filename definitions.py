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


def key_regex(string):
    match_string = u"(^|\W)(%s['’]?[es]{,2}['’]?)($|\W)" % re.sub('[][()]', '', string)
    return re.compile(match_string, flags=re.I)


class Definition(namedtuple('Definition', ['full_word', 'xml', 'regex', 'id', 'expiry_tag'])):

    def __new__(self, full_word, xml, regex, id=None, expiry_tag=None):
        if not id:
            id = 'def-%s' % xml.xpath('.//def-term')[0].attrib.get('id', uuid.uuid4())
        return self.__bases__[0].__new__(self, full_word, xml, regex, id, expiry_tag)

    def __eq__(self, other):
        return self.id == other.id

    def render(self):
        return {
            'title': self.full_word,
            'html': etree.tostring(tohtml(self.xml, os.path.join('xslt', 'transform_def.xslt')), encoding='UTF-8', method="html")
        }


class Definitions(MutableMapping):

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


def infer_life_time(node):
    try:
        text = node.toxml().lower()
        if 'this act' in text:
            return None
        if 'this part' in text:
            return 'part'
        if 'this subpart' in text:
            return 'subpart'
        if 'this section' in text:
            return 'prov'
        if 'in subsection' in text:
            return 'subprov'
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

    def gen_xml(node):
        xml = node.toxml()
        if node.tagName != 'def-para':
            xml = '<def-para>%s</def-para>' % xml
        etree_node = etree.fromstring(xml)
        try:
            src_id = etree_node.xpath('.//*[@id]')[0].attrib['id']
        except IndexError:
            return etree_node
        prov_node = node
        #find parent prov
        while prov_node != doc and prov_node.tagName not in ['prov', 'schedule'] and prov_node.parentNode:
            prov_node = prov_node.parentNode
        if prov_node and prov_node != doc:
            prov = prov_node.getElementsByTagName('label')[0].childNodes[0].nodeValue
            src = etree.Element('catalex-src')
            element_type = {'prov': 'Section', 'schedule': 'Schedule'}[prov_node.tagName]
            src.attrib['src'] = src_id
            src.text = '%s %s %s' % (title, element_type, prov)
            etree_node.append(src)
        return etree_node

    for node in parent.childNodes[:]:  # better clone, as we will modify
        if node.nodeType == node.ELEMENT_NODE and node.tagName == 'def-para':
            key_nodes = node.getElementsByTagName('def-term')
            for key_node in key_nodes:
                key = key_node.childNodes[0].nodeValue
                if len(key) > 1:
                    base = lmtzr.lemmatize(key.lower())
                    defs[base] = Definition(
                        full_word=key,
                        xml=gen_xml(node),
                        regex=key_regex(base),
                        expiry_tag=infer_life_time(node.parentNode.childNodes[0]))
        elif node.nodeType == node.ELEMENT_NODE and node.tagName == 'def-term':
            key = node.childNodes[0].nodeValue
            if key and len(key) > 1:
                base = lmtzr.lemmatize(key.lower())
                defs[base] = Definition(
                    full_word=key,
                    xml=gen_xml(node.parentNode),
                    regex=key_regex(base),
                    expiry_tag=infer_life_time(node.parentNode.childNodes[0]))
        elif node.nodeType == node.TEXT_NODE:
            lines = [node.nodeValue]
            ordered_defs = sorted(defs.keys(), key=lambda x: len(x), reverse=True)
            for definition in ordered_defs:
                i = 0
                while i < len(lines):
                    line = lines[i]
                    while isinstance(line, basestring):
                        match = defs[definition].regex.search(line.lower())
                        if not match:
                            break
                        span = match.span(2)
                        lines[i:i + 1] = [line[:span[0]], create_def(line[span[0]:span[1]], defs[definition]), line[span[1]:]]
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

        if node.nodeType == node.ELEMENT_NODE:
            defs.expire_tag(node.tagName)


def find_all_definitions(tree):
    title = tree.xpath('./cover/title')[0].text
    nodes = tree.xpath(".//def-para[descendant::def-term]")
    definitions = Definitions()
    # todo, missing def-terms without def-para
    for node in nodes:
        keys = node.xpath('.//def-term')
        prov = node.iterancestors(tag='prov').next().xpath('./label')[0].text
        for key in keys:
            # super ugly hack to prevent placeholders like 'A'
            if len(key.text) > 1:
                clone = deepcopy(node)
                src = etree.Element('catalex-src')
                src.attrib['src'] = key.attrib.get('id')
                src.text = '%s Section %s' % (title, prov)
                clone.append(src)

                base = lmtzr.lemmatize(key.text.lower())
                if base not in definitions:
                    definitions[base] = Definition(full_word=key.text, xml=clone, regex=key_regex(base))
                if key.text.lower() not in definitions:
                    definitions[key.text.lower()] = Definition(full_word=key.text, xml=clone, regex=key_regex(base))
    return definitions


def render_definitions(definitions):
    return {v.id: v.render() for v in definitions.all()}


#todo rename
def process_definitions(tree, definitions):
    title = tree.xpath('./cover/title')[0].text
    domxml = minidom.parseString(etree.tostring(tree, encoding='UTF-8', method="html"))
    process_node(domxml, definitions, title)
    tree = etree.fromstring(domxml.toxml(), parser=etree.XMLParser(huge_tree=True))
    return tree, definitions


def insert_definitions(tree):
    interpretation = get_act_exact('Interpretation Act 1999')
    definitions = find_all_definitions(interpretation)
    tree, definitions = process_definitions(tree, definitions)
    return tree, render_definitions(definitions)
