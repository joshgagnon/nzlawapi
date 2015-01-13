from db import get_db, get_act_exact, get_document_from_title
from util import CustomException, tohtml, config_as_dict
from views import mod
from definitions import insert_definitions
from cases import get_full_case, get_case_info
from lxml import etree
import sys
from lxml.etree import tostring
from itertools import chain
from operator import itemgetter
from flask import render_template, json, jsonify, g, request, send_from_directory, Flask
from flask.json import JSONEncoder
import datetime
import os
import re
import os
import psycopg2



def get_title(tree):
    return tree.xpath('/act/cover/title')[0].text

def cull_tree(nodes):
    [n.attrib.update({'current': 'true'}) for n in nodes]

    all_parents = set()
    [all_parents.update(list(x.iterancestors()) + [x]) for x in nodes]

    def test_inclusion(node, current):
        inclusion = node == current or node.tag in ['label', 'heading', 'cover', 'text']
        if not inclusion and node.tag == 'crosshead':
            # is the crosshead the first previous one?
            try:
                inclusion = node == current.itersiblings(tag='crosshead', preceding=True).next()
            except StopIteration: pass
        return inclusion or node in all_parents

    def fix_parents(node):
        while node.getparent() is not None:
            parent = node.getparent()
            to_remove = filter(lambda x: not test_inclusion(x, node), parent.getchildren())
            [parent.remove(x) for x in to_remove]
            node = parent
    [fix_parents(n) for n in nodes]
    return tohtml(nodes[0].getroottree())


def generate_range(string):
    tokens = string.split('-')


def find_sub_node(tree, keys):
    node = tree
    try:
        for i, a in enumerate(keys):
            if a:
                #if '-' in :
                #    a = " or ".join(["label = '%s'" % x for x in generate_range(a)])
                if '+' in a:

                    #a = "label = ('%s')" % "','".join(a.split('+'))
                    a = " or ".join(["label = '%s'" % x for x in a.split('+')])
                else:
                    a = "label = '%s'" % a
                node = node.xpath(".//*[not(self::part) and not(self::subpart)][%s]" % a)
            if i < len(keys)-1:
                #get shallowist nodes
                node = sorted(map(lambda x: (x, len(list(x.iterancestors()))), node), key=itemgetter(1))[0][0]
            else:
                #if last part, get all equally shallow results
                nodes = sorted(map(lambda x: (x, len(list(x.iterancestors()))), node), key=itemgetter(1))
                node = [x[0] for x in nodes if x[1] == nodes[0][1]]
        if not len(node):
            raise CustomException("Empty")
        return node
    except Exception, e:
        raise CustomException("Path not found")   


def find_part_node(tree, query):
    #todo add path test
    keys = query.split('/')
    tree = tree.xpath(".//part[label='%s']" % keys[0])
    keys = keys[1:]
    if len(keys):
        tree = tree[0]
    return find_sub_node(tree, keys)

def find_schedule_node(tree, query):
    #todo add schedule test
    keys = query.split('/')
    tree = tree.xpath(".//schedule[label='%s']" % keys[0])
    keys = keys[1:]
    if len(keys):
        tree = tree[0]
    return find_sub_node(tree, keys)

def find_section_node(tree, query):
    keys = query.split('/')
    tree = tree.xpath(".//body")[0]
    return find_sub_node(tree, keys)


def find_definitions(tree, query):
    nodes = tree.xpath(".//def-para[descendant::def-term[contains(.,'%s')]]" %  query)
    if not len(nodes):
        raise CustomException("Path for definition not found")
    return nodes


def find_definition(tree, query):
    try:
        nodes = tree.xpath(".//def-para/para/text/def-term[contains(.,'%s')]" %  query)
        lev_nodes = sorted(map(lambda x: (x, levenshtein(query, x.text)), nodes), key=itemgetter(1))
        return lev_nodes[0][0].iterancestors(tag='def-para').next()
    except Exception, e:
        print e
        raise CustomException("Path for definition not found")

def find_node_by_id(node_id, db=None):
    with (db or get_db()).cursor() as cur:    
        try:
            query = """ 
            select document, title from documents d
            join acts a on a.document_id = d.id
            join id_lookup i on i.parent_id = a.id and i.mapper = 'acts'
            where i.id = %(node_id)s
            order by version desc 
            limit 1; """

            cur.execute(query, {'node_id': node_id})
            result = cur.fetchone()
            return (etree.fromstring(result[0]).xpath("//*[@id='%s']" % node_id), result[1])
        except Exception, e:
            print e
            raise CustomException("Result not found")


def find_node_by_query(tree, query):
    try:
        return tree.xpath(".//*[contains(.,'%s')]" %  query)
    except Exception, e:
        print e
        raise CustomException("Path not found")


def get_references_for_ids(ids):
    with get_db().cursor() as cur:
        query = """ select id, title from 
            (select parent_id, mapper from id_lookup where id = ANY(%(ids)s)) as q
            join acts a on a.id = q.parent_id and q.mapper = 'acts' group by id, title """
        cur.execute(query, {'ids': ids})
        return {'references':cur.fetchall()}




class CustomJSONEncoder(JSONEncoder):
    def default(self, obj):
        try:
            if isinstance(obj, datetime.date):
                return obj.isoformat()
        except TypeError:
            pass
        #else:
        #    return list(iterable)
        return JSONEncoder.default(self, obj)


if len(sys.argv) <= 1:
    raise Exception('need a config file')


app = Flask(__name__, static_folder='build')
app.config.from_pyfile(sys.argv[1])

