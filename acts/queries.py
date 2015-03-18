# -*- coding: utf-8 -*-
from db import get_db
from util import CustomException, get_title, etree_to_dict, tohtml
import psycopg2
from psycopg2 import extras
from lxml import etree
from definitions import populate_definitions, process_definitions, Definitions
from links import process_instrument_links
from flask import render_template, current_app
import datetime
import json
import tempfile
import os
from subprocess import Popen, PIPE
import shutil
import codecs


class Instrument(object):
    def __init__(self, id, tree, attributes, skeleton, contents, heights):
        self.id = id
        self.tree = tree
        self.skeleton = skeleton
        self.contents = contents
        self.title = get_title(self.tree) # NO!
        self.heights = heights
        self.parts = []
        ignore = ['document', 'processed_document', 'attributes', 'skeleton', 'heights', 'contents']
        self.attributes = dict(((k, v) for k, v in attributes.items() if k not in ignore and v))
        format_dates(self.tree)



def format_dates(tree):
    try:
        assent_date = datetime.datetime.strptime(tree.attrib['date.assent'], "%Y-%m-%d").date()
        tree.attrib['formatted.assent'] = assent_date.strftime('%d %B %Y')
    except:
        pass
    try:
        reprint_date = datetime.datetime.strptime(tree.xpath('.//reprint-date')[0].text, "%Y-%m-%d").date()
        tree.attrib['formatted.reprint'] = reprint_date.strftime('%d %B %Y')
    except:
        pass


def measure_heights(html):
    css_path = os.path.abspath(os.path.join(current_app.config.get("BUILD_DIR"), 'css/style.css'))
    js = os.path.abspath(os.path.join(current_app.config.get("SCRIPT_DIR"), 'measure_heights.js'))
    tmp_dir = tempfile.mkdtemp()
    html_file = os.path.join(tmp_dir, 'instrument.html')
    result_file = os.path.join(tmp_dir, 'result.json')
    with codecs.open(html_file, 'w', encoding='utf8') as out_file, codecs.open(css_path, encoding='utf8') as css:
        out_file.write(render_template('instrument_parts.html', content=html, css=css.read()))
    p = Popen(['phantomjs', js, html_file, result_file], stdout=PIPE, stderr=PIPE)
    print html_file
    out, err = p.communicate()
    with open(result_file) as in_file:
        results = json.loads(in_file.read())
    shutil.rmtree(tmp_dir , ignore_errors=True)
    return results


def process_skeleton(id, tree, db=None):
    parts = []
    format_dates(tree)
    html = tohtml(tree)
    max_size = 20000
    min_size = 200
    i = [0]

    def wrap(tag, nodes):
        string = ''.join([etree.tostring(n, encoding='UTF-8', method="html") for n in nodes])
        if len(string) < min_size:
            return nodes
        div = etree.Element(tag)
        div.attrib['data-hook'] = '%d' % len(parts)
        div[:] = nodes
        parts.append(string)
        return [div]

    def depth(node):
        running = 0
        to_join = []
        results = []
        for j, n in list(enumerate(node)):
            length = len(etree.tostring(n))
            if n.tag == 'table':
                if len(to_join):
                    results += wrap(n.tag, to_join)
                    to_join = []
                results += wrap('div', [n])

            elif length > max_size:
                if len(to_join):
                    results += wrap('div', to_join)
                    to_join = []
                running = 0
                results += [depth(n)]
            else:
                if running + length > max_size:
                    results += wrap('div', to_join)
                    to_join = [n]
                    running = 0
                else:
                    running += len(etree.tostring(n))
                    to_join.append(n)
        if len(to_join):
            results += wrap('div', to_join)
        node[:] = results
        return node

    depth(html.getroot())
    """ super expensive """
    heights = measure_heights(etree.tostring(html, encoding='UTF-8', method="html"))

    """ Now remove all the parts' children, saving things we may need to look up """
    for el in html.xpath('.//*[@data-hook]'):
        ids = ';'.join(map(lambda e: e.attrib['id'], el.xpath('.//*[@id]')))
        locations = ';'.join(map(lambda e: e.attrib['data-location'], el.xpath('.//*[@data-location]')))
        el.attrib['data-child-ids'] = ids
        el.attrib['data-child-locations'] = locations
        el[:] = []

    skeleton = etree.tostring(html, encoding='UTF-8', method="html")
    with (db or get_db()).cursor() as cur:
        query = """UPDATE documents d SET skeleton =  %(skeleton)s, heights = %(heights)s
                    WHERE d.id =  %(id)s """
        cur.execute(query, {
            'id': id,
            'skeleton': skeleton,
            'heights': json.dumps(heights)
        })
        cur.execute('DELETE FROM document_parts WHERE document_id = %(id)s', {'id': id})
        args_str = ','.join(cur.mogrify("(%s,%s,%s)", (id, i, p)) for i, p in enumerate(parts))
        cur.execute('INSERT INTO document_parts (document_id, num, data) VALUES ' + args_str)

    (db or get_db()).commit()
    return skeleton, heights


def process_contents(id, tree, db=None):
    with (db or get_db()).cursor() as cur:
        contents = etree.tostring(tohtml(tree, os.path.join('xslt', 'contents.xslt')), encoding='UTF-8', method="html")
        query = """UPDATE documents d SET contents=  %(contents)s
                    WHERE d.id =  %(id)s """
        cur.execute(query, {
            'id': id,
            'contents': contents})
    (db or get_db()).commit()
    return contents


