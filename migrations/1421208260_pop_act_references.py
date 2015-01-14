from lxml import etree
from collections import defaultdict


def run(db):
    with db.cursor() as cur, db.cursor() as out:
        result_to_dict = lambda r: (r[0], (r[1], r[2]))
        cur.execute("""SELECT i.id, a.id, 'act' FROM id_lookup i
            JOIN acts a ON i.parent_id = a.source_id AND a.latest_version = TRUE """)
        id_lookup = dict(map(result_to_dict, cur.fetchall()))
        cur.execute("""SELECT i.id, a.id, 'regulation' FROM id_lookup i
            JOIN regulations a ON i.parent_id = a.source_id AND a.latest_version = TRUE """)
        id_lookup.update(dict(map(result_to_dict, cur.fetchall())))

        cur.execute("""SELECT document, a.id FROM acts a
            join documents d on a.document_id = d.id where  latest_version = true """)
        document = cur.fetchmany(1)
        while document:
            tree = etree.fromstring(document[0][0])
            source_id = document[0][1]
            links = map(lambda x: x.attrib['href'], tree.xpath('.//extref[@href]'))
            counters = defaultdict(int)
            for link in links:
                if link in id_lookup:
                    counters[id_lookup[link]] = counters[id_lookup[link]] + 1
            if len(counters.items()):
                flattened = map(lambda x: (source_id, x[0][0], x[0][1], x[1]), counters.items())
                args_str = ','.join(cur.mogrify("(%s,%s,%s,%s)", x) for x in flattened)
                out.execute("INSERT INTO act_references (source_id, target_id, mapper, count) VALUES " + args_str)
            document = cur.fetchmany(1)
