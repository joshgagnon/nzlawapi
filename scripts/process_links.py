
import psycopg2

import sys
from psycopg2 import extras
import importlib
import os
from lxml import etree
from collections import defaultdict



def ids(db, config):
    with db.cursor() as cur, db.cursor() as out:
        ids = set()
        cur.execute(""" delete from id_lookup""")
        cur.execute("""SELECT id, document FROM latest_instruments""")
        result = cur.fetchone()
        count = 0
        id_results = []
        while result:
            if count % 100 == 0:
                print count
            count += 1

            for el in etree.fromstring(result[1]).xpath('//*[@id]'):
                new_id = el.attrib.get('id')
                if new_id not in ids:
                    query = """ INSERT INTO id_lookup(govt_id, parent_id, repr) VALUES
                    (%(govt_id)s, %(parent_id)s, %(repr)s)"""
                    id_results.append( (new_id, result[0], generate_path_string(el)[0]) )
                ids |= {new_id}
            result = cur.fetchone()

        args_str = ','.join(cur.mogrify("(%s,%s,%s)", x) for x in id_results)
        out.execute("INSERT INTO id_lookup(govt_id, parent_id, repr) VALUES " + args_str)
    db.commit()


def run(db, config):
    ids(db, config)
    with db.cursor() as cur, db.cursor() as out:
        result_to_dict = lambda r: (r[0], r[1])
        cur.execute(""" delete from document_references""")
        cur.execute(""" delete from section_references""")
        cur.execute("""SELECT govt_id, parent_id from id_lookup """)
        id_lookup = dict(map(result_to_dict, cur.fetchall()))
        count = 0
        cur.execute("""SELECT document, id from latest_instruments """)
        document = cur.fetchmany(1)
        while document:
            if count % 100 == 0:
                print count
            count += 1
            tree = etree.fromstring(document[0][0])
            source_id = document[0][1]
            links = map(lambda x: {'id': x.attrib['href'], 'path': generate_path_string(x)}, tree.xpath('.//extref[@href]'))
            counters = defaultdict(int)
            for link in links:
                if link['id'] in id_lookup:
                    counters[id_lookup[link['id']]] = counters[id_lookup[link['id']]] + 1
            if len(counters.items()):
                flattened = map(lambda x: (source_id, x[0], x[1]), counters.items())
                args_str = ','.join(cur.mogrify("(%s,%s,%s)", x) for x in flattened)
                out.execute("INSERT INTO document_references (source_id, target_id, count) VALUES " + args_str)

                flattened = map(lambda x: (source_id, x['id'], x['path'][0], x['path'][1]), links)
                args_str = ','.join(cur.mogrify("(%s,%s,%s,%s)", x) for x in flattened)
                out.execute("INSERT INTO section_references (source_document_id, target_govt_id, repr, url) VALUES " + args_str)
            document = cur.fetchmany(1)
    db.commit()




if __name__ == "__main__":
    if not len(sys.argv) > 1:
        raise Exception('Missing configuration file')
    sys.path.append(os.getcwd())
    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
    import sys
    from os import path
    sys.path.append( path.dirname( path.dirname( path.abspath(__file__) ) ) )
    from util import generate_path_string
    db = psycopg2.connect(
            database=config.DB,
            user=config.DB_USER,
            host=config.DB_HOST,
            password=config.DB_PW)
    run(db, config)
    db.close()

