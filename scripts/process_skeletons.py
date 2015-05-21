import psycopg2
import sys
from psycopg2 import extras
from os import path
import importlib
import os
from multiprocessing import Pool
from lxml import etree
import logging


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


def run_skeleton((config_filename, ids)):
    from acts import acts
    from acts import queries
    from acts import links
    import server
    sys.path.append( path.dirname( path.dirname( path.abspath(__file__) ) ) )
    #try:
    db = get_db(config_filename)
    with db.cursor(cursor_factory=extras.RealDictCursor) as cur, server.app.test_request_context():
        for document_id in ids:
            print 'fetching %d for skeletizing' % document_id
            query = """SELECT *, exists(select 1 from latest_instruments where id=i.id) as latest FROM instruments i
                    JOIN documents d on d.id = i.id
                    where skeleton is null
                    and i.id = %(id)s """

            cur.execute(query, {'id': document_id})
            result = cur.fetchall()
            if not len(result):
                print 'skipping %d for skeletizing' % document_id
                continue

            tree = etree.fromstring(result[0]['processed_document'], parser=etree.XMLParser(huge_tree=True))
            queries.process_skeleton(result[0].get('id'), tree, db=db)

    #except KeyboardInterrupt:
    #    pass
    #finally:
    db.rollback()
    db.close()


if __name__ == "__main__":
    if not len(sys.argv) > 1:
        raise Exception('Missing configuration file')
    sys.path.append(os.getcwd())
    db = get_db(sys.argv[1])
    logging.basicConfig(level=logging.INFO)

    try:

        with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
            query = """SELECT i.id as id FROM instruments i
                    JOIN documents d on d.id = i.id
                    where skeleton is null
                    """
            cur.execute(query)
            results = cur.fetchall()
        if len(results):
            print '%s documents to process' % len(results)
            processes = min(int(sys.argv[2] if len(sys.argv) > 2 else 2), len(results))
            pool = Pool(processes=processes)
            args = map(lambda x: (sys.argv[1], x), (list(chunks(map(lambda x: x['id'], results),
                       len(results) / processes + len(results) % processes))))
            pool.map_async(run_skeleton, (args))
            pool.close()

        else:
            print 'Nothing to do'

    except KeyboardInterrupt:
        pool.terminate()
        print "Keyboard interrupt in main"
    else:
        pool.join()
    finally:
        print "Cleaning up Main"
        with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute('REFRESH MATERIALIZED VIEW latest_instruments')
        db.commit()
        db.close()

