
import psycopg2
import sys
from psycopg2 import extras
import importlib
import os
from lxml import etree

def run(db, config):

    tree, pre_defs = definitions.populate_definitions(queries.get_act_exact('Interpretation Act 1999', db=db))
    tree, pre_defs = definitions.process_definitions(tree, pre_defs)
    interpret_date = util.safe_date(tree.attrib.get('date.assent'))
    interpretation = queries.get_act_exact('Interpretation Act 1999', db=db)
    interpretation_date = util.safe_date(interpretation.attrib.get('date.assent'))
    node = traversal.nodes_from_path_string(interpretation, 's 30')[0]
    node.getparent().remove(node)
    tree, post_defs = definitions.populate_definitions(interpretation)
    tree, post_defs = definitions.process_definitions(tree, post_defs)


    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        query = """select count(*) as count from instruments i join documents d on i.id = d.id where processed_document is null """
        cur.execute(query)
        total = cur.fetchone()['count']
    count = 0

    with db.cursor(cursor_factory=extras.RealDictCursor) as cur, server.app.test_request_context():
        cur.execute("REFRESH MATERIALIZED VIEW latest_instruments")
        query = """SELECT *, true as latest FROM latest_instruments i
                where processed_document is null limit 1 """
        while True:
            print '%d/%d' % (count, total)
            cur.execute(query)
            result = cur.fetchall()
            if not len(result):
                break

            act_date = result[0].get('date_assent')
            if not act_date or (act_date and interpret_date < act_date):
                existing_definitions = post_defs
            else:
                existing_definitions = pre_defs
            queries.process_instrument(
                    row=result[0], db=db,
                    existing_definitions=existing_definitions,
                    refresh=False,
                    latest=result[0].get('latest'))
            count += 1
        cur.execute("REFRESH MATERIALIZED VIEW latest_instruments")

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
    import server
    db = psycopg2.connect(
            database=config.DB,
            user=config.DB_USER,
            host=config.DB_HOST,
            password=config.DB_PW)
    db.set_client_encoding('utf8')
    run(db, config)
    db.close()
