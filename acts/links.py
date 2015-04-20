# -*- coding: utf-8 -*-
import re
from xml.dom import minidom
from db import get_db
from util import Monitor, node_replace, MatchError, remove_nbsp
from lxml import etree


def get_links(db=None):
    class InstrumentLink(object):
        use_life_cycle = False

        def __init__(self):
            self.active = {}
            self.regex = None

        def add(self, title, id):
            self.active[unicode(title.decode('utf-8'))] = {'id': id, 'title': title}

        def ordered(self):
            return sorted(self.active.keys(), key=lambda x: len(x), reverse=True)

        def combined_reg(self):
            match_string = u"(^|\W)(%s)($|\W)" % u"|".join(map(lambda x: re.escape(x), self.ordered()))
            return re.compile(match_string, flags=re.I & re.UNICODE)

        def get_regex(self):
            if not self.regex:
                self.regex = self.combined_reg()
            return self.regex

        def get_active(self, key):
            if key not in self.active:
                raise MatchError()
            return self.active[key]

    query = """ select title, id from latest_instruments """

    with (db or get_db()).cursor() as cur:
        cur.execute(query)
        results = cur.fetchall()
        links = InstrumentLink()
        map(lambda x: links.add(x[0], x[1]), results)

    return links


def process_instrument_links(tree, db=None, links=None):
    links = links or get_links(db)
    mon = Monitor()
    for a in tree.xpath('.//*[@href]'):
        a.attrib['link-id'] = '%d' % mon.i
        mon.cont()

    def create_link(doc, word, result, index):
        match = doc.createElement('cataref')
        match.setAttribute('href', 'instrument/%s' % result['id'])
        match.setAttribute('target-id', '%s' % result['id'])
        match.setAttribute('link-id', '%s' % mon.i)
        match.appendChild(doc.createTextNode(word))
        return match

    domxml = minidom.parseString(remove_nbsp(etree.tostring(tree, method="html", encoding="UTF-8")))
    domxml = node_replace(domxml, links, create_link, monitor=mon)
    tree = etree.fromstring(domxml.toxml(), parser=etree.XMLParser(huge_tree=True))
    domxml.unlink()

    # next find every link to this doc, replace links
    return tree
