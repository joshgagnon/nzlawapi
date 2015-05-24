# -*- coding: utf-8 -*-
from util import tohtml, generate_path_string, node_replace, Monitor, remove_nbsp
from lxml import etree
from pattern.en import pluralize, singularize
from nltk.stem.wordnet import WordNetLemmatizer
from xml.dom import minidom
from collections import defaultdict
from traversal import decide_govt_or_path
import re
import os
import uuid
import json

lmtzr = WordNetLemmatizer()

"""
    naming conventions in http://www.lawfoundation.org.nz/style-guide/nzlsg_12.html#4.1.1
"""


def key_set(full_word):
    words = []
    # hack for class etc
    if singularize(full_word) == full_word or full_word.endswith('ss'):
        plural = pluralize(full_word)
        words = [full_word, plural]
    else:
        words = [singularize(full_word), full_word, pluralize(singularize(full_word))]

    for w in words[:]:
        # if not already plural like
        if not w.endswith('s'):
            suffix = 's'
            if any([w.endswith(suf) for suf in ['x', 'z', 'ch', 'sh']]):
                suffix = 'es'
            words.append('%s%s' % (w, suffix))
    tup = tuple(sorted(list(set(words))))
    return tup


class Definition(object):

    def __init__(self, full_word, id, document_id, results=[], expiry_tags=[], priority=None, exclusive=False, **kwargs):
        self.full_word = full_word
        self.keys = key_set(full_word)
        self.results = results
        self.priority = priority
        # id of first instance
        self.id = id
        self.ids = [id]
        self.document_id = document_id
        self.exclusive = exclusive
        self.expiry_tags = expiry_tags
        if not self.expiry_tags or not len(self.expiry_tags):
            self.expiry_tags = ['root']

    def __eq__(self, other):
        return self.id == other.id

    def combine(self, other, external):
        if external or self.document_id != other.document_id:
            self.ids += [other.id]
            self.ids = list(set(self.ids))
        else:
            # prioritize
            if self.priority > other.priority:
                self.results += other.results
            else:
                self.results = other.results + self.results
                self.priority = other.priority

    def apply_definitions(self, dicttree):
        for result in self.results:
            if 'context_id' in result:
                result['context'] = '<para><text>%s</text></para>' % etree.tostring(dicttree[result['context_id']], encoding='UTF-8', method="html")
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
            'expiry_tags': self.expiry_tags,
            'id': self.id,
            'keys': list(self.keys),
            'priority': self.priority
        }


class Definitions(object):
    use_life_cycle = True

    def __init__(self):
        self.pool = []
        self.tag_pool = defaultdict(list)
        self.active = defaultdict(list)
        self.regex = None
        self.titles = []

    def get_active(self, key):
        keys = key_set(key)
        if keys in self.active:
            return self.active[keys][::-1]
        # try lower
        keys = key_set(key.lower())
        if keys in self.active:
            return self.active[keys][::-1]
        # if more than one word, try lowering the first letter
        if len(key.split()) > 1:
            keys = key_set(key[0].lower() + key[1:])
            if keys in self.active:
                return self.active[keys][::-1]
        # remove possession
        keys = key_set(re.split("['`’]", key)[0])
        if keys in self.active:
            return self.active[keys][::-1]
        raise KeyError

    def add(self, definition, external=False):
        # will remove expiry_tag collisions
        """for tag in definition.expiry_tags[:]:
            for d in self.tag_pool[tag]:
                if d.full_word == definition.full_word:
                    # same scope, must join together
                    d.combine(definition, external)
                    definition.expiry_tags.remove(tag)
                    break"""
                    # todo, consider equivalent plurals etc

        # if there are any tags left, then add to pool
        if len(definition.expiry_tags):
            self.pool.append(definition)
            for tag in definition.expiry_tags:
                self.tag_pool[tag].append(definition)
            # if root, then enable immediately
            if 'root' in definition.expiry_tags:
                self.active[definition.keys].append(definition)

    def items(self):
        return self.pool

    def enable_tag(self, tag):
        if tag in self.tag_pool:
            for definition in self.tag_pool[tag]:
                self.active[definition.keys].append(definition)
                self.regex = None

    def expire_tag(self, tag):
        if tag in self.tag_pool:
            for definition in self.tag_pool[tag]:
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
            p.apply_definitions(dicttree)

    def __deepcopy__(self):
        newone = type(self)()
        newone.pool = self.pool[:]
        newone.tag_pool = self.tag_pool.copy()
        newone.active = self.active.copy()
        return newone

    def to_json(self):
        return json.dumps({
            'values': self.pool,
            'titles': self.titles},
            default=lambda o: o.__dict__)


