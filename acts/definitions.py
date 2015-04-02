# -*- coding: utf-8 -*-
from util import tohtml, generate_path_string, node_replace, Monitor, remove_nbsp, safe_date
from lxml import etree
from nltk.stem.wordnet import WordNetLemmatizer
from pattern.en import pluralize, singularize
from xml.dom import minidom
from collections import defaultdict
from itertools import chain
import re
import os
import uuid
import json

lmtzr = WordNetLemmatizer()

"""
    naming conventions in http://www.lawfoundation.org.nz/style-guide/nzlsg_12.html#4.1.1
"""


def key_set(full_word):
    if singularize(full_word) == full_word:
        return (full_word, pluralize(full_word))
    else:
        return (singularize(full_word), full_word)


class Definition(object):

    def __init__(self, full_word,  id, document_id,  results=[], expiry_tag=None, priority=None, **kwargs):
        self.full_word = full_word
        self.keys = key_set(full_word)
        self.results = results
        self.priority = priority
        # id of first instance
        self.id = id
        self.ids = [id]
        self.document_id = document_id
        self.expiry_tag = expiry_tag

    def __eq__(self, other):
        return self.id == other.id

    def combine(self, other, external):
        if external or self.document_id != other.document_id:
            self.ids += [other.id]
            self.ids = list(set(self.ids))
        else:
            self.results += other.results

    def apply_definitions(self, dicttree):
        for result in self.results:
            if 'context_id' in result:
                result['context'] = etree.tostring(dicttree[result['context_id']], encoding='UTF-8', method="html")
                del result['context_id']

            if 'temp_id' in result:
                result['xml'] = etree.tostring(dicttree[result['temp_id']], encoding='UTF-8', method="html")
                del result['temp_id']

    def render(self):
        xml = etree.Element('catalex-def-para')
        for result in self.results:
            if 'context' in result:
                xml.append(etree.fromstring(result['context']))
            xml.append(etree.fromstring(result['xml']))
            if 'src' in result:
                xml.append(etree.fromstring(result['src']))
        html = etree.tostring(tohtml(xml, os.path.join('xslt', 'transform_def.xslt')), encoding='UTF-8', method="html")
        return {
            'full_word': self.full_word,
            'html': html,
            'expiry_tag': self.expiry_tag,
            'id': self.id,
            'keys': list(self.keys),
            'priority': self.priority
        }


class Definitions(object):
    use_life_cycle = True

    def __init__(self):
        self.pool = defaultdict(list)
        self.active = defaultdict(list)
        self.regex = None
        self.titles = []

    def get_active(self, key):
        keys = key_set(key)
        if keys in self.active:
            return self.active[keys][-1]
        # try lower
        keys = key_set(key.lower())
        if keys in self.active:
            return self.active[keys][-1]
        # remove possession
        keys = key_set(re.split("['`’]", key)[0])
        if keys in self.active:
            return self.active[keys][-1]
        raise KeyError

    def add(self, definition, external=False):
        for d in self.pool[definition.expiry_tag]:
            if d.full_word == definition.full_word:
                # same scope, must join together
                d.combine(definition, external)
                # todo, consider equivalent plurals etc
                return
        self.pool[definition.expiry_tag].append(definition)
        if not definition.expiry_tag:
            self.active[definition.keys].append(definition)

    def items(self):
        return list(chain.from_iterable(self.pool.values()))

    def enable_tag(self, tag):
        if tag in self.pool:
            for definition in self.pool[tag]:
                self.active[definition.keys].append(definition)
                self.regex = None

    def expire_tag(self, tag):
        if tag in self.pool:
            for definition in self.pool[tag]:
                self.active[definition.keys].remove(definition)
                if not len(self.active[definition.keys]):
                    del self.active[definition.keys]
                self.regex = None

    def ordered_defs(self):
        current = map(lambda x: x[-1], self.active.values())
        keys = []
        for c in current:
            keys += c.keys
        keys = list(set(keys))
        return sorted(keys, key=lambda x: len(x), reverse=True)

    def combined_reg(self):
        keys = u'|'.join([re.escape(y) for y in self.ordered_defs()])
        match_string = u"(^|\W)(%s[s'`’]{,2})($|\W)" % keys
        return re.compile(match_string, flags=re.I)

    def get_regex(self):
        if not self.regex:
            self.regex = self.combined_reg()
        return self.regex

    def render(self, document_id):
        return [d.render() for d in self.items() if d.document_id == document_id]

    def apply_definitions(self, tree):
        dicttree = {n.attrib['temp-def-id']: n for n in tree.xpath('.//*[@temp-def-id]')}
        for n in dicttree.values():
            del n.attrib['temp-def-id']
        for p in self.pool:
            for d in self.pool[p]:
                d.apply_definitions(dicttree)

    def __deepcopy__(self):
        newone = type(self)()
        newone.pool = self.pool.copy()
        newone.active = self.active.copy()
        return newone

    def to_json(self):
        return json.dumps({
            'values': self.pool.values(),
            'titles': self.titles},
            default=lambda o: o.__dict__)


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
        text = etree.tostring(parent.xpath('.//text')[0], method="text", encoding='UTF-8').strip().lower()
        if 'in an enactment passed or made before the commencement of this act' in text:
            return 'maxdate:%s' % node.getroottree().getroot().attrib.get('date.assent', '')
        if text.startswith('in this act') or text.startswith('in these regulations'):
            return None
        if text.startswith('in this part'):
            return get_id(parent.iterancestors('part').next())
        if text.startswith('in this subpart'):
            return get_id(parent.iterancestors('subpart').next())
        if text.startswith('in the formula'):
            return get_id(parent.iterancestors('prov').next())
        if 'in subsection' in text or 'of subsection' in text or 'in subclause' in text:
            # prov on purpose
            return get_id(parent.iterancestors('prov').next())
        if 'this section' in text or 'in this clause' in text:
            return get_id(parent.iterancestors('prov').next())
        if 'in schedule' in text or 'in this schedule' in text:
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
    return None


