from db import get_db
import elasticsearch
import psycopg2
from flask import render_template

es = elasticsearch.Elasticsearch()

def act_full_search(query):
    result = es.search(index="legislation", doc_type='act', body={  
        "from" : 0, "size" : 25, 
        "fields" : ["id", "title"],
        "sort" : [
            "_score",
        ],
        "query": { "query_string" : { "query" : query } },
          "aggregations": {
            "my_agg": {
              "terms": {
                "field": "content"
              }
            }
        }
        })
    print("Got %d Hits:" % result['hits']['total'])
    return result


def case_search(query, offset=0):
    result = es.search(index="legislation", doc_type="case", body={  
        "from" : offset, "size" : 25, 
            "sort" : [
                "_score"
            ],
            "query": { "query_string" : { "query" : query } },    
        })
    print("Got %d Hits:" % result['hits']['total'])
    return result

def get_case_info(case):
    with get_db().cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        query = """select * from cases where full_citation = %(case)s """
        cur.execute(query, {'case': case})
        results = cur.fetchone()
        return {
            'html_content': render_template('case_intitular.html', result=results), 
            'path':  '/case/file/'+results.get('id'), 'id': results.get('id'),
            'validated': results.get('validated'),
            'full_citation': results.get('full_citation')}



def get_full_case(case):
    with get_db().cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        query = """select * from cases where full_citation = %(case)s """
        cur.execute(query, {'case': case})
        results = cur.fetchone()
        print results
    return results	