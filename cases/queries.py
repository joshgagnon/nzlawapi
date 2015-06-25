from db import get_db
import psycopg2
from psycopg2 import extras
from flask import render_template, current_app
from util import CustomException
import os
import uuid
from lxml import etree, html
import re


class Case(object):
    def __init__(self, **kwargs):
        ignore = ['document', 'processed_document', 'attributes', 'skeleton', 'contents']
        self.__dict__.update(kwargs)
        self.attributes = dict(((k, v) for k, v in self.attributes.items() if k not in ignore and v))
        self.title = self.attributes['full_citation']

def case_search(query, offset=0):
    result = es.search(
        index="legislation",
        doc_type="case",
        body={
            "from": offset, "size": 25,
            "sort": [
                "_score"
            ],
            "query": {"query_string": {"query": query}},
        })
    print("Got %d Hits:" % result['hits']['total'])
    return result


def get_case_info(case):
    with get_db().cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        query = """select * from cases where full_citation = %(case)s """
        cur.execute(query, {'case': case})
        results = cur.fetchone()
        return {
            'html_content': render_template('case_intitular.html', result=results),
            'path': '/case/file/' + results.get('id'),
            'id': results.get('id'),
            'validated': results.get('validated'),
            'full_citation': results.get('full_citation')
        }


def fix_case_paths(tree):
    for node in tree.xpath('.//*[@src]'):
        node.attrib['src'] = os.path.join('/case/file', node.attrib['src'])
    return tree


def fix_case_pixels(tree):
    for node in tree.xpath('.//*[@style]'):
        node.attrib['style'] = re.sub("(\d+)", r"\1px", node.attrib['style'], flags=re.DOTALL)
    return tree


def process_case_links(tree, db=None):
    index = 1
    for line in tree.xpath('.//div[text()]')[:]:
        match = re.search('\[%d\]' % index, line.text)
        if match:
            link = html.Element('span', {'data-location': '%s' % index, 'class': 'case-paragraph'})
            link.text = match.group(0)
            link.tail = line.text[len(match.group(0)):]
            line.text = None
            line.insert(0, link)
            index += 1
    return tree


def process_case(row=None, db=None, refresh=True, tree=None):
    if not tree:
        tree = html.fromstring(row.get('document'))
    tree = process_case_links(tree, db)
    with (db or get_db()).cursor() as cur:
        query = """UPDATE documents d SET processed_document =  %(doc)s
                    WHERE  d.id =  %(id)s """
        cur.execute(query, {
            'id': row.get('id'),
            'doc': etree.tostring(tree, encoding='UTF-8', method="html"),
        })
    (db or get_db()).commit()
    return tree


def process_case_contents(tree, db=None):
    results = []
    div_id = str(uuid.uuid4())
    tree.xpath('.//div')[0].insert(0, etree.Element('div', {'id': div_id,
        'data-location': 'Intituling', 'class': 'case-para'}))
    results.append(('Intituling', div_id))
    i = 1
    for span in tree.xpath('.//span'):
        if span.text and re.match('^ *\[%d+\]' % i, span.text):
            span_id = str(uuid.uuid4())
            results.append(('Paragraph %d' % i, span_id))
            span.attrib['id'] = span_id
            span.attrib['data-location'] = '[%d]' % i
            span.attrib['class'] = '%s %s' % (span.attrib['class'], 'case-para')
            i += 1
    return tree, render_template('case_contents.html', results=results)


def prep_case(result, replace, db):
    if not result or not result.get('id'):
        raise CustomException('Case not found')
    if replace or not result.get('processed_document'):
        tree = process_case(row=result, db=db)
    else:
        tree = html.fromstring(result.get('processed_document'))
    #if not result.get('skeleton'):
    #    skeleton, heights = process_skeleton(result.get('id'), tree, db=db)
    #else:
    #    skeleton = result.get('skeleton')
    #if not result.get('contents'):
    #    contents = process_contents(result.get('id'), tree, db=db)
    #else:
    #    contents = result.get('contents')
    contents = ''
    return Case(
        id=result.get('id'),
        tree=tree,
        #skeleton=skeleton,
        contents=contents,
        attributes=dict(result))


def get_case_object(document_id=None, db=None, replace=False):
    replace = True
    with (db or get_db()).cursor(cursor_factory=extras.RealDictCursor) as cur:
        query = """select * from documents d join cases c on c.id = d.id where d.id =  %(id)s"""
        cur.execute(query, {'id': document_id})
        return prep_case(cur.fetchone(), replace, db)


def case_skeleton_response(case):
    return {
        'html_content': etree.tostring(case.tree, encoding='UTF-8', method="html"),
        'html_contents_page': case.contents,
        'title': case.title,
        'full_title': case.title,
        'document_id': case.id,
        'doc_type': 'case',
        'attributes': case.attributes,
        #'format': 'skeleton',
        'format': 'full',
        'parts': {},
        'query': {
            'doc_type': 'case',
            'document_id': case.id,
            'find': 'full'
        }
    }


def query_case(args):
    find = args.get('find')
    if args.get('id'):
        case = get_case_object(document_id=args.get('id'))
        return case_skeleton_response(case)
    raise CustomException('Invalid search type')



