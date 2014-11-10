from lxml import etree
import pprint
import sys
from lxml.etree import tostring
from itertools import chain
import time
from flask import Flask
tree = etree.parse(sys.argv[1])

title = tree.xpath('/act/cover/title')[0].text

def full_string(element):
    return tostring(element , method="text" , encoding='utf8')

xml_map  = {
    'prov': 'div',
    'label': 'span',
    'heading': 'span',
    'text': 'span',
    'para': 'span',
    'prov_body': 'ul',
    'label_para': 'li',
    'para': 'ul',
    'prov': 'ul',
    'citation': 'span',
    'intref': 'span',
    'subprov': 'div',
    'insertwords': 'span'
}


def tohtml(tree):
    xslt = etree.parse('transform.xslt')
    transform = etree.XSLT(xslt)
    return transform(tree)



def validate(key):
    return (key == 'schedule' or len(key) < 4) and len(key)

def pluck_tree(keys):
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

        print tostring(tree)

    try:
        tree = node = etree.parse(sys.argv[1])
        keys = filter(validate, keys)
        for a in keys:
            node = node.xpath(".//*[label='%s']" % a)[0]

        fix_parents(tree, node)

        return tohtml(tree)
    except Exception, e:
        print e
        return """Could not process request"""





app = Flask(__name__)

@app.route('/act/<path:path>')
def hello_world(path=''):
    result = str(pluck_tree((path.split('/')[1:])))
    return result


if __name__ == '__main__':

    app.run(debug=True)

#print find(tree, 332, para='b')
#print find(tree, 41, para='b')
#print find(tree, 107, 1)
#print find(tree, 107, 1, 'c')
#print find(tree, 83, 5, 'b')
#print find(tree, 85, 1, 'c', 'ii')
#
