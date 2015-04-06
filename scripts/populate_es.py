from elasticsearch import Elasticsearch, exceptions
import psycopg2
from psycopg2 import extras, errorcodes
from lxml import etree
from lxml.html import HTMLParser
import importlib
import sys
import os
import re
import json

def run(db, config):
    es = Elasticsearch([config.ES_SERVER])
    try:
        print 'delete old'
        print es.indices.delete('legislation')
    except exceptions.NotFoundError:
        pass
    print 'create new'
    print es.indices.create('legislation')

    """
    entry_mapping = {
        'instrument': {
            'properties': {
                'id': {'type': 'integer'},
                'title': {'type': 'string'},
                'content': {'type': 'string'},
                'date_first_valid': {'type': 'date'},
                'date_as_at': {'type': 'date'},
                'date_assent': {'type': 'date'},
                'date_gazetted': {'type': 'date'},
                'date_imprint': {'type': 'date'},
                'year': {'type': 'integer'},
                'repealed': {'type': 'boolean'} //many more now
            }
        },
        'case': {
            'properties': {
                'id': {'type': 'integer'},
                'content': {'type': 'string'},
                'court': [{'type': 'string'}],
                'neutral_citation': {'type': 'string'},
                'full_citation': {'type': 'string'},
                'parties': {},
                'matter':{},
                'appeal_result':{},
                'waistband': {'type': 'string'},
                'judgment': {'type': 'string'},
                'hearing': {'type': 'string'},
                'received': {'type': 'string'},
                'plea': {'type': 'string'},
                'bench': {'type': 'string'},
                'counsel': [{'type': 'string'}],
                'date_imprint': {'type': 'date'},
                'year': {'type': 'integer'},
                'repealed': {'type': 'boolean'}
            }
        }
    }
    es.create('legislation', body={'settings': {},  'mappings': entry_mapping})
    """

    with db.cursor() as cur:
        cur.execute('REFRESH MATERIALIZED VIEW latest_instruments')
    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur:
        cur.execute('select count(*) as count from latest_instruments')
        total = cur.fetchone()['count']
    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur:
        cur.execute("""SELECT id, title, document, type, subtype, number, date_terminated,
            date_imprint, date_signed, raised_by, stage, imperial,
            official, instructing_office, date_first_valid, date_as_at, date_assent,
            date_gazetted, date_imprint, year, repealed, base_score,
            refs, children FROM latest_instruments""")
        results = cur.fetchmany(10)
        count = 0
        while len(results):

            for result in results:
                if count % 100 == 0:
                    print '%d / %d' % (count, total)
                count += 1
                result['document'] = etree.tostring(etree.fromstring(result['document']), method="text",encoding='UTF-8')
                es.index(index='legislation', doc_type='instrument', body=result, id=result['id'])

            results = cur.fetchmany(10)
    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur:
        cur.execute('select count(*) as count from cases')
        total = cur.fetchone()['count']

    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur:
        cur.execute("""SELECT i.id, neutral_citation, court, full_citation, parties::text, counsel,
            judgment, waistband, hearing, received, matter::text, charge, plea, bench, document, appeal_result::text, 1 as base_score, 0 as refs, 0 as children FROM cases i
            JOIN documents d ON  d.id = i.id""")
        results = cur.fetchmany(10)
        count = 0
        while len(results):
            for result in results:
                if count % 100 == 0:
                    print '%d / %d' % (count, total)
                count += 1
                tree = etree.fromstring(result['document'], parser=HTMLParser())
                [r.getparent().remove(r) for r in list(tree.iter("style"))]
                result['document'] = re.sub('\n', ' ', etree.tostring(tree, method="text", encoding='UTF-8'))
                result['parties'] = [{'case': j[0], 'participants': j[1]} for j in json.loads(result['parties'] or '{}').items()]
                result['matter'] = json.loads(result['matter'] or '{}')
                result['appeal_result'] = json.loads(result['appeal_result'] or '{}')
                es.index(index='legislation', doc_type='case', body=result, id=result['id'])
            results = cur.fetchmany(10)

    es.indices.refresh(index="legislation")

if __name__ == "__main__":
    if not len(sys.argv) > 1:
        raise Exception('Missing configuration file')
    sys.path.append(os.getcwd())
    try:
        config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
        db = psycopg2.connect(
                database=config.DB,
                user=config.DB_USER,
                host=config.DB_HOST,
                password=config.DB_PW)
        run(db, config)
    except exceptions.ConnectionError:
        print 'Please start Elasticsearch'
    except Exception, e:
        print psycopg2.errorcodes.lookup(e.pgcode[:2])
        print psycopg2.errorcodes.lookup(e.pgcode)
        print e