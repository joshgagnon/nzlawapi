from db import get_db
from util import CustomException, get_title, etree_to_dict, tohtml
import psycopg2
from psycopg2 import extras
from lxml import etree
from definitions import populate_definitions, process_definitions, Definitions
from links import process_instrument_links
from copy import deepcopy
import datetime
import json


class Instrument(object):
    def __init__(self, id, tree, attributes):
        self.id = id
        self.tree = tree

        self.title = get_title(self.tree)
        self.hook_match = '/*/*/*/*/*'
        self.parts = {}
        ignore = ['document', 'processed_document', 'attributes']
        self.attributes = dict(((k, v) for k, v in attributes.items() if k not in ignore and v))
        self.format_dates()

    def format_dates(self):
        try:
            assent_date = datetime.datetime.strptime(self.tree.attrib['date.assent'], "%Y-%m-%d").date()
            self.tree.attrib['formatted.assent'] = assent_date.strftime('%d %B %Y')
        except:
            pass
        try:
            reprint_date = datetime.datetime.strptime(self.tree.xpath('.//reprint-date')[0].text, "%Y-%m-%d").date()
            self.tree.attrib['formatted.reprint'] = reprint_date.strftime('%d %B %Y')
        except:
            pass

    def calculate_hooks(self):
        html = tohtml(self.tree)
        i = 0
        for e in html.xpath(self.hook_match):
            length = len(etree.tostring(e))
            if length > 1000:
                e.attrib['data-hook'] = '%d' % i
                e.attrib['data-hook-length'] = '%d' % length
                self.parts[e.attrib['data-hook']] = deepcopy(e)
                e[:] = []
                i += 1
        self.skeleton = etree_to_dict(html.getroot())

    def select(self, requested):
        return [self.parts[i] for i in requested]


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
                    FROM instruments s
                    WHERE d.id = s.id and  (%(id)s is null or d.id =  %(id)s) returning d.id"""
        cur.execute(query, {
            'id': row.get('id'),
            'doc': etree.tostring(tree, encoding='UTF-8', method="html"),
        })
        id = cur.fetchone()[0]
        args_str = ','.join(cur.mogrify("(%s,%s,%s)", (id, x[0], json.dumps(x[1]))) for x in definitions.render().items())
        cur.execute("DELETE FROM definitions where document_id = %(id)s", {'id': id})
        cur.execute("INSERT INTO definitions (document_id, key, data) VALUES " + args_str)
        if refresh:
            cur.execute("REFRESH MATERIALIZED VIEW latest_instruments")
    (db or get_db()).commit()
    return tree, definitions.render()


def prep_instrument(result, replace, db):
    if not result.get('id'):
        raise CustomException('Instrument not found')
    if replace or not result.get('processed_document'):
        tree, _ = process_instrument(row=result, db=db)
    else:
        tree = etree.fromstring(result.get('processed_document'))

    return Instrument(id=result.get('id'), tree=tree, attributes=dict(result))


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
