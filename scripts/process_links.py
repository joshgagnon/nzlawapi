
import psycopg2

import sys
from psycopg2 import extras
import importlib
import os
from lxml import etree
from collections import defaultdict

do_id_lookup = True

def run(db, config):
    if do_id_lookup:
        with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute(""" delete from id_lookup""")
        with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur, db.cursor() as out:
            cur.execute("""SELECT d.id, title, document FROM instruments i join documents d on i.id = d.id """)
            results = cur.fetchmany(1)
            count = 0
            id_results = []
            while len(results):
                for result in results:
                    if count % 10 == 0:
                        print count, len(id_results)
                    count += 1
                    for el in etree.fromstring(result['document']).xpath('//*[@id]'):
                        new_id = el.attrib.get('id')
                        id_results.append( (new_id, result['id'], generate_path_string(el, title=unicode(result['title'].decode('utf-8')))[0]))
                results = cur.fetchmany(1)
                if len(id_results) > 100000:
                    args_str = ','.join(cur.mogrify("(%s,%s,%s)", x) for x in id_results)
                    out.execute("INSERT INTO id_lookup(govt_id, parent_id, repr) VALUES " + args_str)
                    id_results[:] = []

            if len(id_results):
                args_str = ','.join(cur.mogrify("(%s,%s,%s)", x) for x in id_results)
                out.execute("INSERT INTO id_lookup(govt_id, parent_id, repr) VALUES " + args_str)
                id_results[:] = []

        db.commit()
    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        cur.execute(""" delete from document_references""")
        cur.execute(""" delete from section_references""")
        cur.execute(""" delete from subordinate""")

    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur:
        result_to_dict = lambda r: (r['govt_id'], r['parent_id'])
        cur.execute("""SELECT govt_id, parent_id from id_lookup """)
        id_lookup = dict(map(result_to_dict, cur.fetchall()))

    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur:
        query = """ select title, id from latest_instruments """
        cur.execute(query)

        titles = {unicode(x['title'].decode('utf-8')): x['id'] for x in cur.fetchall()}

        keys = sorted(titles.keys(), key=lambda x: len(x), reverse=True)
        regex = re.compile(u"(^|\W)(%s)($|\W)" % u"|".join(map(lambda x: re.escape(x), keys)), flags=re.I & re.UNICODE)

    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur, db.cursor() as out:
        count = 0
        cur.execute("""SELECT document, d.id from instruments i join documents d on i.id = d.id """)
        documents = cur.fetchmany(1)
        while len(documents):
            for document in documents:
                if count % 100 == 0:
                    print count
                count += 1
                tree = etree.fromstring(document['document'])
                source_id = document['id']
                links = map(lambda x: {'id': x.attrib['href'], 'path': generate_path_string(x)}, tree.xpath('.//extref[@href]|.//intref[@href]'))
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

                pursuant = tree.xpath('.//pursuant')
                if len(pursuant):
                    refs = pursuant[0].xpath('.//extref')
                    if len(refs):
                        ids = [id_lookup[ref.attrib['href']] for ref in refs]
                    else:
                        ids = [titles[x[1]] for x in regex.findall(etree.tostring(pursuant[0], method="text", encoding="UTF-8"))]
                    ids = list(set(ids))
                    print ids
                    args_str = ','.join(cur.mogrify("(%s, %s)", (x, document['id'])) for x in ids)
                    out.execute("INSERT INTO subordinate (parent_id, child_id) VALUES " + args_str)
                else:
                    pass
                    # do nothing
            documents = cur.fetchmany(1)
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

