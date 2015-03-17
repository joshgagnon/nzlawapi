import os
import psycopg2
import sys
import importlib


def process(db, config):
    with db.cursor() as cur:
        cur.execute("""update documents set processed_document == null where processed_document is not null;
""")


if __name__ == "__main__":
    if not len(sys.argv) > 1:
        raise Exception('Missing configuration file')
    sys.path.append(os.getcwd())
    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
    db = psycopg2.connect(
        database=config.DB,
        user=config.DB_USER,
        host=config.DB_HOST,
        password=config.DB_PW)
    db.set_client_encoding('utf8')
    process(db, config)
    db.commit()
