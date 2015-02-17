from db import get_db
from util import CustomException, tohtml, etree_to_dict, get_title
from definitions import populate_definitions, process_definitions, Definitions
from traversal import cull_tree, find_definitions, find_part_node, find_section_node, \
    find_schedule_node, find_node_by_query, find_node_by_govt_id, find_document_id_by_govt_id, find_node_by_location
from lxml import etree
from copy import deepcopy
from psycopg2 import extras
import json
import os
import datetime


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


def get_act(act, db=None):
    with (db or get_db()).cursor() as cur:
        query = """select document from latest_instruments where
        where lower(replace(title, ' ', '')) = lower(%(act)s) """
        cur.execute(query, {'act': act})
        try:
            return etree.fromstring(cur.fetchone()[0])
        except:
            raise CustomException("Act not found")


def get_act_exact(act, id=None, db=None):
    with (db or get_db()).cursor() as cur:
        query = """
            select document from latest_instruments
            where (%(act)s is  null or title = %(act)s) and (%(id)s is null or id =  %(id)s)
             """
        cur.execute(query, {'act': act, 'id': id})
        try:
            result = cur.fetchone()
            return etree.fromstring(result[0])
        except:
            raise CustomException("Act not found")


import re
from xml.dom import minidom
#TODO finish, move to utils
def process_act_links(tree, db=None):
    return tree
    with (db or get_db()).cursor() as cur:
        query = """
            SELECT title, source_id FROM
                acts WHERE latest_version = True
                UNION
            SELECT title, source_id
                regulations WHERE latest_version = True
            """
        cur.execute(query)
        results = {v[1]: v[0] for v in cur.fetchall()}
        regex = re.compile('(%s)' % results.values().join('|'))
        domxml = minidom.parseString(etree.tostring(tree, encoding='UTF-8', method="html"))
        nodes = tree.xpath('//*[text()]')
        for node in nodes:
            if node.text.matches(regex):
                pass

    return tree


def update_definitions(act_name, id=None, db=None):
    tree = get_act_exact(act_name, id, db)
    if act_name != 'Interpretation Act 1999':
        _, definitions = populate_definitions(get_act_exact('Interpretation Act 1999'))
    else:
        definitions = Definitions()
    tree = process_act_links(tree, db)
    tree, definitions = process_definitions(tree, definitions)
    with (db or get_db()).cursor() as cur:
        query = """UPDATE documents d SET processed_document =  %(doc)s
                    FROM latest_instruments s
                    WHERE d.id = s.id and (%(act)s is null or title = %(act)s) and (%(id)s is null or d.id =  %(id)s) returning d.id"""
        cur.execute(query, {
            'act': act_name,
            'id': id,
            'doc': etree.tostring(tree, encoding='UTF-8', method="html"),
        })
        id = cur.fetchone()[0]
        args_str = ','.join(cur.mogrify("(%s,%s,%s)", (id, x[0], json.dumps(x[1]))) for x in definitions.render().items())
        cur.execute("DELETE FROM definitions where document_id = %(id)s", {'id': id})
        cur.execute("INSERT INTO definitions (document_id, key, data) VALUES " + args_str)
        (db or get_db()).commit()
    return tree, definitions.render()


def get_act_object(act_name=None, id=None, db=None, replace=False):
    with (db or get_db()).cursor(cursor_factory=extras.RealDictCursor) as cur:
        query = """SELECT * FROM latest_instruments
                where (%(act)s is null or title= %(act)s) and (%(id)s is null or id =  %(id)s)
            """
        if not replace:
            cur.execute(query, {'act': act_name, 'id': id})
            result = cur.fetchone()
            if not result.get('id'):
                raise CustomException('Act not found')
        if replace or not result.get('processed_document'):
            tree, _ = update_definitions(act_name, id, db=db)
        else:
            tree = etree.fromstring(result.get('processed_document'))

        return Act(id=result.get('id'), tree=tree, attributes=dict(result))