def infer_life_time(node):
    default_priority = 0
    high_priority = 50
    highest_priority = 100

    try:
        parent = node
        try:
            parent = node.iterancestors('para').next()
        except StopIteration:
            pass

        context_text = etree.tostring(parent.xpath('.//text')[0], method="text", encoding='UTF-8').strip().lower()
        node_text = etree.tostring(node, method="text", encoding='UTF-8').strip().lower()

        def life(parent, text):

            def get_id(node):
                if not node.attrib.get('id'):
                    node.attrib['id'] = str(uuid.uuid4())
                return node.attrib.get('id')

            """ the common starts with clauses """
            if 'in an enactment passed or made before the commencement of this act' in text:
                return ['maxdate:%s' % node.getroottree().getroot().attrib.get('date.assent', '')], default_priority
            if text.startswith('in an enactment'):
                return ['root'], highest_priority
            if text.startswith('in this act') or text.startswith('in these regulations'):
                return ['root'], high_priority
            if text.startswith('in this part'):
                return [get_id(parent.iterancestors('part').next())], default_priority
            if text.startswith('in this subpart'):
                return [get_id(parent.iterancestors('subpart').next())], default_priority
            if text.startswith('in the formula'):
                return [get_id(parent.iterancestors('prov').next())], default_priority

            """ targetted life times """
            if 'for the purposes of' in text or 'in sections' in text or 'in clauses':
                # get first intref or link and continue until another tag is encountered
                tags = []
                for el in parent.iterdescendants():
                    if el.tag in ['citation', 'text']:
                        continue
                    if el.tag in ['intref', 'link']:
                        # complex link, try to parse it
                        govt_id = el.attrib.get('href')
                        if not govt_id and len(el.xpath('resourcepair')):
                            govt_id = el.xpath('resourcepair')[0].attrib.get('targetXmlId')
                        link_text = etree.tostring(el, method="text", encoding="UTF-8")
                        if link_text and any(q in link_text for q in [', ', ' to ', ' and ']):
                            # get nodes that match text
                            nodes = decide_govt_or_path(node.getroottree(), govt_id, link_text)
                            # find closes ids
                            for n in nodes:
                                # doesn't look safe, but there MUST be an id in there somewhere
                                while not n.attrib.get('id'):
                                    n = n.getparent()
                                tags.append(n.attrib['id'])
                        else:
                            tags.append(govt_id)
                    else:
                        break


            """ parent based life times """
            if 'in subsection' in text or 'of subsection' in text or 'in subclause' in text:
                # prov on purpose, no ids on subprov. so not perfect, but should be close enough
                tags += [get_id(parent.iterancestors('prov').next())]
            if 'this section' in text or 'in this clause' in text:
                tags += [get_id(parent.iterancestors('prov').next())]
            if 'in schedule' in text or 'in this schedule' in text:
                tags += [get_id(parent.iterancestors('schedule').next())]
            if 'in this subpart' in text or 'purposes of this subpart' in text:
                tags += [get_id(parent.iterancestors('subpart').next())]
            if 'in this part' in text or 'purposes of this part' in text:
                tags += [get_id(parent.iterancestors('part', 'head1').next())]

            if not len(tags):
                tags = ['root']
            return tags, default_priority


        def exclusivity(text):
            # very rough
            if re.search('\Wmeans\W', text):
                return True
            return False

        tags, priority = life(parent, context_text)

        exclusive = exclusivity(node_text)
        return tags, priority, exclusive


    except (AttributeError, IndexError), e:
        pass
    except StopIteration:
        # couldn't find safe parent
        pass
    return ['root'], default_priority, False


def find_all_definitions(tree, definitions, document_id, expire=True, title=None):
    nodes = tree.xpath(".//def-term[not(ancestor::skeletons)][not(ancestor::history)][not(ancestor::table)][not(ancestor::amend)][not(ancestor::schedule.amendments)]")

    def get_parent(node):
        try:
            return node.iterancestors('def-para').next()
        except StopIteration:
            return node.iterancestors('para').next()
    count = 0
    for node in nodes:
        try:
            # super ugly hack to prevent placeholders likept 'A'
            text = re.sub('[][()]', '', node.itertext().next())


            # now if the preceeding text is a bracket, ignore this
            try:
                if (node.xpath('preceding::text()[1]')[-1][-1] == '(' and
                    node.xpath('following::text()[1]')[0][0] == ')'):
                    continue
            except IndexError:
                pass
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
                src.attrib['target-id'] = '%d' % document_id
                src.attrib['link-id'] = '%d-%d' % (document_id, count)
                src.text, src.attrib['href'], location = generate_path_string(node, title=title)
                src.attrib['location'] = location
                src_id = src.attrib['src']
                src = etree.tostring(src, method="html", encoding="UTF-8")
                if expire:
                    expiry_tags, priority, exclusive = infer_life_time(parent)
                else:
                    expiry_tags, priority, exclusive = ['root'], 100, False
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
                                document_id=document_id, expiry_tags=expiry_tags,
                                priority=priority, exclusive=exclusive))
                count += 1

        except StopIteration:
            pass


def process_definitions(tree, definitions):
    def create_def(doc, word, definitions, index):
        match = doc.createElement('catalex-def')
        ids = []
        extra_ids = []
        extra = False
        for d in definitions:
            ids.append(d.id) if not extra else extra_ids.append(d.id)
            if d.exclusive:
                extra = True
        match.setAttribute('def-ids', ';'.join(ids))
        if len(extra_ids):
            match.setAttribute('def-ex-ids', ';'.join(extra_ids))
        match.setAttribute('def-idx', 'idx-%d-%d-%d' % (definitions[0].document_id, monitor.i, index))
        match.appendChild(doc.createTextNode(word))
        return match
    monitor = Monitor(5000000)
    domxml = minidom.parseString(remove_nbsp(etree.tostring(tree, method="html")))
    domxml = node_replace(domxml, definitions, create_def, lower=False, monitor=monitor)
    tree = etree.fromstring(domxml.toxml(), parser=etree.XMLParser(huge_tree=True))
    domxml.unlink()
    definitions.apply_definitions(tree)
    return tree, definitions


def populate_definitions(tree, document_id, definitions=None, expire=True, title=None):
    if not definitions:
        definitions = Definitions()
    if title not in definitions.titles:
        find_all_definitions(tree, definitions, expire=expire, title=title, document_id=document_id)
        definitions.titles.append(title)
    return tree, definitions
