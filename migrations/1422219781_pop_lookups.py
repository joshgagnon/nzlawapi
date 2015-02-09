from lxml import etree
from util import generate_path_string

def run(db, config):
    ids = set()
    with db.cursor() as cur, db.cursor() as out:
        cur.execute("""SELECT id, document FROM latest_instruments""")

        result = cur.fetchone()
        count = 0
        while result:
            if count % 100 == 0:
                print count
            count += 1

            for el in etree.fromstring(result[1]).xpath('//*[@id]'):
                new_id = el.attrib.get('id')
                if new_id not in ids:
                    query = """ INSERT INTO id_lookup(govt_id, parent_id, repr) VALUES
                    (%(govt_id)s, %(parent_id)s, %(repr)s)"""
                    values = {
                        'govt_id': new_id,
                        'parent_id': result[0],
                        'repr': generate_path_string(el)[0]
                    }
                    out.execute(query, values)
                ids |= {new_id}
            result = cur.fetchone()