def act_skeleton_response(act):
    act.calculate_hooks()
    return {
        'skeleton': act.skeleton,
        'html_contents_page': etree.tostring(tohtml(act.tree, os.path.join('xslt', 'contents.xslt')), encoding='UTF-8', method="html"),
        'title': act.title,
        'attributes': act.attributes,
        'parts': {},
        'id': act.id,
        'type': 'instrument',
        'partial': True
    }


def act_full_response(act):
    return {
        'html_content': etree.tostring(tohtml(act.tree), encoding='UTF-8', method="html"),
        'html_contents_page': etree.tostring(tohtml(act.tree, os.path.join('xslt', 'contents.xslt')), encoding='UTF-8', method="html"),
        'title': act.title,
        'id': act.id,
        'type': 'instrument',
        'attributes': act.attributes
    }


def act_fragment_response(act):
    return {
        'html': etree.tostring(tohtml(act.tree), encoding='UTF-8', method="html"),
        'title': act.title,
        'id': act.id,
        'type': 'instrument',
    }

def act_response(act):
    if len(act.tree.xpath('.//*')) > 5000000: # move magic number somewhere
        return act_skeleton_response(act)
    else:
        return act_full_response(act)


def act_part_response(act, parts):
    def render_inner(el):
        s = ''
        for node in el.xpath('node()'):
            if isinstance(node, basestring):
                s += node
            else:
                s += etree.tostring(node, encoding='UTF-8', method="html")
        return s

    return {
        'parts': {act.parts[e].attrib['data-hook']: render_inner(act.parts[e]) for e in parts or [] }
    }


def format_response(args, result):
    if args.get('format', 'html') == 'json':
        return {'content': result, 'act_name': args['act_name']}
    else:
        return {'html_content': etree.tostring(result, encoding='UTF-8', method="html"), 'act_name': args['act_name']}


def get_act_node_by_id(node_id):
    if node_id.startswith('D'):
        id = find_document_id_by_govt_id(node_id)
    else:
        id = node_id
    act = get_act_object(id=id)
    """ if the node is root, just get cover """
    if node_id == id:
        pass
    elif act.tree.attrib['id'] == node_id:
        act.tree = cull_tree(act.tree.xpath('.//cover'))
    else:
        act.tree = cull_tree(act.tree.xpath('.//*[@id="' + node_id + '"]'))
    return act_response(act)


def query_act(args):
    if not any((args.get('act_name', args.get('title')), args.get('id'))):
        raise CustomException('No instrument specified')
    act = get_act_object(act_name=args.get('act_name', args.get('title')), id=args.get('id'))
    # act.calculate_hooks()
    find = args.get('find')
    if find == 'full':
        pass
    elif find == "more":
        return act_part_response(act, args.getlist('requested_parts[]'))
    else:
        query = args.get('query')
        if not query:
            raise CustomException('Query missing')
        elif find == 'search':
            act.tree = find_node_by_query(act.tree, query)
        elif find == 'location':
            act.tree = find_node_by_location(act.tree, query)
        elif find == 'govt_id':
            act.tree = find_node_by_govt_id(act.tree, query)
        elif find == 'section':
            act.tree = find_section_node(act.tree, query)
        elif find == 'part':
            act.tree = find_part_node(act.tree, query)
        elif find == 'schedule':
            act.tree = find_schedule_node(act.tree, query)
        elif find == 'definitions':
            act.tree = find_definitions(act.tree, query)
        else:
            raise CustomException('Invalid search type')
        act.tree = cull_tree(act.tree)
    return act_response(act)


def query_acts(args):
    search_type = args.get('find')
    query = args.get('query')
    if search_type == 'id':
        return get_act_node_by_id(query)
    if search_type == 'contains':
        #result = act_full_search(query)
        raise CustomException('Not Implemented')
    elif search_type == 'definitions':
        raise CustomException('Not Implemented')
    else:
        raise CustomException('Invalid search type')
    return []
