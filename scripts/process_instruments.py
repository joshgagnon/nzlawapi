
import psycopg2

import sys
from psycopg2 import extras
import importlib
import os


def run(db, config):
    _, pre_defs = definitions.populate_definitions(queries.get_act_exact('Interpretation Act 1999', db=db))
    interpretation = queries.get_act_exact('Interpretation Act 1999', db=db)
    interpretation_date = util.safe_date(interpretation.attrib.get('date.assent'))
    node = traversal.nodes_from_path_string(interpretation, 's 30')[0]
    node.getparent().remove(node)
    _, post_defs = definitions.populate_definitions(interpretation)

    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        cur.execute("REFRESH MATERIALIZED VIEW latest_instruments")
        query = """select id, title from latest_instruments where processed_document is null """
        cur.execute(query)
        results = cur.fetchall()
        for i, r in enumerate(results):
            print '%d/%d' % (i, len(results))
            cur.execute("""SELECT * FROM instruments i
                JOIN documents d on d.id = i.id
                where i.id =  %(id)s""", {'id': r['id']})
            row = cur.fetchone()
            act_date  = row.get('date_assent')
            if not act_date or (act_date and  interpretation_date < act_date):
                queries.process_instrument(row, db, post_defs.__deepcopy__(), refresh=False, latest=True)
            else:
                queries.process_instrument(row, db, pre_defs.__deepcopy__(), refresh=False, latest=True)
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
    from acts import acts
    from acts import definitions
    from acts import traversal
    from acts import queries
    import util
    db = psycopg2.connect(
            database=config.DB,
            user=config.DB_USER,
            host=config.DB_HOST,
            password=config.DB_PW)
    db.set_client_encoding('utf8')
    run(db, config)
