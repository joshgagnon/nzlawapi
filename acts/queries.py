# -*- coding: utf-8 -*-
from db import get_db
from util import CustomException, get_title, tohtml, safe_date, format_govt_date
import psycopg2
from psycopg2 import extras
from lxml import etree
from definitions import populate_definitions, process_definitions, Definitions, Definition
from instrument_es import insert_instrument_es
from links import process_instrument_links
from flask import render_template, current_app
import datetime
import time
import json
import tempfile
import os
from subprocess import Popen, PIPE
import shutil
import codecs
from copy import deepcopy
import re
import urllib


large_parser = etree.XMLParser(huge_tree=True)


class Instrument(object):
    def __init__(self, id, document, attributes, skeleton, tree=None, heights={}, title=None, definitions=None):
        self.id = id
        self.document = document
        self.skeleton = skeleton
        self.title = title or get_title(self.tree)
        self.heights = heights
        self.parts = []
        self.tree = tree
        self.definitions = definitions
        self.length = len(self.document)
        # will remove
        ignore = ['document', 'processed_document', 'attributes', 'skeleton', 'heights', 'contents', 'definitions']
        self.attributes = dict(((k, v) for k, v in attributes.items() if k not in ignore))

    def get_tree(self):
        if self.tree is None:
            self.tree = etree.fromstring(self.document, parser=large_parser)
        extra_formatting(self.tree, self.attributes.get('version', 0))

        return self.tree


def extra_formatting(tree, version):
    try:
        tree.attrib['formatted.assent'] = format_govt_date(safe_date(tree.attrib['date.assent']))
    except Exception: # ew
        pass
    try:
        tree.attrib['formatted.reprint'] = format_govt_date(safe_date(tree.xpath('.//reprint-date')[0].text))
    except Exception: # ew
        pass
    tree.attrib['version'] = '%.1f' % version




def measure_heights(html):
    css_path = os.path.abspath(os.path.join(current_app.config.get("BUILD_DIR"), 'css/style.css'))
    js = os.path.abspath(os.path.join(current_app.config.get("SCRIPT_DIR"), 'measure_heights.js'))
    tmp_dir = tempfile.mkdtemp()
    html_file = os.path.join(tmp_dir, 'instrument.html')
    result_file = os.path.join(tmp_dir, 'result.json')
    with codecs.open(html_file, 'w', encoding='utf8') as out_file, codecs.open(css_path, encoding='utf8') as css:
        out_file.write(render_template('instrument_parts.html', content=html, css=css.read()))
    p = Popen(['phantomjs', js, html_file, result_file], stdout=PIPE, stderr=PIPE)
    out, err = p.communicate()
    with open(result_file) as in_file:
        results = json.loads(in_file.read())
    shutil.rmtree(tmp_dir , ignore_errors=True)
    return results


def process_skeleton(id, tree, version, db=None):
    """ whoever wrote this is an asshole """
    """ don't check git blame  """
    parts = []
    extra_formatting(tree, version)
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

    #depth(html.getroot())
    for i, div in enumerate(html.xpath('.//div[@class="prov" or @class="schedule"][not(ancestor::div[@class="prov"] or ancestor::div[@class="schedule"] or ancestor::div[@class="amend"])]')):
        # if too big, try to gut
        title = ''
        try:
            for br in div.xpath('.//br'):
                br.tail = ' '+(br.tail or '')
            if div.attrib['class'] == 'prov':
                label = div.xpath('.//h5[@class="prov labelled"]')[0]
                for br in label.xpath('.//span[@class="label"]'):
                    br.tail = ' '+(br.tail or '')
                title = etree.tostring(label, encoding='UTF-8', method="text")
            else:
                label = deepcopy(div.xpath('.//td[@class="header"]')[0])
                for br in label.xpath('.//br'):
                    br.tail = ' '+(br.tail or '')
                title  = etree.tostring(label, encoding='UTF-8', method="text")
        except IndexError:
            pass
        parts.append((title, etree.tostring(div, encoding='UTF-8', method="html")))
        div.attrib['data-hook'] = '%d' % i
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

    db = db or get_db()
    with db.cursor() as cur:
        query = """UPDATE documents d SET skeleton =  %(skeleton)s
                    WHERE d.id =  %(id)s """
        cur.execute(query, {
            'id': id,
            'skeleton': skeleton
        })

    if len(parts):
        with db.cursor() as cur:
            cur.execute('DELETE FROM document_parts WHERE document_id = %(id)s', {'id': id})
            args_str = ','.join(cur.mogrify("(%s, %s, %s, %s)", (id, i, p[0], p[1])) for i, p in enumerate(parts))
            cur.execute('INSERT INTO document_parts (document_id, num, title, data) VALUES ' + args_str)

    db.commit()
    try:
        insert_instrument_es(id, db)
    except Exception, e:
        current_app.logger.error('Could not load %d into elasticsearch' % id)
        current_app.logger.error(e)
    return skeleton


