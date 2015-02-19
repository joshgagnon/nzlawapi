
import psycopg2
#from .. import acts
import sys
from psycopg2 import extras
import importlib
import os

def run(db, config):

    with db.cursor() as cur:

        query = """select id, title from latest_instruments """
        cur.execute(query)

        results = cur.fetchall()
        for  i, r in enumerate(results):
            print '%d/%d' % (i, len(results))
            acts.get_act_object(id=r[0], replace=True, db=db)

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
    db = psycopg2.connect(
            database=config.DB,
            user=config.DB_USER,
            password=config.DB_PW)
    run(db, config)
