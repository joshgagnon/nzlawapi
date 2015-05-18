import psycopg2
import sys
from psycopg2 import extras
from os import path
import importlib
import os
from multiprocessing import Pool
from lxml import etree

def get_db(config_filename):
    config = importlib.import_module(config_filename.replace('.py', ''), 'parent')
    db = psycopg2.connect(
        database=config.DB,
        user=config.DB_USER,
        host=config.DB_HOST,
        password=config.DB_PW)
    db.set_client_encoding('utf8')
    return db


def get_total(db):
    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        query = """select count(*) as count from instruments i join documents d on i.id = d.id where processed_document is null """
        cur.execute(query)
        return cur.fetchone()['count']


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

        link_store = links.get_links(db)

        def get_links(tree, db):
            return links.process_instrument_links(tree, db, links=link_store)

        with db.cursor(cursor_factory=extras.RealDictCursor) as cur, server.app.test_request_context():
            for document_id in ids:
                query = """SELECT *, exists(select 1 from latest_instruments where id=i.id) as latest FROM instruments i
                        JOIN documents d on d.id = i.id
                        where processed_document is null
                        and i.id = %(id)s """

                cur.execute(query, {'id': document_id})
                result = cur.fetchall()
                if not len(result):
                    continue

                queries.process_instrument(
                    row=result[0], db=db,
                    refresh=False,
                    latest=result[0].get('latest'),
                    strategy={'links': get_links})

        with db.cursor(cursor_factory=extras.RealDictCursor) as cur, server.app.test_request_context():
            for document_id in ids:
                query = """SELECT *, exists(select 1 from latest_instruments where id=i.id) as latest FROM instruments i
                        JOIN documents d on d.id = i.id
                        where skeleton is null
                        and i.id = %(id)s """

                cur.execute(query, {'id': document_id})
                result = cur.fetchall()
                if not len(result):
                    continue

                tree = etree.fromstring(result[0]['processed_document'], parser=etree.XMLParser(huge_tree=True))
                queries.process_skeleton(result[0].get('id'), tree, db=db)

    except KeyboardInterrupt:
        pass
    finally:
        db.close()


if __name__ == "__main__":
    if not len(sys.argv) > 1:
        raise Exception('Missing configuration file')
    sys.path.append(os.getcwd())
    db = get_db(sys.argv[1])
    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        try:
            query = """SELECT i.id as id FROM instruments i
                    JOIN documents d on d.id = i.id
                    where processed_document is null or skeleton is null"""
            cur.execute(query)
            results = cur.fetchall()
            if len(results):
                processes = min(int(sys.argv[2] if len(sys.argv) > 2 else 2), len(results))
                pool = Pool(processes=processes)
                args = map(lambda x: (sys.argv[1], x), (list(chunks(map(lambda x: x['id'], results),
                           len(results) / processes + len(results) % processes))))
                pool.map(run_process, (args))
                pool.join()
        except KeyboardInterrupt:
            print "Keyboard interrupt in main"
        finally:
            print "Cleaning up Main"
            cur.execute('REFRESH MATERIALIZED VIEW latest_instruments')
    db.close()

