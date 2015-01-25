import glob
import os
import psycopg2

def run(db, config):
    with db.cursor() as cur, db.cursor() as out:
        query = """SELECT source_id from cases """
        cur.execute(query)
        count = 0
        for case in cur.fetchall():
            if count % 100 == 0:
                print count
            count += 1
            with open(os.path.join(config.CASE_DIR, case[0]), 'rb') as f:
                out.execute("""INSERT INTO documents (document, mapper) values (%(doc)s, 'case') returning id""",
                    {'doc': f.read().decode("utf-8", "replace")})
                doc_id = out.fetchone()[0]
                out.execute("""UPDATE cases set id = %(id)s where source_id = %(source_id)s""",
                    {'id': doc_id, 'source_id': case[0]})
                # load pngs
            #for png in glob.glob(os.path.join(config.CASE_DIR, case[0].replace('.html', '*.png'))):
            #    with open(png, "rb") as p:
            #        out.execute("""INSERT INTO resources (id, value) VALUES (%(id)s, %(value)s)""",
            #            {'id': os.path.basename(png), 'value': psycopg2.Binary(p.read()) })
