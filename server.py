from lxml import etree
import sys
from lxml.etree import tostring
from itertools import chain
from flask import Flask


class CustomException(Exception):
    pass

def get_title(tree):
    return tree.xpath('/act/cover/title')[0].text

def tohtml(tree):
    xslt = etree.parse('transform.xslt')
    transform = etree.XSLT(xslt)
    return transform(tree)

def pluck_tree(tree, keys):
    node = tree
    def test_inclusion(node, current):
        inclusion = node == current or node.tag in ['label', 'heading', 'cover', 'text']
        if not inclusion and node.tag == 'crosshead':
            # is the crosshead the first previous one?
            try:
                inclusion = node == current.itersiblings(tag='crosshead', preceding=True).next()
            except StopIteration: pass
        return inclusion

    def fix_parents(tree, node):
        while node.getparent() is not None:
            parent = node.getparent()
            to_remove = filter(lambda x: not test_inclusion(x, node), parent.getchildren())
            [parent.remove(x) for x in to_remove]
            node = parent
    try:
        for a in keys:
            node = node.xpath(".//*[label='%s']" % a)[0]
        fix_parents(tree, node)
        return tohtml(tree)
        
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

@app.route('/act/<path:act>/<path:path>')
def hello_world(act='', path=''):
    try:
        result = str(pluck_tree(read_file(act_to_filename(act)), path.split('/')))
    except Exception, e:
        print e
        result  = str(e)
    return result


if __name__ == '__main__':
    app.run(debug=True)