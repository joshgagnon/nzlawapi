
import psycopg2
from lxml import etree
import sys
from psycopg2 import extras
import importlib
import os


def run(db, config):


    with db.cursor(cursor_factory=extras.RealDictCursor) as cur,  server.app.test_request_context():
        cur.execute("REFRESH MATERIALIZED VIEW latest_instruments")
        query = """select id from latest_instruments where skeleton is null """
        cur.execute(query)
        results = cur.fetchall()
        for i, r in enumerate(results):
            print '%d/%d' % (i, len(results))
            cur.execute("""SELECT * FROM instruments i
                JOIN documents d on d.id = i.id
                where i.id =  %(id)s""", {'id': r['id']})
            queries.process_skeleton(r['id'], etree.fromstring(cur.fetchone()['processed_document']), db=db)

        cur.execute("REFRESH MATERIALIZED VIEW latest_instruments")
    db.close()

if __name__ == "__main__":
    if not len(sys.argv) > 1:
        raise Exception('Missing configuration file')
    sys.path.append(os.getcwd())
    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
    import sys
    from os import path
    sys.path.append( path.dirname( path.dirname( path.abspath(__file__) ) ) )
    from acts import queries
    import server
    db = psycopg2.connect(
            database=config.DB,
            user=config.DB_USER,
            host=config.DB_HOST,
            password=config.DB_PW)
    db.set_client_encoding('utf8')
    run(db, config)
