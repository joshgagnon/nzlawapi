# -*- coding: utf-8 -*-
from elasticsearch import Elasticsearch, exceptions, helpers
import psycopg2
from psycopg2 import extras, errorcodes
from lxml import etree
from lxml.html import HTMLParser, fromstring
import importlib
import sys
import os
import re
import json


def safe_text(node_list):
    try:
        return etree.tostring(node_list[0], method="text",encoding='UTF-8')
    except IndexError:
        return ''


def index(db, es):
    try:
        print 'delete old'
        print es.indices.delete('legislation')
    except exceptions.NotFoundError:
        pass
    print 'create new'
    print es.indices.create('legislation', body={
        "settings": {
            "analysis": {
                "analyzer": {
                    "html_analyzer": {
                        "type": "custom",
                        "char_filter": "html_strip",
                        "tokenizer": "standard",
                        "filter": ["standard", "lowercase", "stop", "custom_stemmer"]
                    },
                    "html_analyzer_highlightable": {
                        "type": "custom",
                        "char_filter": "html_strip",
                        "tokenizer": "standard",
                        "filter": ["standard", "lowercase", "stop", "custom_stemmer"],
                        "term_vector": "with_positions_offsets_payloads",
                    },
                    "text_analyzer": {
                        "tokenizer": "standard",
                        "filter": ["standard", "lowercase", "stop", "custom_stemmer"],
                    },
                    "nontoken_analyzer": {
                        "tokenizer": "keyword",
                        "filter": ["lowercase", "asciifolding"],
                    },
                    "analyzer_highlightable": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": ["standard", "lowercase", "stop", "custom_stemmer"],
                        "term_vector": "with_positions_offsets_payloads",
                    },
                    "simple_highlightable": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": ["standard", "lowercase", "stop"],
                        "term_vector": "with_positions_offsets_payloads",
                    },
                    "partial_analyzer": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": [
                            "lowercase",
                            "asciifolding",
                            "ngram_filter"
                        ]
                    }
                },
                "filter": {
                    "ngram_filter": {
                        "type": "edge_ngram",
                        "min_gram": 4,
                        "max_gram": 20
                    },
                    "custom_stemmer": {
                        "type": "stemmer",
                        "name": "english"
                    }
                }
            }
        },

        "mappings": {
            "instrument": {
                "properties": {
                    "title":{
                        "type": "string",
                        "fields": {
                            "simple": {
                                "type": "string",
                                "analyzer": "nontoken_analyzer"
                            },
                            "english": {
                                "type": "string",
                                "analyzer": "english"
                            },
                            "ngram": {
                                "type": "string",
                                "analyzer": "partial_analyzer"
                            }
                        }
                    },
                    "document": {
                        "type": "string",
                        "term_vector" : "with_positions_offsets"
                    },
                    "skeleton": {
                        "type":      "string",
                        "analyzer": "html_analyzer_highlightable",
                    },
                    "latest": { "type": "boolean", "index": "not_analyzed" },
                    "principal": { "type": "boolean", "index": "not_analyzed" },
                    "stage": { "type": "string", "index": "not_analyzed" },
                    "type": { "type": "string", "index": "not_analyzed" },
                    "repealed": { "type": "string", "index": "not_analyzed" },
                    "in_amend": { "type": "string", "index": "not_analyzed" },
                    "pco_suffix": { "type": "string", "index": "not_analyzed" },
                    "terminated": { "type": "string", "index": "not_analyzed" },
                    "offical": { "type": "string", "index": "not_analyzed" },
                    "path": { "type": "string", "index": "not_analyzed" },
                    "date_first_valid": { "type": "date"},
                }
            },
            'definition': {
                "_parent": {
                    "type": "instrument"
                },
                "properties": {
                    "full_word" : {"type": "string"},
                    "html": {
                        "type":     "string",
                        "analyzer": "html_analyzer",
                    }
                }
            },
            'part': {
                "_parent": {
                    "type": "instrument"
                },
                "properties": {
                    "html": {
                        "type":      "string",
                        "analyzer": "html_analyzer_highlightable",
                    },
                }
            },
            "case": {
                "properties": {
                    "full_citation":{
                        "type":      "string",
                        "analyzer":  "text_analyzer"
                    },
                    "document": {
                        "type":      "string",
                        "analyzer":  "html_analyzer"
                    }
                }
            }
        }
    })

