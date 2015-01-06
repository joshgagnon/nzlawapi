from db import get_db, get_act_exact
from util import tohtml
from nltk.stem import *
from lxml import etree

from nltk.stem.snowball import SnowballStemmer
from nltk.stem.wordnet import WordNetLemmatizer
from nltk.corpus import wordnet as wn
from xml.dom import minidom
from copy import deepcopy
import re

ws_split = re.compile(r'\s+', re.U).split

def processNode(parent, defs):
    doc = parent.ownerDocument
    for node in parent.childNodes[:]: #better clone, as we will modify
        if node.nodeType == node.ELEMENT_NODE and node.tagName == 'def-para':
            key = node.getElementsByTagName('def-term')[0].childNodes[0].nodeValue.lower()
            if len(key) > 1:
                base = lmtzr.lemmatize(key)
                html = etree.tostring(
                        tohtml(etree.fromstring(node.toxml()), 
                            'transform_def.xslt'), encoding='UTF-8', method="html")
                defs[base] = {'key': key, 'definition': html}
        elif node.nodeType==node.TEXT_NODE:
            ordered_defs = sorted(defs.keys(), key=lambda x: len(x), reverse=True)
            lines = [node.nodeValue]
            for definition in ordered_defs:
                for line in lines[:]:
                    if not isinstance(line, basestring):
                        continue
                    hits = [m.start() for m in re.finditer(definition, line, flags=re.I)]
                    if len(hits)
                        print definition, line
        else:
            processNode(node, defs)
            

lmtzr = WordNetLemmatizer()

def find_all_definitions(tree):
    nodes = tree.xpath(".//def-para[descendant::def-term]")
    results = {}
    for node in nodes:
        keys = node.xpath('.//def-term')
        for key in keys:
            # super ugly hack to prevent placeholders like 'A'
            if len(key.text) > 1:
                base = lmtzr.lemmatize(key.text.lower())
                html = etree.tostring(tohtml(node, 'transform_def.xslt'), encoding='UTF-8', method="html")

                if base not in results:
                    results[base] = {'key': key.text, 'definition': html}
                if key.text.lower() not in results:
                    results[key.text.lower()] = {'key': key.text, 'definition': html}
    return results

def insert_definitions(tree):
    interpretation = get_act_exact('Interpretation Act 1999')
    definitions = find_all_definitions(interpretation)
    domxml = minidom.parseString(etree.tostring(tree, encoding='UTF-8', method="html"))
    processNode(domxml, definitions)
    tree = etree.fromstring(domxml.toxml())
    """for el in list(tree.iter(tag=etree.Element)):
        #todo update defintions as they are traversed
        if el.text: # and tail
            intersects = [key for key in keys if key in el.text]
            print intersects
            for intersect in intersects:
                sub = etree.SubElement(el, "catalex-def")
    """
    return tree

