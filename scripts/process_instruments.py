
import psycopg2
#from .. import acts
import sys
from psycopg2 import extras
import importlib
import os

def run(db, config):

    _, defs = definitions.populate_definitions(queries.get_act_exact('Interpretation Act 1999', db=db))

    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        query = """select id, title from latest_instruments where processed_document is null """
        cur.execute(query)
        results = cur.fetchall()
        for i, r in enumerate(results):
            print '%d/%d' % (i, len(results))
            cur.execute("""SELECT * FROM instruments i
                JOIN documents d on d.id = i.id
                where i.id =  %(id)s""", {'id': r['id']})
            queries.process_instrument(cur.fetchone(), db, defs.__deepcopy__(), refresh=False)
    db.close()

if __name__ == "__main__":
    if not len(sys.argv) > 1:
        raise Exception('Missing configuration file')
    sys.path.append(os.getcwd())
    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
    import sys
    from os import path
    sys.path.append( path.dirname( path.dirname( path.abspath(__file__) ) ) )
    from acts import acts
    from acts import definitions
    from acts import queries
    db = psycopg2.connect(
            database=config.DB,
            user=config.DB_USER,
            password=config.DB_PW)
    run(db, config)
