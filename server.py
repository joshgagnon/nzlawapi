from lxml import etree
import sys
from lxml.etree import tostring
from itertools import chain
from flask import Flask
from operator import itemgetter

class CustomException(Exception):
    pass

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
    return tohtml(nodes[0].getroottree())


def generate_range(string):
    tokens = string.split('-')



def find_node(tree, keys):
    node = tree
    try:
        # first, special case for schedule
        if keys[0] == 'schedule':
            node = node.xpath(".//schedule[label='%s']" % keys[1])[0]
            keys = keys[2:]
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
                node = sorted(map(lambda x: (x, len(list(x.iterancestors()))), node), key=itemgetter(1))[0]
            else:
                nodes = sorted(map(lambda x: (x, len(list(x.iterancestors()))), node), key=itemgetter(1))
                node = [x[0] for x in nodes if x[1] == nodes[0][1]]

        if not len(node):
            raise CustomException("empty")
        return node
    except Exception, e:
        print e
        raise CustomException("Path not found")


def find_definitions(tree, query):
    try:
        return tree.xpath(".//def-para[descendant::def-term[contains(.,'%s')]]" %  query)
    except Exception, e:
        print e
        raise CustomException("Path not found")


def find_node_by_id(query):
    try:
        tree = read_file(act_to_filename('companiesact1993'))
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


def act_to_filename(act):
    acts = {
        'companiesact1993': 'act-public-1993-0105.xml'
    }
    try:
        return acts[act]
    except KeyError:
        raise CustomException("Act not found")

def read_file(filename):
    return etree.parse(filename)


app = Flask(__name__)


@app.route('/act/<path:act>/definitions/<string:query>')
def act_definitions(act='', query=''):
    try:
        result = str(cull_tree(find_definitions(read_file(act_to_filename(act)), query)))
    except Exception, e:
        print e
        result  = str(e)
    return result

@app.route('/act/<path:act>/search/<string:query>')
def search(act='', query=''):
    try:
        result = str(cull_tree(find_node_by_query(read_file(act_to_filename(act)), query)))
    except Exception, e:
        print e
        result  = str(e)
    return result

@app.route('/act/<path:act>/<path:path>')
def by_act(act='', path=''):
    try:
        result = str(cull_tree(find_node(read_file(act_to_filename(act)), path.split('/'))))
    except Exception, e:
        print e
        result  = str(e)
    return result


@app.route('/search_id/<string:query>')
def search_by_id(query):
    try:
        result = str(cull_tree(find_node_by_id(query)))
    except Exception, e:
        print e
        result  = str(e)
    return result





if __name__ == '__main__':
    app.run(debug=True,host='0.0.0.0')