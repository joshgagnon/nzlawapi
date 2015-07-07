from flask import current_app
from util import CustomException


def year_query(args):
    if '-' in args.get('year'):
        years = args.get('year').split('-')
        return {
            "range": {
                "year": {
                    "gte": years[0].strip(),
                    "lte": years[1].strip()
                }
            }}
    else:
        return {
            "query_string": {
                "query": args.get('year'),
                "fields": ['year']
            }
        }


def contains_query(args, field='document'):
    fields = [field]
    if args.get('contains_type') == 'all_words':
        return {
            "simple_query_string": {
                "query": args.get('contains'),
                "fields": fields,
                "default_operator": 'AND'
            }}
    if args.get('contains_type') == 'any_words':
        return {
            "simple_query_string": {
                "query": args.get('contains'),
                "fields": fields,
                "default_operator": 'OR'
            }}
    #if args.get('contains_type') == 'exact':\]
    return {
        "match_phrase": {
            field: args.get('contains')
        }}


def get_sort(args):
    sort_order = [{"_score": "desc"}]
    if args.get('sort_col') and args.get('sort_dir'):
        sort_order = [{args.get('sort_col'): args.get('sort_dir')}]
    return sort_order


"""
            "query": {
              "bool": {
                "should": [
                    {"match": {"title": {"type" : "phrase",  "query" : query}}},
                    {"match": {"title.english": {"type" : "phrase",  "query" : query}}},
                    {"match": {"title.ngram": {"type" : "phrase",  "query" : query}}},
                    {"match": {"document": {  "query" : query}}},
                    ]
            }},
"""

def query_all(args):
    """ this is the basic search """
    query = args.get('query').lower()
    es = current_app.extensions['elasticsearch']
    offset = args.get('offset')
    results = es.search(
        index="legislation",
        #explain=True,
        doc_type="instrument",
        body={
            "from": offset, "size": 25,
            "fields": ["id", "title", "full_citation", 'year', 'number', 'type', 'subtype'],
            "sort": get_sort(args),
            "query": {
                "bool": {
                    "must": [{"term" : { "latest" : True }},
                             {"multi_match": {
                                    "query": query,
                                     "type": "phrase",
                                     "operator":   "and",
                                    "fields": ["title^3", "title.english", "document^3"]
                                }
                            }]
                        }
                },
                   # "script_score": {
                   #     "script": "_score * (1.0/sqrt(doc['title.simple'].value.length()))"
                   # }

                "highlight": {
                    "pre_tags": ["<span class='search_match'>"],
                    "post_tags": ["</span>"],
                    # bug with match phrase, returning too much
                    "fields": {'document': {"fragment_size" : 100, "number_of_fragments" : 5,"no_match_size": 100}}
                }
        })
    return {'type': 'search', 'search_results': results['hits'], 'title': 'Search: %s' % query}


def query_case_fields(args):
    must = []
    fields = {}
    try:
        if args.get('full_citation'):
            must.append({"simple_query_string": {
                "query": args.get('full_citation'),
                "fields": ['full_citation'],
                "default_operator": 'AND'}
            })
        if args.get('contains'):
            fields['document'] = {}
            must.append(contains_query(args))
        if args.get('year'):
            must.append(year_query(args))

        """'neutral_citation', 'courtfile', , 'year', 'court', 'bench', 'parties', 'matter', 'charge']"""
        es = current_app.extensions['elasticsearch']
        offset = args.get('offset', 0)
        results = es.search(
            index="legislation",
            doc_type="case",
            body={
                "from": offset, "size": 25,
                "fields": ["id", "full_citation"],
                "sort": [
                    "_score",
                ],
                "query": {
                    "bool": {
                        "must": must
                    }
                },
                "highlight": {
                    "pre_tags": ["<span class='search_match'>"],
                    "post_tags": ["</span>"],
                    "fields": fields
                }
            })
        return {'type': 'search', 'search_results': results['hits'], 'title': 'Advanced Search'}
    except Exception, e:
        print e
        raise CustomException('There was a problem with your query')

def common(args):
    query = [{"term" : { "latest" : True }}]
    search_type = 'list'
    doc_type = 'instrument'
    fields = ["id", "title", 'year', 'number', 'type', 'subtype']
    body = {
        "from": args.get('offset', 0),
        "size": 25,
        "fields": fields,
        "sort": get_sort(args),
        "query": {
            "bool": {
                "must": query
            }
        },
        "highlight": {
            "pre_tags": ["<span class='search_match'>"],
            "post_tags": ["</span>"],
            #"fields": fields
        },
    }

    must_filters = []
    not_filters = [{"term": {"latest": False}}]
    instrument_filters(args, must_filters, not_filters)

    #bills(args, must_filters, not_filters)
    #other(args, must_filters, not_filters)

    if len(must_filters) or len(not_filters):
        body['filter'] = {"bool": {}}
        if len(must_filters):
            body['filter']["bool"]["must"] = {
                "or": must_filters
            }
        if len(not_filters):
            body['filter']["bool"]["must_not"] = {
                "and": not_filters
            }

    if args.get('title'):
        query.append({"simple_query_string": {
            "query": args.get('title'),
            "fields": ['title' ,'title.english', 'title.ngram'],
            "default_operator": 'AND'}
        })

    if args.get('contains'):
        query.append({"has_child": {
            "child_type": "part",
            "query": contains_query(args, 'html')
            }})
        search_type = 'contains_list'

    if args.get('year'):
        query.append(year_query(args))

    if args.get('definition'):
        fields[:] = ['full_word', 'html']
        doc_type = 'definition'
        search_type = 'definition'
        existing = query[:]
        query[:] = []
        if len(existing):
            query.append({"has_parent": {
                "parent_type": "instrument",
                "query": {
                    "bool": {
                        "must": existing
                    }
                }
            }})
        query.append({"simple_query_string": {
                    "query": args.get('definition'),
                    "fields": ['full_word']
                        }
                }
            )
        if body['filter']:
            body['filter'] = {
                "has_parent": {
                "parent_type": "instrument",
                "filter": body['filter']
                }
            }

    return doc_type, search_type, body

