# -*- coding: utf-8 -*-
from elasticsearch import Elasticsearch, exceptions, helpers
import psycopg2
from psycopg2 import extras, errorcodes
from lxml import etree
from lxml.html import HTMLParser, fromstring
import psycopg2
import sys
from psycopg2 import extras
from os import path
import importlib
import os
from multiprocessing import Pool


def get_db(config_filename):
    config = importlib.import_module(config_filename.replace('.py', ''), 'parent')
    db = psycopg2.connect(
        database=config.DB,
        user=config.DB_USER,
        host=config.DB_HOST,
        password=config.DB_PW)
    db.set_client_encoding('utf8')
    return db

def chunks(l, n):
    for i in xrange(0, len(l), n):
        yield l[i:i+n]


def run_process((config_filename, ids)):
    from acts import acts
    from acts import queries
    from acts import links
    import server
    sys.path.append( path.dirname( path.dirname( path.abspath(__file__) ) ) )
    try:
        db = get_db(config_filename)
        with db.cursor(cursor_factory=extras.RealDictCursor) as cur, server.app.test_request_context():
            for document_id in ids:
                query = """SELECT *, exists(select 1 from latest_instruments where id=i.id) as latest FROM instruments i
                        JOIN documents d on d.id = i.id
                        and i.id = %(id)s """

                cur.execute(query, {'id': document_id})
                result = cur.fetchall()
                if not len(result):
                    continue
                print result[0].get('title')
                queries.process_skeleton(result[0].get('id'), etree.fromstring(result[0]['processed_document'], parser=queries.large_parser), db=db, measure=False)
    except KeyboardInterrupt:
        pass
    finally:
        db.close()
    return True

if __name__ == "__main__":
    if not len(sys.argv) > 1:
        raise Exception('Missing configuration file')
    sys.path.append(os.getcwd())
    db = get_db(sys.argv[1])
    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        try:
            query = """SELECT i.id as id FROM instruments i
                    JOIN documents d on d.id = i.id"""
            cur.execute(query)
            results = cur.fetchall()
            if len(results):
                processes = min(int(sys.argv[2] if len(sys.argv) > 2 else 2), len(results))
                pool = Pool(processes=processes)
                args = map(lambda x: (sys.argv[1], x), (list(chunks(map(lambda x: x['id'], results),
                           len(results) / processes + len(results) % processes))))
                pool.map(run_process, (args))
                pool.close()
                pool.join()
        except KeyboardInterrupt:
            print "Keyboard interrupt in main"
        finally:
            print "Cleaning up Main"
            #cur.execute('REFRESH MATERIALIZED VIEW latest_instruments')
    db.close()