from lxml import etree
import sys
from lxml.etree import tostring
from itertools import chain
from flask import Flask
from operator import itemgetter
from flask import render_template, json, jsonify, g, request, send_from_directory
from flask.json import JSONEncoder
import psycopg2
import datetime
import os
import elasticsearch
import re
import os

location = '/Users/josh/legislation_archive/www.legislation.govt.nz/subscribe'

class CustomException(Exception):
    pass

def levenshtein(s1, s2):
    if len(s1) < len(s2):
        return levenshtein(s2, s1)
 
    # len(s1) >= len(s2)
    if len(s2) == 0:
        return len(s1)
 
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1 # j+1 instead of j since previous_row and current_row are one character longer
            deletions = current_row[j] + 1       # than s2
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
 
    return previous_row[-1]


def get_title(tree):
    return tree.xpath('/act/cover/title')[0].text


def tohtml(tree, transform='transform.xslt'):
    xslt = etree.parse(transform)
    transform = etree.XSLT(xslt)
    return transform(tree)


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


def find_node(tree, keys):
    node = tree
    try:
        # first, special case for schedule
        if keys[0] in ['part', 'schedule']:
            node = node.xpath(".//%s[label='%s']" % (keys[0], keys[1]))
            keys = keys[2:]
            if len(keys):
                node = node[0]
        else:
            node = node.xpath(".//body")[0]
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
            raise CustomException("empty")
        return node
    except Exception, e:
        raise CustomException("Path not found")


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
    keys = keys[2:]
    if len(keys):
        tree = tree[0]
    return find_sub_node(tree, keys)

def find_schedule_node(tree, query):
    #todo add schedule test
    keys = query.split('/')
    tree = tree.xpath(".//schedule[label='%s']" % keys[0])
    keys = keys[2:]
    if len(keys):
        tree = tree[0]
    return find_sub_node(tree, keys)

def find_section_node(tree, query):
    keys = query.split('/')
    tree = tree.xpath(".//body")[0]
    return find_sub_node(tree, keys)


def find_all_definitions(tree):
    nodes = tree.xpath(".//def-para[descendant::def-term]")
    results = {}
    for node in nodes:
        html = etree.tostring(tohtml(node, 'transform_def.xslt'), encoding='UTF-8')
        keys = node.xpath('.//def-term')
        for key in keys:
            # super ugly hack to prevent placeholders like 'A'
            if len(key.text) > 1:
                results[key.text.lower()] = {'key': key.text, 'html_content': html}
    return results


def find_definitions(tree, query):
    nodes = tree.xpath(".//def-para[descendant::def-term[contains(.,'%s')]]" %  query)
    if not len(node):
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

def find_node_by_id(node_id):
    with get_db().cursor() as cur:    
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


def get_act(act):
    with get_db().cursor() as cur:
        query = """select document from acts a 
        join documents d on a.document_id = d.id
        where lower(replace(title, ' ', '')) = lower(%(act)s)
         order by version desc limit 1; """
        cur.execute(query, {'act': act})
        try:
            return etree.fromstring(cur.fetchone()[0])
        except:
            raise CustomException("Act not found")

def get_act_exact(act):
    with get_db().cursor() as cur:
        query = """select document from acts a 
        join documents d on a.document_id = d.id
        where lower(title) = lower(%(act)s)
         order by version desc limit 1; """
        cur.execute(query, {'act': act})
        try:
            return etree.fromstring(cur.fetchone()[0])
        except:
            raise CustomException("Act not found")

def get_references_for_ids(ids):
    with get_db().cursor() as cur:
        query = """ select id, title from 
            (select parent_id, mapper from id_lookup where id = ANY(%(ids)s)) as q
            join acts a on a.id = q.parent_id and q.mapper = 'acts' group by id, title """
        cur.execute(query, {'ids': ids})
        return {'references':cur.fetchall()}


def act_full_search(query):
    result = es.search(index="legislation", doc_type='act', body={  
        "from" : 0, "size" : 25, 
        "fields" : ["id", "title"],
        "sort" : [
            "_score",
        ],
        "query": { "query_string" : { "query" : query } },
          "aggregations": {
            "my_agg": {
              "terms": {
                "field": "content"
              }
            }
        }
        })
    print("Got %d Hits:" % result['hits']['total'])
    return result


def case_search(query, offset=0):
    result = es.search(index="legislation", doc_type="case", body={  
        "from" : offset, "size" : 25, 
            "sort" : [
                "_score"
            ],
            "query": { "query_string" : { "query" : query } },    
        })
    print("Got %d Hits:" % result['hits']['total'])
    return result

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


app = Flask(__name__, static_folder="./build")
app.json_encoder = CustomJSONEncoder
es = elasticsearch.Elasticsearch()

@app.route('/')
def browser(act='', query=''):
    return render_template('browser.html')

@app.route('/acts.json')
def acts(act='', query=''):
    try:
        db = get_db();
        with db.cursor() as cur:
            cur.execute("""select trim(title), id from acts where title is not null group by id, title order by trim(title)""")
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

@app.route('/act_search_id/<string:query>')
def search_by_id(query):
    status = 200
    try:
        document, title = find_node_by_id(query)
        result = cull_tree(document)
        result = {'html_content': etree.tostring(result, encoding='UTF-8'), 'act_name': title, 'type': 'act'}
    except Exception, e:
        result = {'error': str(e)}
        status = 500        
    return jsonify(result), status

def format_response(args, result):
    print args
    if args.get('format', 'html') == 'json':
        return {'content': result, 'act_name': args['act_name']}
    else:
        return {'html_content': etree.tostring(result, encoding='UTF-8'), 'act_name': args['act_name']}

def query_act(args):
    act = get_act_exact(args.get('act_name'))
    search_type = args.get('act_find')

    if search_type == 'full':
        result = tohtml(act)
    elif search_type == 'all_definitions':
        result = find_all_definitions(act)           
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
    elif search_type == 'defintions':
        raise CustomException('Not Implemented')
    else:
        raise CustomException('Invalid search type')
    return result

def query_case(args):
    raise CustomException('Invalid search type')

def query_cases(args):
    query = args.get('query')
    if not query:
        raise CustomException('Query missing')
    results = case_search(re.escape(args.get('query', '')))
    return {'results': results}
    
@app.route('/query')
def query():
    args = request.args
    query_type = args.get('type')
    status = 200
    try:
        if query_type == 'act':
            result = query_act(args)
        elif query_type == 'acts':
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
    result['type'] = query_type
    return jsonify(result), status


def connect_db():
    conn = psycopg2.connect("dbname=legislation user=josh")
    return conn

def init_db():
    pass

def get_db():
    if not hasattr(g, 'db'):
        g.db = connect_db()
    return g.db

@app.teardown_appcontext
def close_db(error):
    if hasattr(g, 'db'):
        g.db.close()


if __name__ == '__main__':
    app.run(debug=True,host='0.0.0.0',port=5666)