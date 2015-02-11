import os
from lxml import etree
import psycopg2
from psycopg2 import extras
import xml.etree.ElementTree as ET
import sys
import importlib
import json


def clear(db):
    with db.cursor() as cur:
        cur.execute('delete from shortcuts')


def process(db, config):
    high_court_rules = {
        'source_title': 'Judicature Act 1908',
        'new_title': 'High Court Rules',
        'query': 'DLM145538',
        'find': 'govt_id'
    }
    with db.cursor() as cur:
        cur.execute('select id, type from latest_instruments where title = %(source_title)s', high_court_rules)
        result = cur.fetchone()
        high_court_rules['document_id'] = result[0]
        high_court_rules['type'] = result[1]
        cur.execute("""insert into shortcuts (document_id, type, find, query, title) values
            (%(document_id)s, %(type)s, %(find)s, %(query)s, %(new_title)s)""", high_court_rules)


if __name__ == "__main__":
    if not len(sys.argv) > 1:
        raise Exception('Missing configuration file')
    sys.path.append(os.getcwd())

    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
    db = psycopg2.connect(
            database=config.DB,
            user=config.DB_USER,
            password=config.DB_PW)
    db.set_client_encoding('utf8')
    clear(db)
    process(db, config)
    db.commit()
