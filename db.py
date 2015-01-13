from util import CustomException
import psycopg2
import psycopg2.extras
from flask import g, current_app
from lxml import etree


def get_db():
    if not hasattr(g, 'db'):
        g.db = connect_db()
    return g.db

def connect_db():
    conn = psycopg2.connect(database=current_app.config['DB'], user=current_app.config['DB_USER'], password=current_app.config['DB_PW'])
    return conn

def init_db():
    pass

def get_act(act, db=None):
    with (db or get_db()).cursor() as cur:
        query = """select document from acts a 
        join documents d on a.document_id = d.id
        where lower(replace(title, ' ', '')) = lower(%(act)s)
         order by version desc limit 1; """
        cur.execute(query, {'act': act})
        try:
            return etree.fromstring(cur.fetchone()[0])
        except:
            raise CustomException("Act not found")

def get_act_exact(act, db=None):
    with (db or get_db()).cursor() as cur:
        query = """
            (select document, version, path
        from acts a join documents d on a.document_id = d.id
            where lower(title) = lower(%(act)s))
        union 
            (select document, version, path
        from regulations a join documents d on a.document_id = d.id
            where lower(title) = lower(%(act)s))      
            order by version desc limit 1; """

        cur.execute(query, {'act': act})
        try:
            result = cur.fetchone()
            print result[2]
            return etree.fromstring(result[0])
        except:
            raise CustomException("Act not found")


def get_document_from_title(title, db=None):
    with (db or get_db()).cursor() as cur:
        cur.execute("""
            select title as name, q.type, document from
                ((select trim(full_citation) as title, 'case' as type, null as document_id from cases
            where trim(full_citation) = %(title)s
                ) 
                union
                (select trim(title) as title, 'act' as type, document_id from acts
            where title = %(title)s
            order by version desc limit 1
                ) 
                union 
                (select trim(title) as title, 'regulation' as type, document_id from regulations
            where title = %(title)s
            order by version desc limit 1
                )) q
            left outer join documents d on q.document_id = d.id
            """, {'title': title})
        return cur.fetchone()