def instruments(db, es):
    from acts.instrument_es import strip_html, instrument_query

    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur:
        cur.execute('select count(*) as count from instruments')
        total = cur.fetchone()['count']
    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur:
        print 'Instruments'
        cur.execute(instrument_query)
        results = cur.fetchmany(5)
        count = 0.0
        while len(results):
            results = map(strip_html, results)
            helpers.bulk(es, map(lambda x: {"_id": x['id'], "_source": dict(x), "_index":'legislation', "_type": 'instrument'}, results))
            count += len(results)
            sys.stdout.write("%d%%\r" % (count / total * 100))
            sys.stdout.flush()
            results = cur.fetchmany(5)


def definitions(db, es):
    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur:
        cur.execute('select count(*) as count from definitions')
        total = cur.fetchone()['count']
    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur:
        print 'Definitions'
        cur.execute(""" SELECT document_id, html, id, full_word FROM definitions""")
        results = cur.fetchmany(10000)
        count = 0.0
        while len(results):
            helpers.bulk(es, map(lambda x: {"_id": x['id'], "_parent": x['document_id'], "_source": dict(x), "_index":'legislation', "_type": 'definition'}, results))
            count += len(results)
            sys.stdout.write("%d%%\r" % (count / total * 100))
            sys.stdout.flush()
            results = cur.fetchmany(10000)


def parts(db, es):
    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur:
        cur.execute('select count(*) as count from document_parts')
        total = cur.fetchone()['count']
    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur:
        print 'Parts'
        cur.execute(""" SELECT document_id, document_id || '-' || num as id, num, data as html, title FROM document_parts""")
        results = cur.fetchmany(1000)
        count = 0.0
        while len(results):
            parts = []
            helpers.bulk(es, map(lambda x: {"_id": x['id'], "_parent": x['document_id'],  "_source": dict(x), "_index":'legislation', "_type": 'part'}, results))
            count += len(results)
            sys.stdout.write("%d%%\r" % (count / total * 100))
            sys.stdout.flush()
            results = cur.fetchmany(1000)


def cases(db, es):
    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur:
        cur.execute('select count(*) as count from cases')
        total = cur.fetchone()['count']

    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur:
        cur.execute("""SELECT i.id, neutral_citation, court, full_citation, parties::text, counsel,
            judgment, waistband, hearing, received, matter::text, charge, plea, bench, document, appeal_result::text, 1 as base_score, 0 as refs, 0 as children FROM cases i
            JOIN documents d ON  d.id = i.id""")
        results = cur.fetchmany(10)
        count = 0.0
        while len(results):
            for result in results:
                if count % 100 == 0:
                    print '%d / %d' % (count, total)
                count += 1
                tree = fromstring(result['document'])
                [r.getparent().remove(r) for r in list(tree.iter("style"))]
                result['document'] = re.sub('\n', ' ', etree.tostring(tree, method="text", encoding='UTF-8'))
                result['parties'] = [{'case': j[0], 'participants': j[1]} for j in json.loads(result['parties'] or '{}').items()]
                result['matter'] = json.loads(result['matter'] or '{}')
                result['appeal_result'] = json.loads(result['appeal_result'] or '{}')
                es.index(index='legislation', doc_type='case', body=result, id=result['id'])
            results = cur.fetchmany(10)


def run(db, config):
    es = Elasticsearch([config.ES_SERVER])
    index(db, es)
    instruments(db, es)
    definitions(db, es)
    parts(db, es)

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
    except IndexError, e:
        print e
        print psycopg2.errorcodes.lookup(e.pgcode[:2])
        print psycopg2.errorcodes.lookup(e.pgcode)