def process_heights(id, tree, version, db=None):
    html = tohtml(tree)
    extra_formatting(tree, version)
    parts = False
    skeleton = etree.tostring(html, encoding='UTF-8', method="html")
    for i, div in enumerate(html.xpath('.//div[@class="prov" or @class="schedule"][not(ancestor::div[@class="prov"] or ancestor::div[@class="schedule"] or ancestor::div[@class="amend"])]')):
        div.attrib['data-hook'] = '%d' % i
        parts = True
    """ super expensive """
    heights = measure_heights(etree.tostring(html, encoding='UTF-8', method="html"))
    db = db or get_db()
    if parts:
        with db.cursor() as cur:
            query = """UPDATE documents d SET heights = %(heights)s
                        WHERE d.id =  %(id)s """
            cur.execute(query, {
                'id': id,
                'heights': json.dumps(heights)
            })
    db.commit()
    return heights


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


def add_parent_definitions(row, db=None, definitions=None,
    strategy={'links': process_instrument_links}):
    with (db or get_db()).cursor(cursor_factory=extras.RealDictCursor) as cur:
        # first recurse through parent chain
        cur.execute(""" SELECT *, exists(select 1 from latest_instruments where id=%(id)s) as latest
            FROM subordinates s
            JOIN instruments i ON parent_id = i.govt_id
            JOIN documents d on i.id = d.id
            WHERE processed_document is null  and child_id = %(id)s AND title != %(title)s """,
            row)

        for result in cur.fetchall():
            current_app.logger.info('Parent: %s' % result.get('title'))
            processed_parent = True
            title = unicode(result.get('title').decode('utf-8'))
            if title not in definitions.titles:
                if not result.get('processed_document'):
                    tree, parent_definitions = process_instrument(
                        row=result, db=db,
                        latest=result.get('latest'),
                        strategy=strategy)

        cur.execute(""" select * from parent_definitions(%(id)s) """, {'id': row.get('id')})
        defs = cur.fetchall()
        for d in defs:
            def_dict = dict(d)
            def_dict['keys'] = map(lambda x: unicode(x.decode('utf-8')), def_dict.pop('words'))
            def_dict['full_word'] =unicode(def_dict['full_word'].decode('utf-8'))
            def_dict['expiry_tags'] = filter(lambda x: x, def_dict['expiry_tags'] )
            # warning, this is not exclusive yet
            for exp in def_dict.get('expiry_tags')[:]:
                if exp.startswith('maxdate:'):
                    if row.get('date_assent') and row.get('date_assent') < safe_date(exp[len('maxdate:'):]):
                        def_dict['expiry_tags'] = []

            definitions.add(Definition(**def_dict), external=True)

    return definitions


