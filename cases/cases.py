from db import get_db
import elasticsearch
import psycopg2
from flask import render_template, current_app
from util import CustomException
import os
import uuid
from lxml import etree
import re



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


def get_full_case(id=None):
    try:
        with get_db().cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            query = """select * from documents d join cases c on c.id = d.id where d.id =  %(id)s"""
            cur.execute(query, {'id': id})
            results = cur.fetchone()

            tree = etree.HTML(results['document'])
            #tree, contents = process_case_contents(tree)
            return {
                'html_content': etree.tostring(tree, encoding='UTF-8', method="html"),
                'html_contents_page': '', #contents,
                'title': results.get('full_citation'),
                'type': 'case'
            }
        return results
    except (psycopg2.DataError, AttributeError):
        raise CustomException('Case not found')
