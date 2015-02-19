
import psycopg2
from .. import acts
import sys
from psycopg2 import extras
import importlib

if __name__ == "__main__":
    conn = connect_db()

    with conn.cursor() as cur:

        query = """select id, title from latest_instruments"""
        cur.execute(query)

        results = in_cur.fetchall()
        for r, i in enumerate(results):
            print '%d/%d' % (r, len(results))
            acts.acts.get_act_object(id=r[0], replace=True, db=conn)

    conn.commit()
    conn.close()


if __name__ == "__main__":
    if not len(sys.argv) > 1:
        raise Exception('Missing configuration file')
    sys.path.append(os.getcwd())
    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
    db = psycopg2.connect(
            database=config.DB,
            user=config.DB_USER,
            password=config.DB_PW)
    run(db, config)
