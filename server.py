from lxml import etree
import sys
from lxml.etree import tostring
from itertools import chain
from flask import Flask
from operator import itemgetter
from flask import render_template, json, jsonify, g
from flask.json import JSONEncoder
import psycopg2
import datetime
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


def tohtml(tree):
    xslt = etree.parse('transform.xslt')
    transform = etree.XSLT(xslt)
    return transform(tree)


def cull_tree(nodes):

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
    print tostring(nodes[0].getroottree())
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


def find_definitions(tree, query):
    try:
        return tree.xpath(".//def-para[descendant::def-term[contains(.,'%s')]]" %  query)
    except Exception, e:
        print e
        raise CustomException("Path for definition not found")

def find_definition(tree, query):
    try:
        nodes = tree.xpath(".//def-para/para/text/def-term[contains(.,'%s')]" %  query)
        lev_nodes = sorted(map(lambda x: (x, levenshtein(query, x.text)), nodes), key=itemgetter(1))
        return lev_nodes[0][0].iterancestors(tag='def-para').next()
    except Exception, e:
        print e
        raise CustomException("Path for definition not found")

def find_node_by_id(query):
    try:
        tree = read_file(act_to_path('companiesact1993'))
        return tree.xpath("//*[@id='%s']" % query)
    except IndexError, e:
        print e
        raise CustomException("Result not found")


def find_node_by_query(tree, query):
    try:
        return tree.xpath(".//*[contains(.,'%s')]" %  query)
    except Exception, e:
        print e
        raise CustomException("Path not found")


def act_to_path(act):
    with get_db().cursor() as cur:
        query = """select path from acts where lower(replace(title, ' ', '')) = lower(%(act)s)
         order by version desc limit 1; """
        cur.execute(query, {'act': act})
        try:
            return cur.fetchone()[0]
        except:
            raise CustomException("Act not found")

def get_references_for_ids(ids):
    with get_db().cursor() as cur:
        query = """select id, title from 
            (select parent_id, mapper from id_lookup where id = ANY(%(ids)s)) as q
            join acts a on a.id = q.parent_id and q.mapper = 'acts' group by id, title"""
        cur.execute(query, {'ids': ids})
        return {'references':cur.fetchall()}


def read_file(filename):
    return etree.parse(os.path.join(location, filename))

class CustomJSONEncoder(JSONEncoder):

    def default(self, obj):
        try:
            if isinstance(obj, datetime.date):
                return obj.isoformat()
        except TypeError:
            pass
        else:
            return list(iterable)
        return JSONEncoder.default(self, obj)


app = Flask(__name__)
app.json_encoder = CustomJSONEncoder


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
    

@app.route('/act/<path:act>/definition/<string:query>')
def act_definition(act='', query=''):
    try:
        print act_to_path(act) 
        result = str(cull_tree(find_definition(read_file(act_to_path(act)), query))).decode('utf-8')
    except Exception, e:
        print e
        result  = str(e)
    return render_template('base.html', content=result) 

@app.route('/act/<path:act>/definitions/<string:query>')
def act_definitions(act='', query=''):
    try:
        result = str(cull_tree(find_definitions(read_file(act_to_path(act)), query))).decode('utf-8')
    except Exception, e:
        print e
        result  = str(e)
    return render_template('base.html', content=result) 

@app.route('/act/<path:act>/search/<string:query>')
def search(act='', query=''):
    try:
        result = str(cull_tree(find_node_by_query(read_file(act_to_path(act)), query))).decode('utf-8')
    except Exception, e:
        print e
        result  = str(e)
    return render_template('base.html', content=result)

@app.route('/act/<path:act>/<path:path>')
def by_act(act='', path=''):
    try:
        result = str(cull_tree(find_node(read_file(act_to_path(act)), path.split('/')))).decode('utf-8')
    except Exception, e:
        print e
        result  = str(e)
    return render_template('base.html', content=result) 


@app.route('/search_id/<string:query>')
def search_by_id(query):
    try:
        result = str(cull_tree(find_node_by_id(query))).decode('utf-8')
    except Exception, e:
        print e
        result  = str(e)
    return render_template('base.html', content=result) 


@app.route('/find_references/<string:query>')
def referenced_by(query):
    try:
        return jsonify(get_references_for_ids(query.split(';')))
    except Exception, e:
        return jsonify(error=str(e))


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
    app.run(debug=True,host='0.0.0.0')