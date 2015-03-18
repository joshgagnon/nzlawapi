# -*- coding: utf-8 -*-
from util import tohtml, generate_path_string, node_replace, Monitor
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

    def __init__(self, full_word, key, xmls, regex, id, expiry_tag=None):
        id = 'def-%s' % id
        self.full_word = full_word
        self.key = key
        self.xmls = xmls
        self.regex = regex
        self.id = id
        self.expiry_tag = expiry_tag

    def __eq__(self, other):
        return self.id == other.id

    def combine(self, other):
        self.xmls += other.xmls

    def apply_definitions(self, dicttree):
        for i, x in enumerate(self.xmls):
            if isinstance(x, str):
                self.xmls[i] = dicttree[x]

    def render(self):
        xml = etree.Element('catalex-def-para')
        [xml.append(deepcopy(x)) for x in self.xmls]
        return {
            'title': self.full_word,
            'html': etree.tostring(tohtml(xml, os.path.join('xslt', 'transform_def.xslt')), encoding='UTF-8', method="html")
        }


class Definitions(object):
    use_life_cycle = True

    def __init__(self):
        self.pool = defaultdict(list)
        self.active = defaultdict(list)
        self.regex = None

    def get_active(self, key):
        fix_key = lmtzr.lemmatize(key)
        if fix_key in self.active:
            return self.active[fix_key][-1]
        elif key in self.active:
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
        keys = map(lambda x:  re.escape(x.key), self.ordered_defs())
        match_string = u"(^|\W)(%s)([es'’]{,3})($|\W)" % '|'.join(keys)
        return re.compile(match_string, flags=re.I)

    def get_regex(self):
        if not self.regex:
            self.regex = self.combined_reg()
        return self.regex

    def render(self):
        return {v.id: v.render() for v in self.items()}

    def apply_definitions(self, tree):
        dicttree = {n.attrib['temp-def-id']: n for n in tree.xpath('.//*[@temp-def-id]')}
        for p in self.pool:
            for d in self.pool[p]:
                d.apply_definitions(dicttree)

    def __deepcopy__(self):
        newone = type(self)()
        newone.pool = self.pool.copy()
        newone.active = self.active.copy()
        return newone


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
        if text.startswith('in this act') or text.startswith('in these regulations'):
            return get_id(parent.iterancestors('act', 'regulation', 'bill', 'sop').next())
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
        if 'in schedule' in text or 'in this schedule':
            return get_id(parent.iterancestors('schedule').next())

        if 'in this subpart' in text:
            return get_id(parent.iterancestors('subpart').next())
        if 'in this part' in text:
            return get_id(parent.iterancestors('part').next())

    except (AttributeError, IndexError), e:
        print 'infer life error', e
    except StopIteration:
        # couldn't find safe parent
        pass
    return get_id(parent.iterancestors('act', 'regulation', 'sop', 'bill').next())



def find_all_definitions(tree, definitions, expire=True):
    nodes = tree.xpath(".//def-term[not(ancestor::skeletons)][not(ancestor::history)][not(ancestor::schedule.amendments)]")

    def get_parent(node):
        try:
            return node.iterancestors('def-para').next()
        except StopIteration:
            return node.iterancestors('para').next()

    for node in nodes:
        # super ugly hack to prevent placeholders likept 'A'
        try:
            text = re.sub('[][()]', '', node.itertext().next())
            if len(text) > 1:
                # another hack:  if you are in a  label-para which is in a def-para, you aren't the primary definition
                try:
                    node.iterancestors('label-para').next().iterancestors('def-para').next()
                except StopIteration:
                    pass
                else:
                    continue
                parent = get_parent(node)
                temp_id = parent.attrib.get('temp-def-id', str(uuid.uuid4()))
                parent.attrib['temp-def-id'] = temp_id

                src = etree.Element('catalex-src')
                # todo tricky rules
                src.attrib['src'] = node.attrib.get('id') or str(uuid.uuid4())
                src.text, src.attrib['href'], _ = generate_path_string(node)

                base = lmtzr.lemmatize(text.lower())
                expiry_tag = infer_life_time(parent) if expire else None
                definitions.add(Definition(full_word=text, key=base, xmls=[temp_id, src],
                                id=src.attrib['src'], regex=key_regex(base), expiry_tag=expiry_tag))
        except StopIteration:
            pass


def process_definitions(tree, definitions):
    find_all_definitions(tree, definitions, expire=True)
    print 'Completed definition extraction'
    print '%d nodes to scan' % len(tree.xpath('.//*'))

    def create_def(doc, word, definition, index):
        match = doc.createElement('catalex-def')
        match.setAttribute('def-id', definition.id)
        match.setAttribute('def-idx', 'idx-%d-%d' % (monitor.i, index))
        match.appendChild(doc.createTextNode(word))
        return match

    monitor = Monitor(500000)
    domxml = minidom.parseString(etree.tostring(tree, encoding='UTF-8', method="html"))
    domxml = node_replace(domxml, definitions, create_def, lower=True, monitor=monitor)
    tree = etree.fromstring(domxml.toxml(), parser=etree.XMLParser(huge_tree=True))
    definitions.apply_definitions(tree)

    return tree, definitions


def populate_definitions(tree, definitions=None, expire=False):
    if not definitions:
        definitions = Definitions()
    find_all_definitions(tree, definitions, expire=expire)
    definitions.apply_definitions(tree)
    return tree, definitions
