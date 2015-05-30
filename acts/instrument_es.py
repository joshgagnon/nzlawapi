from elasticsearch import Elasticsearch, exceptions, helpers
from lxml import etree
from lxml.html import HTMLParser, fromstring
from db import get_db
from util import large_parser
import psycopg2
from psycopg2 import extras, errorcodes
from flask import current_app
import logging
import re

def strip_html(result):
    result = dict(result)
    tree = etree.fromstring(result['document'], parser=large_parser)
    to_remove = ['skeleton', 'history', 'history-note']
    for r in to_remove:
        for t in tree.findall(r):
            t.getparent().remove(t)
    for node in tree.iter():
        if node.text:
            node.text = node.text + ' '
        if node.tail:
            node.tail = node.tail + ' '
    result['document'] = etree.tostring(tree, method="text", encoding="utf-8")
    result['document'] = re.sub(' +', ' ', result['document'])
    return result


instrument_query = """SELECT title, exists(select 1 from newest i where i.id=%(id)s) as latest, i.id as id, i.govt_id, i.version, i.type,  i.date_first_valid, i.date_as_at, i.stage,
        i.date_assent, i.date_gazetted, i.date_terminated, i.date_imprint, i.year , i.repealed,
        i.in_amend, i.pco_suffix, i.raised_by, i.subtype, i.terminated, i.date_signed, i.imperial, i.official, i.path,
        i.instructing_office, i.number, processed_document as document, (i.type = 'bill' and bill_enacted) as bill_enacted
        FROM instruments i join documents d on i.id = d.id
        LEFT OUTER JOIN (select govt_id, true as bill_enacted from instruments l where l.type = 'act' or  l.type = 'regulation' group by govt_id) sub on i.govt_id = sub.govt_id
        where i.id = %(id)s """


def update_document_es(document_id, db=None):
    es = current_app.extensions['elasticsearch']
    db = db or get_db()
    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        current_app.logger.info('Insert document into es')
        cur.execute(instrument_query, {"id": document_id})
        result = cur.fetchone()
        result = strip_html(result)
        es.index(index='legislation', doc_type='instrument', body=result, id=result['id'])


def insert_instrument_es(document_id, db=None):
    es = current_app.extensions['elasticsearch']
    db = db or get_db()
    update_document_es(document_id, db)
    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        current_app.logger.info('Insert definitions into es')
        cur.execute(""" SELECT document_id, html, id, full_word FROM definitions
            where document_id = %(id)s """, {"id": document_id})
        results = cur.fetchall()
        helpers.bulk(es, map(lambda x: {"_id": x['id'], "_parent": x['document_id'],
            "_source": dict(x), "_index":'legislation', "_type": 'definition'}, results))

    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        current_app.logger.info('Insert parts into es')
        cur.execute(""" SELECT document_id, document_id || '-' || num as id, num, data as html, title FROM document_parts
                        where document_id = %(id)s """, {"id": document_id})
        results = cur.fetchall()
        helpers.bulk(es, map(lambda x: {"_id": x['id'], "_parent": x['document_id'],
            "_source": dict(x), "_index":'legislation', "_type": 'part'}, results))
    # close transactions
    db.commit()
    es.indices.refresh(index="legislation")
    return

def update_old_versions_es(document_ids, db=None):
    es = current_app.extensions['elasticsearch']
    db = db or get_db()
    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        current_app.logger.info('Updating old versions into es')
        query = """select id from instruments i
            join (select govt_id from instruments where id  = ANY(%(ids)s::int[])) sub on i.govt_id = sub.govt_id
            where NOT (i.id = ANY(%(ids)s::int[]))"""
        cur.execute(query, {'ids': document_ids})
        for result in cur.fetchall():
            update_document_es(result['id'], db)


def delete_instrument_es(document_id):
    es = current_app.extensions['elasticsearch']
    try:
        es.delete(index='legislation', doc_type='instrument',  id=document_id)
        es.indices.refresh(index="legislation")
    except exceptions.NotFoundError: pass


