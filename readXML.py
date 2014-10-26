from lxml import etree
import pprint
import sys
from lxml.etree import tostring
from itertools import chain
import time

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
    def fix(tree):
        class_name = tree.tag.replace('.', '_').replace('-', '_')
        id = tree.get('id')
        tree.attrib.clear()
        tree.set('class', class_name)
        tree.tag = xml_map.get(class_name, 'div')
#fix(tree)
    #map(fix, tree.iter())
    xslt = etree.parse('transform.xslt')
    transform = etree.XSLT(xslt)

    return tostring(transform(tree))

def parent_text(tree):
    node = tree
    while node.getparent() is not None:
        parent = node.getparent()

        [parent.remove(n) for n in parent if n != node and n.tag ==node.tag and not n.tag in ['text', 'title']]
        print parent
        if parent.xpath('./heading'):
            return parent
        node = parent

    return node


def validate(key):
    return (key == 'schedule' or len(key) < 4) and len(key)

def pluck_tree(tree, keys):
    try:
        tree = etree.fromstring(tostring(tree))
        keys = filter(validate, keys)
        if not len(keys):
            return 'Too short'
        for a in keys:
            if a == 'schedule':
                tree = tree.xpath('.//schedule')[0]
            else:
                tree = tree.xpath(".//*[label='%s']" % a)[0]
        return tohtml(parent_text(tree))
    except Exception, e:
        print e
        return """Could not process request"""

def read_css():
    with open('style.css') as f:
        return '<style>%s</style>' % f.read()

from flask import Flask
app = Flask(__name__)



@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def hello_world(path):
    return pluck_tree(tree, (path.split('/')[1:]))  + read_css()


if __name__ == '__main__':
    app.run(debug=True)

#print find(tree, 332, para='b')
#print find(tree, 41, para='b')
#print find(tree, 107, 1)
#print find(tree, 107, 1, 'c')
#print find(tree, 83, 5, 'b')
#print find(tree, 85, 1, 'c', 'ii')