def process_instrument(row=None, db=None, refresh=False, tree=None, latest=False,
        strategy={'links': process_instrument_links}):
    current_app.logger.info('Processing: %s' % row.get('title'))
    if not tree:
        tree = etree.fromstring(row.get('document'), parser=large_parser)
    if not row.get('latest', True):
        tree.attrib['old-version'] = 'true'

    definitions = Definitions()

    format_dates(tree)
    start = time.time()
    tree = strategy['links'](tree, db)
    current_app.logger.debug('Populated Links in %.2f seconds' % (time.time() - start))
    title = unicode(row.get('title').decode('utf-8'))
    start = time.time()
    tree, definitions = populate_definitions(tree, definitions=definitions,
        title=title, expire=True, document_id=row.get('id'))

    current_app.logger.debug('Populated Definitions in %.2f seconds' % (time.time() - start))
    definitions = add_parent_definitions(row, definitions=definitions, db=db,
        strategy=strategy)
    # now mark them

    start = time.time()
    tree, definitions = process_definitions(tree, definitions)
    current_app.logger.debug('Found Definitions in %.2f seconds' % (time.time() - start))

    with (db or get_db()).cursor() as cur:
        query = """UPDATE documents d SET processed_document =  %(doc)s
                    WHERE  d.id =  %(id)s """
        cur.execute(query, {
            'id': row.get('id'),
            'doc': etree.tostring(tree, encoding='UTF-8', method="html"),
        })
        defs = definitions.render(document_id=row.get('id'))
        if len(defs):
            current_app.logger.info('New Definitions: %d' % len(defs))
            args_str = ','.join(cur.mogrify("(%s,%s,%s,%s,%s,%s,%s)", (row.get('id'), x['id'],  x['full_word'], x['keys'], x['html'], x['expiry_tags'], x['priority']))
                for x in defs)
            cur.execute("DELETE FROM definitions where document_id = %(id)s", {'id': row.get('id')})
            cur.execute("INSERT INTO definitions (document_id, id, full_word, words, html, expiry_tags, priority) VALUES " + args_str)
        if refresh:
            cur.execute("select update_views()")
    (db or get_db()).commit()
    return tree, definitions


def fetch_parts(doc_id, db=None, parts=None):
    with (db or get_db()).cursor() as cur:
        if not parts:
            cur.execute('SELECT num, data from document_parts WHERE document_id = %(doc_id)s ORDER BY num asc',
                {'doc_id': doc_id})
        else:
            cur.execute('SELECT num, data from document_parts WHERE document_id = %(doc_id)s  and num = ANY(%(parts)s) ORDER BY num asc',
                    {'doc_id': doc_id, 'parts': parts})
        return dict(map(lambda x: ('%s' % x[0], x[1]), cur.fetchall()))



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
            select document, id from latest_instruments
            where (%(title)s is  null or title = %(title)s) and (%(id)s is null or id =  %(id)s)
             """
        cur.execute(query, {'title': title, 'id': doc_id})
        try:
            result = cur.fetchone()
            return etree.fromstring(result[0], parser=large_parser), result[1]
        except:
            raise CustomException("Instrument not found")


def get_references(document_id):
    db = get_db()
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""select * from get_references(%(id)s)""", {'id': document_id})
        return {'references': map(lambda x: dict(x), cur.fetchall())}


def get_section_references(target_document_id, govt_ids, target_path):
    db = get_db()
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""select * from get_section_references(%(target_document_id)s, %(govt_ids)s, %(target_path)s)""",
            {'govt_ids': govt_ids, 'target_path': '%s' % re.escape(target_path), 'target_document_id': target_document_id})
        results = cur.fetchall()
        return {'section_references': map(lambda x: dict(x), results)}


def section_references(args):
    sections = get_section_references(args.get('document_id'),
                (args.get('govt_ids') or '').split(','),
                args.get('target_path'))['section_references']
    document_id = int(args.get('document_id'))
    with get_db().cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""select title from instruments where id = %(id)s""",
            {'id': document_id})
        title = unicode(cur.fetchone()['title'].decode('utf-8'))
    for s in sections:
        s['url'] = unicode(s['url'].decode('utf-8'))
        s['repr'] = unicode(s['repr'].decode('utf-8'))
    external = filter(lambda x: x['source_document_id'] != document_id, sections)
    internal = filter(lambda x: x['source_document_id'] == document_id, sections)
    return {'html': render_template('section_refs.html',
        title='%s %s' % (title, args.get('target_path')), external=external, internal=internal)}


def section_versions(args):
    document_id = int(args.get('document_id'))
    versions = get_versions(document_id)
    title = filter(lambda x: x['id'] == document_id, versions['versions'])[0]['title']
    version_list = []
    for v in versions['versions']:
        if v['id'] != document_id:
            v['url'] = 'query?%s' % urllib.urlencode({
                'location': args.get('target_path'),
                'doc_type': 'instrument',
                'find': 'location',
                'document_id': v['id']
                })
            v['formatted_date'] = format_govt_date(v['date_as_at'])
            version_list.append(v)
    return {'html': render_template('section_versions.html', versions=version_list,
        title='%s %s' % (title, args.get('target_path')), path=args.get('target_path'))}


