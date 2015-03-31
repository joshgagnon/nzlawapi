
import psycopg2
import sys
from psycopg2 import extras
import importlib
import os
from lxml import etree

def run(db, config):
    _, pre_defs = definitions.populate_definitions(queries.get_act_exact('Interpretation Act 1999', db=db))
    interpretation = queries.get_act_exact('Interpretation Act 1999', db=db)
    interpretation_date = util.safe_date(interpretation.attrib.get('date.assent'))
    node = traversal.nodes_from_path_string(interpretation, 's 30')[0]
    node.getparent().remove(node)
    _, post_defs = definitions.populate_definitions(interpretation)

    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        query = """select i.id, title from instruments i join documents d on i.id = d.id where definitions is null """
        cur.execute(query)
        results = cur.fetchall()

        for i, r in enumerate(results):
            print '%d/%d' % (i, len(results))
            cur.execute("""SELECT * FROM instruments i
                JOIN documents d on d.id = i.id
                where i.id =  %(id)s""", {'id': r['id']})
            row = cur.fetchone()
            title = unicode(row.get('title').decode('utf-8'))
            queries.extract_save_definitions(etree.fromstring(row.get('document'), parser=etree.XMLParser(huge_tree=True)), row.get('id'), db=db, title=title)

            db.commit()
    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        query = """select i.id, title from instruments i join documents d on i.id = d.id where processed_document is null """
        cur.execute(query)
        results = cur.fetchall()
        for i, r in enumerate(results):
            print '%d/%d' % (i, len(results))
            cur.execute("""SELECT * FROM instruments i
                JOIN documents d on d.id = i.id
                where i.id =  %(id)s""", {'id': r['id']})
            row = cur.fetchone()
            act_date = row.get('date_assent')
            if not act_date or (act_date and  interpretation_date < act_date):
                defs = post_defs.__deepcopy__()
            else:
                defs = pre_defs.__deepcopy__()
            queries.process_instrument(row, db, defs, refresh=False, latest=True)
            db.commit()
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
    db = psycopg2.connect(
            database=config.DB,
            user=config.DB_USER,
            host=config.DB_HOST,
            password=config.DB_PW)
    db.set_client_encoding('utf8')
    run(db, config)
    db.close()
