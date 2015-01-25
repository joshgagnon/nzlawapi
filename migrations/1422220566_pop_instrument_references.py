from lxml import etree
from collections import defaultdict


def run(db, config):
    with db.cursor() as cur, db.cursor() as out:
        result_to_dict = lambda r: (r[0], r[1])

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
            links = map(lambda x: x.attrib['href'], tree.xpath('.//extref[@href]'))
            counters = defaultdict(int)
            for link in links:
                if link in id_lookup:
                    counters[id_lookup[link]] = counters[id_lookup[link]] + 1
            if len(counters.items()):
                flattened = map(lambda x: (source_id, x[0], x[1]), counters.items())
                args_str = ','.join(cur.mogrify("(%s,%s,%s)", x) for x in flattened)
                out.execute("INSERT INTO document_references (source_id, target_id, count) VALUES " + args_str)
            document = cur.fetchmany(1)