@app.route('/acts.json')
def acts(act='', query=''):
    try:
        db = get_db();
        with db.cursor() as cur:
            cur.execute("""(select trim(title), id from acts 
                where title is not null group by id, title order by trim(title))
                union 
                (select trim(title), id from regulations 
                where title is not null group by id, title order by trim(title))""")
            return jsonify({'acts': cur.fetchall()})
    except Exception, e:
        return jsonify(error=str(e))
    
@app.route('/cases.json')
def cases(act='', query=''):
    try:
        db = get_db();
        with db.cursor() as cur:
            cur.execute("""select trim(full_citation), document_id from cases where full_citation is not null order by trim(full_citation)""")
            return jsonify({'cases': cur.fetchall()})
    except Exception, e:
        return jsonify(error=str(e))

@app.route('/act_case_hint.json')
def act_case_hint():
    try:
        db = get_db();
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                select title as name, type from
                    ((select trim(full_citation) as title, 'case'as type from cases where full_citation is not null order by trim(full_citation)) 
                    union
                    (select trim(title) as title, 'act' as type from acts  where title is not null group by id, title order by trim(title)) 
                    union 
                    (select trim(title) as title, 'regulation' as type from regulations where title is not null group by id, title order by trim(title))) q
                   where title ilike '%%'||%(query)s||'%%' order by title limit 25;
                """, {'query': request.args.get('query')})
            return jsonify({'results': cur.fetchall()})
    except Exception, e:
        return jsonify(error=str(e))

@app.route('/validate_case',methods=['POST'])
def validate():
    db = get_db();
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        query = """update cases set validated = %(validated)s, reporter = %(username)s where id = %(id)s """
        cur.execute(query, {
            'id': request.form.get('id'), 
            'validated': request.form.get('validated'),
            'username': request.form.get('username')
            })
        db.commit()
        return jsonify(status='success'), 200 

@app.route('/error_reports',methods=['GET'])
def get_reports():
    with get_db().cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        query = """select * from error_reports where id = %(id)s """
        print request.args.get('id')
        cur.execute(query, {'id': request.args.get('id')})
        return jsonify(results=cur.fetchall())  

@app.route('/error_reports', methods=['POST'])
def post_reports():
    db = get_db();
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        query = """insert into error_reports (id, reporter, details, fields, mapper) values 
            (%(id)s, %(reporter)s, %(details)s, %(fields)s, 'cases') """
        cur.execute(query, {
            'id': request.form.get('id'), 
            'reporter': request.form.get('reporter'),
            'details': request.form.get('details'),
            'fields': request.form.getlist('fields[]')
            })
        db.commit()
        return jsonify(status='success'), 200 


@app.route('/act_search_id/<string:query>')
def search_by_id(query):
    status = 200
    try:
        document, title = find_node_by_id(query)
        result = cull_tree(document)
        result = {'html_content': etree.tostring(result, encoding='UTF-8', method="html"), 'act_name': title, 'type': 'act'}
    except Exception, e:
        result = {'error': str(e)}
        status = 500        
    return jsonify(result), status

def format_response(args, result):
    print args
    if args.get('format', 'html') == 'json':
        return {'content': result, 'act_name': args['act_name']}
    else:
        return {'html_content': etree.tostring(result, encoding='UTF-8', method="html"), 'act_name': args['act_name']}

def full_act_response(act, args):
    xml, definitions = insert_definitions(act)
    #xml, definitions = act, {}
    return {
        'html_content': etree.tostring(tohtml(xml), encoding='UTF-8', method="html",),
        'html_contents_page': etree.tostring(tohtml(act, os.path.join('xslt','contents.xslt')), encoding='UTF-8', method="html"),
        'definitions': definitions,
        'act_name': args.get('act_name', args.get('title')),
        'type': 'act'
    }

def query_act(args):
    act = get_act_exact(args.get('act_name', args.get('title')))
    search_type = args.get('find')
    if search_type == 'full':
        return full_act_response(act, args)           
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
    query = args.get('query')
    if search_type == 'contains':
        result = act_full_search(query)
    elif search_type == 'definitions':
        raise CustomException('Not Implemented')
    else:
        raise CustomException('Invalid search type')
    return result

def query_case(args):
    case = args.get('title')
    if case and args.get('validator'):
        return get_case_info(case)
    if case:
        return get_full_case(case)
    raise CustomException('Invalid search type')

def query_cases(args):
    query = args.get('query')
    if not query:
        raise CustomException('Query missing')
    results = case_search(re.escape(args.get('query', '')))
    return {'results': results}

def query_all(args):
    title = args.get('article_name')
    results = []
    return {'results': results}

@app.route('/case/file/<path:filename>')
def case_file(filename):
    path = app.config['CASE_DIR']
    print app.config['CASE_DIR']
    return send_from_directory(path, filename)


@app.route('/query')
def query():
    args = request.args
    query_type = args.get('type')
    status = 200
    try:
        if query_type == 'act' or query_type == 'regulation':
            result = query_act(args)
        elif query_type == 'acts' or query_type == 'regulations':
            result = query_acts(args) 
        elif query_type== 'case':
            result = query_case(args)
        elif query_type == 'cases':
            result = query_cases(args)
        else:
            raise CustomException('Badly formed query')
    except CustomException, e:
        result = {'error': str(e)}
        status = 500
    return jsonify(result), status



@app.teardown_appcontext
def close_db(error):
    if hasattr(g, 'db'):
        g.db.close()



if __name__ == '__main__':
    app.register_blueprint(mod)
    app.json_encoder = CustomJSONEncoder
    app.run(app.config['IP'], debug=app.config['DEBUG'], port=app.config['PORT'])