def process_instrument(row=None, db=None, definitions=None, refresh=True, tree=None):
    if not tree:
        tree = etree.fromstring(row.get('document'))
    if not definitions:
        if row.get('title') != 'Interpretation Act 1999':
            _, definitions = populate_definitions(get_act_exact('Interpretation Act 1999', db=db))
        else:
            definitions = Definitions()
    tree = process_instrument_links(tree, db)
    tree, definitions = process_definitions(tree, definitions)
    with (db or get_db()).cursor() as cur:
        query = """UPDATE documents d SET processed_document =  %(doc)s
                    WHERE  d.id =  %(id)s """
        cur.execute(query, {
            'id': row.get('id'),
            'doc': etree.tostring(tree, encoding='UTF-8', method="html"),
        })
        args_str = ','.join(cur.mogrify("(%s,%s,%s)", (row.get('id'), x[0], json.dumps(x[1]))) for x in definitions.render().items())
        cur.execute("DELETE FROM definitions where document_id = %(id)s", {'id': row.get('id')})
        cur.execute("INSERT INTO definitions (document_id, key, data) VALUES " + args_str)
        if refresh:
            cur.execute("REFRESH MATERIALIZED VIEW latest_instruments")
    (db or get_db()).commit()
    row.get('id')
    return tree


def fetch_parts(doc_id, db=None, parts=None):
    with (db or get_db()).cursor() as cur:
        if not parts:
            cur.execute('SELECT num, data from document_parts WHERE document_id = %(doc_id)s ORDER BY num asc',
                {'doc_id': doc_id})
        else:
            cur.execute('SELECT num, data from document_parts WHERE document_id = %(doc_id)s  and num = ANY(%(parts)s) ORDER BY num asc',
                    {'doc_id': doc_id, 'parts': parts})
        return dict(map(lambda x: ('%s' % x[0], x[1]), cur.fetchall()))


def prep_instrument(result, replace, db):
    if not result.get('id'):
        raise CustomException('Instrument not found')
    if replace or not result.get('processed_document'):
        tree = process_instrument(row=result, db=db)
    else:
        tree = etree.fromstring(result.get('processed_document'))
    if not result.get('latest'):
        tree.attrib['old-version'] = 'true'
    if not result.get('skeleton'):
        skeleton, heights = process_skeleton(result.get('id'), tree, db=db)
    else:
        skeleton = result.get('skeleton')
        heights = result.get('heights')
    if not result.get('contents'):
        contents = process_contents(result.get('id'), tree, db=db)
    else:
        contents = result.get('contents')

    return Instrument(
        id=result.get('id'),
        tree=tree,
        skeleton=skeleton,
        contents=contents,
        heights=heights,
        attributes=dict(result))


def get_act_summary(doc_id, db=None):
    with (db or get_db()).cursor(cursor_factory=extras.RealDictCursor) as cur:
        query = """select * from instruments
        where id = %(doc_id)s """
        cur.execute(query, {'doc_id': doc_id})
        try:
            return cur.fetchone()
        except:
            raise CustomException("Instrument not found")


def get_act_summary_govt_id(govt_id, db=None):
    with (db or get_db()).cursor(cursor_factory=extras.RealDictCursor) as cur:
        query = """select *
            from id_lookup d
            join instruments i on parent_id = id
            where d.govt_id = %(govt_id)s"""
        cur.execute(query, {'govt_id': govt_id})
        try:
            return cur.fetchone()
        except:
            raise CustomException("Instrument not found")


def get_act_exact(title=None, doc_id=None, db=None):
    with (db or get_db()).cursor() as cur:
        query = """
            select document from latest_instruments
            where (%(title)s is  null or title = %(title)s) and (%(id)s is null or id =  %(id)s)
             """
        cur.execute(query, {'title': title, 'id': doc_id})
        try:
            result = cur.fetchone()
            return etree.fromstring(result[0])
        except:
            raise CustomException("Instrument not found")


def get_references(document_id):
    db = get_db()
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT d.source_id as id, title, count, type FROM document_references d
            LEFT OUTER JOIN instruments i on i.id = d.source_id
            LEFT OUTER JOIN cases c on c.id = d.source_id
            WHERE target_id = %(id)s
            ORDER BY count DESC
            """, {'id': document_id})
        return {'references': map(lambda x: dict(x), cur.fetchall())}


def get_section_references(govt_ids):
    db = get_db()
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT source_document_id, repr, url
            FROM section_references  d
            WHERE target_govt_id = ANY(%(govt_ids)s) ORDER by repr
            """, {'govt_ids': govt_ids})
        return {'section_references': map(lambda x: dict(x), cur.fetchall())}


def get_versions(document_id):
    db = get_db()
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
                select i.title, i.id, i.date_as_at, i.type from
                    (select id, govt_id from instruments) as s
                    join instruments i on i.govt_id = s.govt_id
                    where s.id = %(id)s order by i.date_as_at desc
            """, {'id': document_id})
        return {'versions': map(lambda x: dict(x), cur.fetchall())}


def get_instrument_object(id=None, db=None, replace=False):
    with (db or get_db()).cursor(cursor_factory=extras.RealDictCursor) as cur:
        query = """SELECT *, exists(select 1 from latest_instruments where id=%(id)s) as latest FROM instruments i
                JOIN documents d on d.id = i.id
                where i.id =  %(id)s
            """
        cur.execute(query, {'id': id})
        return prep_instrument(cur.fetchone(), replace, db)


def get_latest_instrument_object(instrument_name=None, id=None, db=None, replace=False):
    with (db or get_db()).cursor(cursor_factory=extras.RealDictCursor) as cur:
        query = """SELECT *, true as latest FROM latest_instruments i
                JOIN documents d on d.id = i.id
                where (%(instrument_name)s is null or title= %(instrument_name)s) and (%(id)s is null or i.id =  %(id)s)
            """
        cur.execute(query, {'instrument_name': instrument_name, 'id': id})
        return prep_instrument(cur.fetchone(), replace, db)