def get_versions(document_id):
    db = get_db()
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""select * from get_versions(%(id)s)""", {'id': document_id})
        return {'versions': map(lambda x: dict(x), cur.fetchall())}


def get_contents(document_id):
    db = get_db()
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(""" SELECT contents from documents WHERE id = %(document_id)s""",
            {'document_id': document_id})
        result = cur.fetchone()

        if not result.get('contents'):
            contents = process_contents(document_id,
                etree.fromstring(get_instrument_object(document_id).document, parser=large_parser), db=db)
        else:
            contents = result.get('contents')
        return {'html': contents}

def get_summary(document_id):
    db = get_db()
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(""" SELECT title, type, subtype, number, version,
            to_char( date_assent, 'dd Month YYYY') as date_assent,  to_char(date_first_valid, 'dd Month YYYY') as date_first_valid, year
            from instruments WHERE id = %(document_id)s""",
            {'document_id': document_id})
        attributes = cur.fetchone()
        cur.execute(""" select i.title, i.id, count(i.id) from amendments a
                join instruments i on a.source_govt_id = i.govt_id
                join latest_instruments l on l.id = i.id
                where target_document_id = %(document_id)s group by i.title, i.id order by count desc""",
            {'document_id': document_id})
        amending = cur.fetchall()
        cur.execute(""" select i.title, i.id from subordinates s
            join newest n on s.parent_id = n.govt_id
            join instruments i on n.id = i.id where s.child_id = %(document_id)s
            and title != 'Interpretation Act 1999' """,
            {'document_id': document_id})

        parent = cur.fetchone()
        cur.execute(""" select ii.title, ii.id from instruments i
            join subordinates s on i.govt_id = s.parent_id
        join newest n on s.child_id = n.id
            join instruments ii  on ii.id = n.id
            where i.id = %(document_id)s
            and ii.type = 'regulation'
            and i.title != 'Interpretation Act 1999'
            order by ii.year desc """,
            {'document_id': document_id})
        subordinate = cur.fetchall()
        return {'attributes': attributes, 'amending': amending, 'parent': parent, 'subordinate': subordinate}


def prep_instrument(result, replace, db):
    if not result:
        raise CustomException('Instrument not found')
    tree = None
    definitions = None
    redo_skele = False

    if replace or not result.get('processed_document'):
        tree, definitions = process_instrument(
            row=get_unprocessed_instrument(result.get('id'), db=db),
            db=db, latest=result.get('latest'), refresh=replace)
        document = etree.tostring(tree, encoding='UTF-8', method="html")
        redo_skele = True
    else:
        document = result.get('processed_document')
    if redo_skele or not result.get('skeleton'):
        skeleton = process_skeleton(result.get('id'), tree if tree is not None else etree.fromstring(document, parser=large_parser),
            db=db, version=result.get('version'))
    else:
        skeleton = result.get('skeleton')
    if redo_skele or not result.get('heights'):
        heights = process_heights(result.get('id'), tree if tree is not None else etree.fromstring(document, parser=large_parser),
            db=db, version=result.get('version'))
    else:
        heights = result.get('heights')

    return Instrument(
        id=result.get('id'),
        document=document,
        skeleton=skeleton,
        heights=heights,
        title=result.get('title'),
        attributes=result)


def get_instrument_object(id=None, db=None, replace=False):
    try:
        with (db or get_db()).cursor(cursor_factory=extras.RealDictCursor) as cur:
            query = """SELECT * from get_processed_instrument(%(id)s) """
            cur.execute(query, {'id': id})
            return prep_instrument(dict(cur.fetchone()), replace, db)
    except TypeError:
        raise CustomException('Document does not exist')

def get_unprocessed_instrument(id=None, db=None):
    with (db or get_db()).cursor(cursor_factory=extras.RealDictCursor) as cur:
        query = """SELECT * from get_unprocessed_instrument(%(id)s) """
        cur.execute(query, {'id': id})
        return cur.fetchone()


def get_latest_instrument_object(instrument_name=None, id=None, db=None, replace=False):
    with (db or get_db()).cursor(cursor_factory=extras.RealDictCursor) as cur:
        # why the join
        query = """SELECT *, true as latest FROM latest_instruments i
                JOIN documents d on d.id = i.id
                where (%(instrument_name)s is null or title= %(instrument_name)s) and (%(id)s is null or i.id =  %(id)s)
            """
        cur.execute(query, {'instrument_name': instrument_name, 'id': id})
        return prep_instrument(cur.fetchone(), replace, db)
