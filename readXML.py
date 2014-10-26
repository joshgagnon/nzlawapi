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

def process_paragraph(paragraph):
    results = {'text': tostring(paragraph.xpath('para/text')[0] , method="text" , encoding='utf8'),
            'id': paragraph.attrib.get('id')
            }
    if len(paragraph.xpath('label')):
        results['number'] = paragraph.xpath('label')[0].text
    results['children'] =  map(process_paragraph, paragraph.xpath('para/label-para | para/def-para' ))
    return results


def process_subprovision(subprovision):
    results = {
        'number': subprovision.xpath('label')[0].text,
        'children': map(process_paragraph, subprovision.xpath('para/label-para | para/def-para')),
        'id': subprovision.attrib.get('id')
    }
    if len(subprovision.xpath('para/text')):
        results['text'] = tostring(subprovision.xpath('para/text')[0] , method="text" , encoding='utf8')
    return results


def process_provision(provision):
    return {
        'title': provision.xpath('heading')[0].text,
        'children': map(process_subprovision, provision.xpath('prov.body/subprov')),
        'number':  provision.xpath('label')[0].text,
        'id': provision.attrib.get('id')
    }

def process_section(section):
    return {
        'title': section.xpath('heading')[0].text,
        'children': map(process_provision, section.xpath('prov')),
        'number': section.xpath('label')[0].text,
        'id': section.attrib.get('id')
    }


def find(tree, section, prov=None, para=None, subpara=None):
    label = 'Section %s' % section
    sel = '//prov[label = "%s"]' % section
    node = tree.xpath(sel)[0]
    if prov:
        label = '%s(%s)' % (label, prov)
        sel = './/subprov[label = "%s"]' % prov
        node = node.xpath(sel)[0]
        result = [full_string(node.xpath('.//text')[0])]
    else:
        sel = './/subprov'
        node = node.xpath(sel)[0]
        result = [full_string(node.xpath('.//para/text')[0])]
    if para:
        label = '%s(%s)' % (label, para)
        sel = './/label-para[label = "%s"]' % para
        node = node.xpath(sel)[0]
        result.append(full_string(node.xpath('.//text')[0]))
    else:
        #add all children
        pass
    if subpara:
        label = '%s(%s)' % (label, subpara)
        sel = './/label-para[label = "%s"]//text' % para
        print node
        print node.text
        node = node.xpath(sel)[0]
        result.append(full_string(node))
    else:
        #add all children
        pass
    return [label, result]

xml_map  = {
    'label': 'span',
    'heading': 'span',
    'text': 'span',
    'para': 'span',
    'prov_body': 'div',
    'label_para': 'li',
    'para': 'ul'

}


def tohtml(tree):
    def fix(tree):
        class_name = tree.tag.replace('.', '_').replace('-', '_')
        id = tree.get('id')
        tree.attrib.clear()
        tree.set('class', class_name)
        tree.tag = xml_map.get(class_name, 'div')
    fix(tree)
    map(fix, tree.iter())
    return tostring(tree)

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


def pluck_tree(tree, keys):
    tree = etree.fromstring(tostring(tree))
    for a in keys:
        tree = tree.xpath(".//*[label='%s']" % a)[0]
    return tohtml(parent_text(tree))


def read_css():
    with open('style.css') as f:
        return '<style>%s</style>' % f.read()

from flask import Flask
app = Flask(__name__)



@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def hello_world(path):
    print path.split('/')[1:]
    return pluck_tree(tree, (path.split('/')[1:]))  + read_css()


if __name__ == '__main__':
    app.run(debug=True)

#print find(tree, 332, para='b')
#print find(tree, 41, para='b')
#print find(tree, 107, 1)
#print find(tree, 107, 1, 'c')
#print find(tree, 83, 5, 'b')
#print find(tree, 85, 1, 'c', 'ii')

"""
doc = map(process_section, tree.xpath('/act/body/prov | /act/body/part'))
sections = list(chain.from_iterable(filter(lambda x: x, map(lambda x: x.get('children', []), doc))))
pp = pprint.PrettyPrinter()

def timing(f):
    def wrap(*args):
        time1 = time.time()
        ret = f(*args)
        time2 = time.time()
        print '%s function took %0.3f ms' % (f.func_name, (time2-time1)*1000.0)
        return ret
    return wrap


def find(sections, *args):
    result = []
    try:
        def _find(sections, *args): or shares under the amalgamation proposal, the sha
            args = list(args)
            arg = args[0]
            if len(sections) == 1:
                sec = sections[0]
            else:
                sec = filter(lambda s: s.get('number') == str(arg), sections)[0]
                args.pop(0)
            if sec.get('text'):
                if not len(result):
                    result.append('%s' %  sec.get('text'))
                else:
                    result.append('(%s) %s' % (sec.get('number'), sec.get('text')))
            elif not len(args):
                result.append('(%s) %s' % (sec.get('number'), sec.get('title')))
            if len(args):
                sec = _find(sec.get('children'), *args)
            return sec
        _find(sections, *args)
    except IndexError:
        return ['no result found']
    return result


pp.pprint(find(sections, 41, 'b'))
pp.pprint(find(sections, 107, 1, 'c'))
pp.pprint(find(sections, 373, 4, 'aaa'))
pp.pprint(find(sections, 222))
pp.pprint(find(sections, 373, 4, 'aaaa'))
pp.pprint(find(sections, 52))
"""