def find_all_definitions(tree, definitions, document_id, expire=True, title=None):
    nodes = tree.xpath(".//def-term[not(ancestor::skeletons)][not(ancestor::history)][not(ancestor::schedule.amendments)][not(ancestor::amend)]")

    def get_parent(node):
        try:
            return node.iterancestors('def-para').next()
        except StopIteration:
            return node.iterancestors('para').next()
    count = 0
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
                # used to flag for find later, when we insert def into db (must survive serializing)
                temp_id = parent.attrib.get('temp-def-id', str(uuid.uuid4()))
                parent.attrib['temp-def-id'] = temp_id

                src = etree.Element('catalex-src')
                node.attrib['id'] = node.attrib.get('id', str(uuid.uuid4()))
                src.attrib['src'] = node.attrib.get('id')
                src.attrib['link-id'] = '%d-%d' % (document_id, count)
                src.text, src.attrib['href'], _ = generate_path_string(node, title=title)
                src_id = src.attrib['src']
                src = etree.tostring(src, method="html", encoding="UTF-8")
                expiry_tag = infer_life_time(parent) if expire else None
                priority = None
                try:
                    context_parent = parent.iterancestors('para').next()
                    context = context_parent.xpath('./text')[0]
                    context_id = context.attrib.get('temp-def-id', str(uuid.uuid4()))
                    context.attrib['temp-def-id'] = context_id
                    result = {'context_id': context_id, 'temp_id': temp_id, 'src': src}
                except (StopIteration, IndexError):
                    result = {'temp_id': temp_id, 'src': src}

                definitions.add(Definition(full_word=text, results=[result],
                                id='%d-%s' % (document_id, src_id),
                                document_id=document_id, expiry_tag=expiry_tag, priority=priority))
                count += 1
        except StopIteration:
            pass


def process_definitions(tree, definitions):
    def create_def(doc, word, definition, index):
        match = doc.createElement('catalex-def')
        match.setAttribute('def-ids', ';'.join(definition.ids))
        match.setAttribute('def-idx', 'idx-%d-%d-%d' % (definition.document_id, monitor.i, index))
        match.appendChild(doc.createTextNode(word))
        return match
    monitor = Monitor(5000000)
    domxml = minidom.parseString(remove_nbsp(etree.tostring(tree, method="html")))
    domxml = node_replace(domxml, definitions, create_def, lower=False, monitor=monitor)
    tree = etree.fromstring(domxml.toxml(), parser=etree.XMLParser(huge_tree=True))
    definitions.apply_definitions(tree)
    return tree, definitions


def populate_definitions(tree, document_id, definitions=None, expire=True, title=None):
    if not definitions:
        definitions = Definitions()
    if title not in definitions.titles:
        find_all_definitions(tree, definitions, expire=expire, title=title, document_id=document_id)
        definitions.titles.append(title)
    return tree, definitions
