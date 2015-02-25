# -*- coding: utf-8 -*-
from db import get_db
from util import CustomException, tohtml, etree_to_dict, get_title, node_replace, MatchError, Monitor
from definitions import populate_definitions, process_definitions, Definitions
from traversal import cull_tree, find_definitions, find_part_node, find_section_node, \
    find_schedule_node, find_node_by_query, find_node_by_govt_id, find_document_id_by_govt_id, \
    find_node_by_location, limit_tree_size
from lxml import etree
from copy import deepcopy
from flask import current_app, render_template
from psycopg2 import extras
from xml.dom import minidom
import json
import os
import datetime
import re
import psycopg2

class Act(object):
    def __init__(self, id, tree, attributes):
        self.id = id
        self.tree = tree

        self.title = get_title(self.tree)
        self.hook_match = '/*/*/*/*/*'
        self.parts = {}
        ignore = ['document', 'processed_document', 'attributes']
        self.attributes = dict(((k, v) for k, v in attributes.items() if k not in ignore and v))
        self.format_dates()

    def format_dates(self):
        try:
            assent_date = datetime.datetime.strptime(self.tree.attrib['date.assent'], "%Y-%m-%d").date()
            self.tree.attrib['formatted.assent'] = assent_date.strftime('%d %B %Y')
        except:
            pass
        try:
            reprint_date = datetime.datetime.strptime(self.tree.xpath('.//reprint-date')[0].text, "%Y-%m-%d").date()
            self.tree.attrib['formatted.reprint'] = reprint_date.strftime('%d %B %Y')
        except:
            pass

    def calculate_hooks(self):
        html = tohtml(self.tree)
        i = 0
        for e in html.xpath(self.hook_match):
            length = len(etree.tostring(e))
            if length > 1000:
                e.attrib['data-hook'] = '%d' % i
                e.attrib['data-hook-length'] = '%d' % length
                self.parts[e.attrib['data-hook']] = deepcopy(e)
                e[:] = []
                i += 1
        self.skeleton = etree_to_dict(html.getroot())

    def select(self, requested):
        return [self.parts[i] for i in requested]


def get_act_summary(doc_id, db=None):
    with (db or get_db()).cursor(cursor_factory=extras.RealDictCursor) as cur:
        query = """select * from instruments
        where id = %(doc_id)s """
        cur.execute(query, {'doc_id': doc_id})
        try:
            return cur.fetchone()
        except:
            raise CustomException("Instrument not found")


def get_act_summary_govt_id(govt_id, db=None):
    with (db or get_db()).cursor(cursor_factory=extras.RealDictCursor) as cur:
        query = """select *
            from id_lookup d
            join instruments i on parent_id = id
            where d.govt_id = %(govt_id)s"""
        cur.execute(query, {'govt_id': govt_id})
        try:
            return cur.fetchone()
        except:
            raise CustomException("Instrument not found")


def get_act_exact(title=None, doc_id=None, db=None):
    with (db or get_db()).cursor() as cur:
        query = """
            select document from latest_instruments
            where (%(title)s is  null or title = %(title)s) and (%(id)s is null or id =  %(id)s)
             """
        cur.execute(query, {'title': title, 'id': doc_id})
        try:
            result = cur.fetchone()
            return etree.fromstring(result[0])
        except:
            raise CustomException("Instrument not found")


def get_references(document_id):
    db = get_db()
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT d.source_id as id, title, count, type FROM document_references d
            LEFT OUTER JOIN instruments i on i.id = d.source_id
            LEFT OUTER JOIN cases c on c.id = d.source_id
            WHERE target_id = %(id)s
            ORDER BY count DESC
            """, {'id': document_id})
        return {'references': map(lambda x: dict(x), cur.fetchall())}


def get_section_references(govt_ids):
    db = get_db()
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT source_document_id, repr, url
            FROM section_references  d
            WHERE target_govt_id = ANY(%(govt_ids)s)
            """, {'govt_ids': govt_ids})
        return {'section_references': map(lambda x: dict(x), cur.fetchall())}


