
import psycopg2
import sys
from psycopg2 import extras
import importlib
import os


def run(db, config):
    inter_title = 'Interpretation Act 1999'
    tree, doc_id = queries.get_act_exact(inter_title, db=db);
    tree, pre_defs = definitions.populate_definitions(tree, doc_id=doc_id, title=inter_title)
    tree, pre_defs = definitions.process_definitions(tree, pre_defs)
    interpret_date = util.safe_date(tree.attrib.get('date.assent'))
    interpretation, doc_id = queries.get_act_exact(inter_title, db=db)
    interpretation_date = util.safe_date(interpretation.attrib.get('date.assent'))
    node = traversal.nodes_from_path_string(interpretation, 's 30')[0]
    node.getparent().remove(node)
    tree, post_defs = definitions.populate_definitions(interpretation, doc_id=doc_id, title=inter_title)
    tree, post_defs = definitions.process_definitions(tree, post_defs)

    link_store = links.get_links(db)

    def get_links(tree, db):
        return links.process_instrument_links(tree, db, links=link_store)

    def get_interpretation_defs(instrument_date, definitions, db):
        if not instrument_date or (instrument_date and interpretation_date < instrument_date):
            existing_definitions = post_defs
        else:
            existing_definitions = pre_defs
        for definition in existing_definitions.pool.values():
            [definitions.add(d) for d in definition if d.source not in definitions.titles]
        definitions.titles += existing_definitions.titles
        definitions.titles = list(set(definitions.titles))
        return definitions

    def get_total():
        with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
            query = """select count(*) as count from instruments i join documents d on i.id = d.id where processed_document is null """
            cur.execute(query)
            return cur.fetchone()['count']

    count = 0
    total = 0
    with db.cursor(cursor_factory=extras.RealDictCursor) as cur, server.app.test_request_context():
        cur.execute("REFRESH MATERIALIZED VIEW latest_instruments")
        # Remove the and " exists(select 1 from latest_instruments where id=i.id)" line to do full processing
        query = """SELECT *, exists(select 1 from latest_instruments where id=i.id) as latest FROM instruments i
                JOIN documents d on d.id = i.id
                where processed_document is null
                order by year desc
                limit 1 """

        while True:
            if count % 100 == 0:
                total = get_total()
            print '%d/%d' % (count, total)
            cur.execute(query)
            result = cur.fetchall()
            if not len(result):
                break

            queries.process_instrument(
                row=result[0], db=db,
                refresh=False,
                latest=result[0].get('latest'),
                strategy={
                'leaf_defs': get_interpretation_defs,
                'links': get_links})
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
    from acts import links
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
