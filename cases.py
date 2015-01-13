from db import get_db
import elasticsearch
import psycopg2
from flask import render_template, current_app
import os
import uuid
from lxml import etree
import re

es = elasticsearch.Elasticsearch()


def act_full_search(query):
    result = es.search(
        index="legislation",
        doc_type='act',
        body={
            "from": 0, "size": 25,
            "fields": ["id", "title"],
            "sort": [
                "_score",
            ],
            "query": {"query_string": {"query": query}},
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


def fix_case_structure(tree):
    tree.tag = 'div'
    tree.attrib['class'] = 'case'
    tree.remove(tree.xpath('./head')[0])
    for a in tree.xpath('./body/a'):
        div = a.getnext()
        div.attrib['class'] = 'page'
        div.attrib['name'] = a.attrib['name']
        page_num = etree.Element('div', {'class': 'page_number'})
        page_num.text = 'Page %s' % div.attrib['name']
        divider = etree.Element('div', {'class': 'divider'})
        div.append(page_num)
        div.append(divider)
        a.getparent().remove(a)
    return tree


def process_case(tree):
    tree = fix_case_structure(tree)
    tree = fix_case_paths(tree)
    tree = fix_case_pixels(tree)
    return tree


def process_case_contents(tree):
    results = []
    start = tree.xpath('.//div')[0]
    div_id = str(uuid.uuid4())
    results.append(('Intituling', div_id))
    start.attrib['id'] = div_id
    i = 1
    for span in tree.xpath('.//span'):
        if re.match('^ *\[%d+\]' % i, span.text):
            span_id = str(uuid.uuid4())
            results.append(('Section %d' % i, span_id))
            span.attrib['id'] = span_id
            i += 1
    return tree, render_template('case_contents.html', results=results)


def get_full_case(case):
    with get_db().cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        query = """select * from cases where full_citation = %(case)s """
        cur.execute(query, {'case': case})
        results = cur.fetchone()
        print os.path.join(current_app.config['CASE_DIR'], results.get('id'))
        with open(os.path.join(current_app.config['CASE_DIR'], results.get('id')), 'U') as f:
            tree = process_case(etree.HTML(f.read()))
            tree, contents = process_case_contents(tree)
            return {
                'html_content': etree.tostring(tree),
                'html_contents_page': contents,
                'full_citation': results.get('full_citation')
            }
    return results
