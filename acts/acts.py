from db import get_db
from util import CustomException, tohtml
from definitions import populate_definitions, process_definitions
from traversal import cull_tree, find_definitions, find_part_node, find_section_node, find_schedule_node, find_node_by_query, find_title_by_id
from lxml import etree
import json
import os


class Act(object):
    def __init__(self, id, tree, definitions):
        self.id = id
        self.tree = tree
        self.definitions = definitions or {}
        self.title = get_title(self.tree)


def get_title(tree):
    return tree.xpath('/act/cover/title|/regulation/cover/title')[0].text


def get_act(act, db=None):
    with (db or get_db()).cursor() as cur:
        query = """select document from latest_instruments where
        where lower(replace(title, ' ', '')) = lower(%(act)s) """
        cur.execute(query, {'act': act})
        try:
            return etree.fromstring(cur.fetchone()[0])
        except:
            raise CustomException("Act not found")


def get_act_exact(act, db=None):
    with (db or get_db()).cursor() as cur:
        query = """
            select document from latest_instruments
            where title = %(act)s
             """
        cur.execute(query, {'act': act})
        try:
            result = cur.fetchone()
            print result
            return etree.fromstring(result[0])
        except:
            raise CustomException("Act not found")


import re
from xml.dom import minidom
#TODO finish
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
            if node.text.matches(reges):
                pass

    return tree


def update_definitions(act_name, db=None):
    tree = get_act_exact(act_name, db)
    _, definitions = populate_definitions(get_act_exact('Interpretation Act 1999'))
    tree =  process_act_links(tree, db)
    tree, definitions = process_definitions(tree, definitions)
    with (db or get_db()).cursor() as cur:
        query = """UPDATE documents SET processed_document =  %(doc)s,
                         definitions = %(defs)s
                    FROM (SELECT document_id, title FROM acts WHERE latest_version = True
                        UNION
                        SELECT document_id, title FROM regulations WHERE latest_version = True) s
                    WHERE s.document_id = id and s.title = %(act)s """
        cur.execute(query, {
            'act': act_name,
            'doc': etree.tostring(tree, encoding='UTF-8', method="html"),
            'defs': json.dumps(definitions.render())
        })
        (db or get_db()).commit()
    return tree, definitions.render()


def get_act_object(act_name, db=None, replace=False):
    with (db or get_db()).cursor() as cur:
        query = """SELECT id, processed_document, definitions::text FROM latest_instruments
                where title = %(act)s
            """
        if not replace:
            cur.execute(query, {'act': act_name})
            result = cur.fetchone()
        if replace or not result[1]:
            tree, definitions = update_definitions(act_name, db=db)
        else:
            tree, definitions = etree.fromstring(result[1]), json.loads(result[2])
        return Act(id=result[0], tree=tree, definitions=definitions)


def act_response(act):
    return {
        'html_content': etree.tostring(tohtml(act.tree), encoding='UTF-8', method="html",),
        'html_contents_page': etree.tostring(tohtml(act.tree, os.path.join('xslt', 'contents.xslt')), encoding='UTF-8', method="html"),
        'definitions': act.definitions,
        'act_name': act.title,
        'type': 'act'
    }

def format_response(args, result):
    if args.get('format', 'html') == 'json':
        return {'content': result, 'act_name': args['act_name']}
    else:
        return {'html_content': etree.tostring(result, encoding='UTF-8', method="html"), 'act_name': args['act_name']}

def get_act_node_by_id(query):
    title = find_title_by_id(query)
    act = get_act_object(title)
    act.tree= cull_tree(act.tree)
    return act_response(act)

def query_act(args):
    act = get_act_object(args.get('act_name', args.get('title')))
    search_type = args.get('find')
    if search_type == 'full':
        pass
    else:
        query = args.get('query')
        if not query:
            raise CustomException('Query missing')
        if search_type == 'search':
            act.tree = find_node_by_query(act.tree, query)
        elif search_type == 'section':
            act.tree = find_section_node(act.tree, query)
        elif search_type == 'part':
            act.tree = find_part_node(act.tree, query)
        elif search_type == 'schedule':
            act.tree = find_schedule_node(act.tree, query)
        elif search_type == 'definitions':
            act.tree = find_definitions(act.tree, query)
        else:
            raise CustomException('Invalid search type')
        act.tree = cull_tree(act.tree)
    return act_response(act)


def query_acts(args):
    search_type = args.get('acts_find')
    #query = args.get('query')
    if search_type == 'contains':
        #result = act_full_search(query)
        raise CustomException('Not Implemented')
    elif search_type == 'definitions':
        raise CustomException('Not Implemented')
    else:
        raise CustomException('Invalid search type')
    return []
