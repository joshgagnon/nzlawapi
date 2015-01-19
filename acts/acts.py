from db import get_db
from util import CustomException, tohtml
from definitions import populate_definitions, process_definitions
from traversal import cull_tree, find_definitions, find_part_node, find_section_node, find_schedule_node, find_node_by_query
from lxml import etree
import json
import os


class Act(object):
    def __init__(self, tree, definitions):
        self.tree = tree
        self.definitions = definitions or {}
        self.title = get_title(self.tree)


def get_title(tree):
    return tree.xpath('/act/cover/title')[0].text


def get_act(act, db=None):
    with (db or get_db()).cursor() as cur:
        query = """select document from acts a
        join documents d on a.document_id = d.id
        where lower(replace(title, ' ', '')) = lower(%(act)s) and latest_version = True """
        cur.execute(query, {'act': act})
        try:
            return etree.fromstring(cur.fetchone()[0])
        except:
            raise CustomException("Act not found")


def get_act_exact(act, db=None):
    with (db or get_db()).cursor() as cur:
        query = """
            (select document, version, path
        from acts a join documents d on a.document_id = d.id
            where title = %(act)s and latest_version = True)
        union
            (select document, version, path
        from regulations a join documents d on  a.document_id = d.id
            where title = %(act)s and latest_version = True)
             """
        cur.execute(query, {'act': act})
        try:
            result = cur.fetchone()
            return etree.fromstring(result[0])
        except:
            raise CustomException("Act not found")


def update_definitions(act_name, db=None):
    tree = get_act_exact(act_name, db)
    _, definitions = populate_definitions(get_act_exact('Interpretation Act 1999'))
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
        query =  """(SELECT processed_document, definitions::text FROM acts a
                JOIN documents d on a.document_id = d.id
                WHERE title = %(act)s and latest_version = True)
            UNION
                (SELECT processed_document, definitions::text
            from regulations a join documents d on a.document_id = d.id
                where title = %(act)s and latest_version = True)
            """
        if not replace:
            cur.execute(query, {'act': act_name})
            result = cur.fetchone()
        if not result[0] or replace:
            tree, definitions = update_definitions(act_name, db=db)
        else:
            tree, definitions = etree.fromstring(result[0]), json.loads(result[1])

        return Act(tree=tree, definitions=definitions)

def get_full_act(act):
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


def query_act(args):
    act = get_act_object(args.get('act_name', args.get('title')))
    search_type = args.get('find')
    if search_type == 'full':
        return get_full_act(act)
    else:
        query = args.get('query')
        if not query:
            raise CustomException('Query missing')
        if search_type == 'search':
            tree = find_node_by_query(act, query)
        elif search_type == 'section':
            tree = find_section_node(act, query)
        elif search_type == 'part':
            tree = find_part_node(act, query)
        elif search_type == 'schedule':
            tree = find_schedule_node(act, query)
        elif search_type == 'definitions':
            tree = find_definitions(act, query)
        else:
            raise CustomException('Invalid search type')
        result = cull_tree(tree)
    return format_response(args, result)


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
