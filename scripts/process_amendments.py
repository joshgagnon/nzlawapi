
import psycopg2

import sys
from psycopg2 import extras
import importlib
import os
from lxml import etree
import re
import logging


def run(db, config):

    from acts import links
    import util

    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        cur.execute("""delete from amendments""")

    id_lookup = links.get_all_govt_ids(db)

    titles = links.get_links(db)
    results = []
    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur, db.cursor() as out:
        count = 0
        cur.execute("""SELECT document, d.id, title from instruments i join documents d on i.id = d.id
             """)
        documents = cur.fetchmany(100)

        while len(documents):
            for document in documents:
                count += 1
                if count % 100 == 0:
                    print count
                tree = etree.fromstring(document['document'], parser=util.large_parser)
                document_id = document['id']
                amends = links.find_amendments(tree, document_id, id_lookup, titles, db)
                results += amends
            documents = cur.fetchmany(100)
    with db.cursor() as out:
        args_str = ','.join(results)
        out.execute("""INSERT INTO amendments(note_id, target_document_id, source_govt_id,
            amendment_date, unknown_source_text) VALUES """ + args_str)



if __name__ == "__main__":
    if not len(sys.argv) > 1:
        raise Exception('Missing configuration file')
    sys.path.append(os.getcwd())
    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
    import sys
    from os import path
    sys.path.append( path.dirname( path.dirname( path.abspath(__file__) ) ) )
    db = psycopg2.connect(
            database=config.DB,
            user=config.DB_USER,
            host=config.DB_HOST,
            password=config.DB_PW)

    run(db, config)
    db.commit()
    db.close()