def get_versions(document_id):
    db = get_db()
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
                select i.title, i.id, i.date_as_at, i.type from
                    (select id, govt_id from instruments) as s
                    join instruments i on i.govt_id = s.govt_id
                    where s.id = %(id)s order by i.date_as_at desc
            """, {'id': document_id})
        return {'versions': map(lambda x: dict(x), cur.fetchall())}


def process_act_links(tree, db=None):
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
            return re.compile(match_string, flags=re.I)

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

    def create_link(doc, word, result, index):
        match = doc.createElement('cataref')
        match.setAttribute('href', 'instrument/%s' % result['id'])
        match.setAttribute('target-id', '%s' % result['id'])
        match.setAttribute('link-id', '%s' % mon.i)
        match.appendChild(doc.createTextNode(word))
        return match
    mon = Monitor()
    for a in tree.xpath('.//*[@href]'):
        a.attrib['link-id'] = '%d' % mon.i
        mon.cont()
    domxml = minidom.parseString(etree.tostring(tree, encoding='UTF-8', method="html"))
    domxml = node_replace(domxml, links, create_link, monitor=mon)
    tree = etree.fromstring(domxml.toxml(), parser=etree.XMLParser(huge_tree=True))
    return tree


def update_definitions(row, db=None):
    tree = etree.fromstring(row.get('document'))
    if row.get('title') != 'Interpretation Act 1999':
        _, definitions = populate_definitions(get_act_exact('Interpretation Act 1999', db=db))
    else:
        definitions = Definitions()
    tree = process_act_links(tree, db)
    tree, definitions = process_definitions(tree, definitions)
    with (db or get_db()).cursor() as cur:
        query = """UPDATE documents d SET processed_document =  %(doc)s
                    FROM instruments s
                    WHERE d.id = s.id and  (%(id)s is null or d.id =  %(id)s) returning d.id"""
        cur.execute(query, {
            'id': row.get('id'),
            'doc': etree.tostring(tree, encoding='UTF-8', method="html"),
        })
        id = cur.fetchone()[0]
        args_str = ','.join(cur.mogrify("(%s,%s,%s)", (id, x[0], json.dumps(x[1]))) for x in definitions.render().items())
        cur.execute("DELETE FROM definitions where document_id = %(id)s", {'id': id})
        cur.execute("INSERT INTO definitions (document_id, key, data) VALUES " + args_str)
        (db or get_db()).commit()
    return tree, definitions.render()


def prep_instrument(result, replace, db):
    if not result.get('id'):
        raise CustomException('Instrument not found')
    if replace or not result.get('processed_document'):
        tree, _ = update_definitions(row=result, db=db)
    else:
        tree = etree.fromstring(result.get('processed_document'))

    return Act(id=result.get('id'), tree=tree, attributes=dict(result))


def get_instrument_object(id=None, db=None, replace=False):
    with (db or get_db()).cursor(cursor_factory=extras.RealDictCursor) as cur:
        query = """SELECT *, exists(select 1 from latest_instruments where id=%(id)s) as latest FROM instruments i
                JOIN documents d on d.id = i.id
                where i.id =  %(id)s
            """
        cur.execute(query, {'id': id})
        return prep_instrument(cur.fetchone(), replace, db)


def get_latest_instrument_object(instrument_name=None, id=None, db=None, replace=False):
    with (db or get_db()).cursor(cursor_factory=extras.RealDictCursor) as cur:
        query = """SELECT *, true as latest FROM latest_instruments i
                JOIN documents d on d.id = i.id
                where (%(instrument_name)s is null or title= %(instrument_name)s) and (%(id)s is null or i.id =  %(id)s)
            """
        cur.execute(query, {'instrument_name': instrument_name, 'id': id})
        return prep_instrument(cur.fetchone(), replace, db)



def act_skeleton_response(act):
    act.calculate_hooks()
    return {
        'skeleton': act.skeleton,
        'html_contents_page': etree.tostring(tohtml(act.tree, os.path.join('xslt', 'contents.xslt')), encoding='UTF-8', method="html"),
        'title': act.title,
        'attributes': act.attributes,
        'parts': [],
        'document_id': act.id,
        'doc_type': 'instrument',
        'partial': True
    }


def get_instrument_summary(doc_type=None, key=None):
    if key.startswith('DLM'):
        return instrument_summary(get_act_summary_govt_id(key), 'govt_id', key)
    else:
        return instrument_summary(get_act_summary(key), 'id', key)


def get_act_node_by_id(node_id):
    fragment = False
    if node_id.startswith('D'):
        id = find_document_id_by_govt_id(node_id)
    else:
        id = node_id
    act = get_act_object(id=id,
                         replace=current_app.config.get('REPROCESS_DOCS'))
    """ if the node is root, just get cover """
    if node_id == id:
        pass
    elif act.tree.attrib['id'] == node_id:
        act.tree = cull_tree(act.tree.xpath('.//cover'))
    else:
        fragment = True
        act.tree = cull_tree(act.tree.xpath('.//*[@id="' + node_id + '"]'))
    return act_response(act, fragment)


def instrument_full(instrument):
    return {
        'html_content': etree.tostring(tohtml(instrument.tree), encoding='UTF-8', method="html"),
        'html_contents_page': etree.tostring(tohtml(instrument.tree, os.path.join('xslt', 'contents.xslt')), encoding='UTF-8', method="html"),
        'title': instrument.title,
        'document_id': instrument.id,
        'doc_type': 'instrument',
        'attributes': instrument.attributes,
        'format': 'full',
        'query': {
            'doc_type': 'instrument',
            'document_id': instrument.id,
            'find': 'full'
        }
    }


def instrument_preview(instrument):
    preview = limit_tree_size(instrument.tree)
    return {
        'html_content': etree.tostring(tohtml(preview), encoding='UTF-8', method="html"),
        'title': instrument.title,
        'document_id': instrument.id,
        'doc_type': 'instrument',
        'attributes': instrument.attributes,
        'format': 'preview',
        'query': {
            'doc_type': 'instrument',
            'document_id': instrument.id,
            'find': 'preview'
        }
    }


def instrument_location(instrument, location):
    tree = cull_tree(find_node_by_location(instrument.tree, location))
    return {
        'html_content': etree.tostring(tohtml(tree), encoding='UTF-8', method="html"),
        'html_contents_page': etree.tostring(tohtml(tree, os.path.join('xslt', 'contents.xslt')), encoding='UTF-8', method="html"),
        'title': instrument.title,
        'document_id': instrument.id,
        'doc_type': 'instrument',
        'attributes': instrument.attributes,
        'format': 'fragment',
        'query': {
            'doc_type': 'instrument',
            'document_id': instrument.id,
            'find': 'location',
            'location': location
        }
    }
def instrument_govt_location(instrument, id):
    tree = cull_tree(find_node_by_govt_id(instrument.tree, id))
    return {
        'html_content': etree.tostring(tohtml(tree), encoding='UTF-8', method="html"),
        'html_contents_page': etree.tostring(tohtml(tree, os.path.join('xslt', 'contents.xslt')), encoding='UTF-8', method="html"),
        'title': instrument.title,
        'document_id': instrument.id,
        'doc_type': 'instrument',
        'attributes': instrument.attributes,
        'format': 'fragment',
        'query': {
            'doc_type': 'instrument',
            'document_id': instrument.id,
            'find': 'govt_location',
            'govt_location': id
        }
    }

def instrument_more(instrument, parts):
    act_part_response(instrument, parts)
    return {}


def query_instrument(args):
    find = args.get('find')
    if args.get('id'):
        id = args.get('id')
        if id.startswith('DLM'):
            govt_id = id
            id = find_document_id_by_govt_id(id)
            instrument = get_instrument_object(
                id,
                replace=current_app.config.get('REPROCESS_DOCS'))
            if instrument.attributes['govt_id'] != govt_id:
                find = 'govt_location'
                govt_location = govt_id
        else:
            instrument = get_instrument_object(
                id,
                replace=current_app.config.get('REPROCESS_DOCS'))
    elif args.get('title'):
        instrument = get_latest_instrument_object(
            args.get('title'),
            replace=current_app.config.get('REPROCESS_DOCS'))
    else:
        raise CustomException('No instrument specified')

    if find == 'preview':
        return instrument_preview(instrument)
    elif find == 'more':
        return instrument_more(instrument, args.getlist('requested_parts[]'))
    elif find == 'location':
        if not args.get('location'):
            raise CustomException('No location specified')
        return instrument_location(instrument, args.get('location'))
    elif find == 'govt_location':
        if not govt_location:
            raise CustomException('No location specified')
        return instrument_govt_location(instrument, govt_location)
    # default is full
    return instrument_full(instrument)


"""
    fragment = True
    if find == 'full':
        fragment = False
    elif find == "more":
        return act_part_response(act, args.getlist('requested_parts[]'))
    else:
        query = args.get('query')
        if not query:
            raise CustomException('Query missing')
        elif find == 'location':
            act.tree = find_node_by_location(act.tree, query)
        elif find == 'govt_id':
            act.tree = find_node_by_govt_id(act.tree, query)
        else:
            raise CustomException('Invalid search type')
        act.tree = cull_tree(act.tree)
    return act_response(act, fragment)

"""
def query_acts(args):
    return []
    search_type = args.get('find')
    query = args.get('query')
    if search_type == 'id' or search_type == 'govt_id':
        return get_act_node_by_id(query)
    if search_type == 'contains':
        #result = act_full_search(query)
        raise CustomException('Not Implemented')
    elif search_type == 'definitions':
        raise CustomException('Not Implemented')
    else:
        raise CustomException('Invalid search type')
    return []
