from util import CustomException
import psycopg2
import psycopg2.extras
from flask import g
from lxml import etree

def get_db():
    if not hasattr(g, 'db'):
        g.db = connect_db()
    return g.db

def connect_db():
    conn = psycopg2.connect("dbname=legislation user=josh")
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