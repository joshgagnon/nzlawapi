from db import get_db, get_act_exact
from util import tohtml
from nltk.stem import *
from lxml import etree

from nltk.stem.snowball import SnowballStemmer
from nltk.stem.wordnet import WordNetLemmatizer
from nltk.corpus import wordnet as wn
from xml.dom import minidom
from copy import deepcopy
from collections import namedtuple
import re

lmtzr = WordNetLemmatizer()


class Definition(namedtuple('Definition', ['full_word', 'xml', 'regex', 'id'])):

    def __new__(self, full_word, xml, regex, id=None):
        if not id:
            id = 'def-%s' % xml.xpath('.//def-term')[0].attrib['id']
        return self.__bases__[0].__new__(self, full_word, xml, regex, id)

    def render(self):
        return {
            'title': self.full_word,
            'html': etree.tostring(tohtml(self.xml, 'transform_def.xslt'), encoding='UTF-8', method="html")
            }

class Definitions(dict):
    others = []

    def __setitem__(self, key, val):
        if self.has_key(key):
            self.others.append((key, dict.__getitem__(self, key)))
        dict.__setitem__(self, key, val)

    def all(self):
        return dict.items(self) + self.others
    

def processNode(parent, defs):
    doc = parent.ownerDocument

    def create_def(word, definition):
        match = doc.createElement('catalex-def')
        match.setAttribute('def-id', definition.id)
        match.appendChild(doc.createTextNode(word))
        return match

    for node in parent.childNodes[:]: #better clone, as we will modify
        if node.nodeType == node.ELEMENT_NODE and node.tagName == 'def-para':
            key = node.getElementsByTagName('def-term')[0].childNodes[0].nodeValue
            if len(key) > 1:
                base = lmtzr.lemmatize(key.lower())
                defs[base] = Definition(full_word=key, xml=etree.fromstring(node.toxml()), regex=re.compile("%s[\w']*" % base, flags=re.I))
        elif node.nodeType==node.TEXT_NODE:
            lines = [node.nodeValue]
            ordered_defs = sorted(defs.keys(), key=lambda x: len(x), reverse=True)
            for definition in ordered_defs:
                i = 0
                while i < len(lines):
                    line = lines[i]
                    while isinstance(line, basestring) and defs[definition].regex.search(line.lower()):
                        span = defs[definition].regex.search(line.lower()).span()
                        lines[i:i+1] = [line[:span[0]], create_def(line[span[0]:span[1]], defs[definition]), line[span[1]:]]
                        i += 2
                        line = line[span[1]:]
                    i += 1
            lines = filter(lambda x:x, lines)
            new_nodes = map(lambda x: doc.createTextNode(x) if isinstance(x, basestring) else x, lines)

            if len(new_nodes) > 1:
                [parent.insertBefore(n, node) for n in new_nodes]
                parent.removeChild(node)
        else:
            processNode(node, defs)
            

def find_all_definitions(tree):
    nodes = tree.xpath(".//def-para[descendant::def-term]")
    results = Definitions()
    for node in nodes:
        keys = node.xpath('.//def-term')
        for key in keys:
            # super ugly hack to prevent placeholders like 'A'
            if len(key.text) > 1:
                base = lmtzr.lemmatize(key.text.lower())
                if base not in results:
                    results[base] = Definition(full_word=key.text, xml=node, regex=re.compile("%s[\w']*" % base, flags=re.I))
                if key.text.lower() not in results:
                    results[key.text.lower()] = Definition(full_word=key.text, xml=node, regex=re.compile("%s[\w']*" % key.text.lower(), flags=re.I))
    return results

def render_definitions(definitions):
    return {v.id: v.render() for k, v in definitions.all()}

def insert_definitions(tree):
    interpretation = get_act_exact('Interpretation Act 1999')
    definitions = find_all_definitions(interpretation)
    domxml = minidom.parseString(etree.tostring(tree, encoding='UTF-8', method="html"))
    processNode(domxml, definitions)
    tree = etree.fromstring(domxml.toxml(), parser=etree.XMLParser(huge_tree=True))
    return tree, render_definitions(definitions)