def instrument_filters(args, must_filters, not_filters):
    if args.get('principal_acts'):
        must_filters.append({"and": [
            {"term": {"principal": True}},
            {"term": {"type": "act"}}
            ]})
    if args.get('legislative_instruments'):
        must_filters.append({"term": {"type": "regulation"}})
    if args.get('amendment_acts'):
        must_filters.append({"and": [
            {"term": {"principal": False}},
            {"term": {"type": "act"}}
            ]})
    if args.get('bills_and_sops'):
        must_filters.append({"term": {"type": "bill"}})
        must_filters.append({"term": {"type": "sop"}})
    if not args.get('include_repealed'):
        not_filters.append({"term": {"repealed": True}})

    if not args.get('not_yet_in_force'):
        not_filters.append({"range": {
          "date_first_valid": {
             "lte" : "now"
          }
        }});


def query_instrument_fields(args):
    try:
        doc_type, search_type, body = common(args)
        es = current_app.extensions['elasticsearch']
        results = es.search(
            index="legislation",
            #explain="true",
            doc_type=doc_type,
            body=body)
        """
        def get_totals(hit):
            result = {}
            for detail in hit['_explanation']['details']:
                pass
            return result
            """
        clean_results = results['hits']  # map(get_totals, results['hits'])

        return {'type': 'search', 'search_type': search_type, 'search_results': clean_results}
    except Exception, e:
        print e
        raise CustomException('There was a problem with your query')



def query_contains(args):
    try:
        es = current_app.extensions['elasticsearch']
        offset = args.get('offset')
        doc_id = args.get('id', args.get('document_id'))
        query_filter = {"term": {"_parent": doc_id }}
        if args.get('parts'):
            parts = map(lambda x: '%s-%s' % (doc_id, x), args.get('parts').split(','))
            query_filter = {
                'bool': {"should": query_filter,
                        "must": {
                            "ids": {
                            'values': parts
                            }
                        }}
            }
        body = {
                "fields": ['title'],
                "sort": ['num'],
                "query": contains_query(args, 'html'),
                "filter":  query_filter,
                "highlight": {
                    "pre_tags": ["<span class='search_match'>"],
                    "post_tags": ["</span>"],
                    "fields": {'html': {"number_of_fragments": 0}},
                    #"phrase_limit" : 1024,
                    #{"fragment_size" : 200, "number_of_fragments" : 100}}
                }
            }
        if args.get('parts'):
            body['highlight']['require_field_match'] = False
            body["size"] = 10000
        else:
            body["size"] = 25
            body["from"] = offset
        results = es.search(
            index="legislation",
            doc_type='part',
            body=body)
        return {'type': 'search', 'search_type': 'contains_result', 'search_results': results['hits'], 'title': 'Advanced Search'}
    except Exception, e:
        print e
        raise CustomException('There was a problem with your query')


def query_contains_skeleton(args):
    try:
        es = current_app.extensions['elasticsearch']
        doc_id = args.get('id', args.get('document_id'))
        results = {}
        body = {
            "fields": [],
            "query": contains_query(args, 'skeleton'),
            "filter": {"term": {"_id": doc_id }},
            "highlight": {
                "pre_tags": ["<span class='search_match'>"],
                "post_tags": ["</span>"],
                "fields": {'skeleton': {"number_of_fragments": 0}},
                "require_field_match": False
            }
        }
        es_results = es.search(
            index="legislation",
            doc_type='instrument',
            body=body)
        try:
            results['html_content'] = es_results['hits']['hits'][0]['highlight']['skeleton'][0]
        except IndexError:
            pass
        body = {
            "fields": [],
            "size": 10000,
            "query": contains_query(args, 'html'),
            "filter": {"term": {"_parent": doc_id }}
            }
        es_results = es.search(
            index="legislation",
            doc_type='part',
            body=body)
        print sorted(map(lambda x: x['_id'].split('-', 1)[1], es_results['hits']['hits']), key=lambda x: int(x))
        results['part_matches'] = sorted(map(lambda x: x['_id'].split('-', 1)[1], es_results['hits']['hits']), key=lambda x: int(x))
        return results
    except Exception, e:
        print e
        raise CustomException('There was a problem with your query')

