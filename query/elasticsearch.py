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
    if args.get('contains_type') == 'exact':
        return {
            "match_phrase": {
                field: args.get('contains')
            }}


def get_sort(args):
    sort_order = [{"_score": "desc"}]
    if args.get('sort_col') and args.get('sort_dir'):
        sort_order = [{args.get('sort_col'): args.get('sort_dir')}]
    return sort_order


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
                "function_score" : {
                    "query": {
                        "multi_match": {
                            "query": query,
                            "fields": ["title", "title.english", "title.ngram", "full_citation", "document^3"]
                        },
                    },
                   # "script_score": {
                   #     "script": "_score * (1.0/sqrt(doc['title.simple'].value.length()))"
                   # }
                }
                },
                "highlight": {
                    "pre_tags": ["<span class='search_match'>"],
                    "post_tags": ["</span>"],
                    "fields": {'document': {}}
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
    query = []
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
    not_filters = []
    acts(args, must_filters, not_filters)
    bills(args, must_filters, not_filters)
    other(args, must_filters, not_filters)

    if len(must_filters) or len(not_filters):
        body['filter'] = {"bool": {}}
        if len(must_filters):
            body['filter']["bool"]["must"] = {
                "or": must_filters
            }
        if len(not_filters):
            body['filter']["bool"]["must_not"] = {
                "or": not_filters
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


def acts(args, must_filters, not_filters):
    if args.get('acts'):
        act_type_filter = []
        act_status_filter = []
        act_filter = [{"term": {"type": "act"}}]
        for arg_name, act_type in [
            ('act_public', 'public'), ('act_local', 'local'),
            ('act_private', 'private'), ('act_provincial', 'provincial'),
            ('act_imperial', 'imperial')
        ]:
            if args.get(arg_name):
                act_type_filter.append({"term": {"subtype": act_type}})

        if args.get('act_principal'):
            act_status_filter.append({"and": [
                # doesn't seem to gel with legislation.govt results
                # {"not": {"term": {"stage": "not-in-force"}}},
                {"not": {"term": {"title": "amendment"}}},
                {"range": {"date_first_valid": {"lte": "now"}}}
            ]})
        if args.get('act_not_in_force'):
            act_status_filter.append({"range": {"date_first_valid": {"gt": "now"}}})

        if args.get('act_amendment_in_force'):
            act_status_filter.append({"and":[
                # {"not": {"term": {"stage": "not-in-force"}}},
                {"term": {"title": "amendment"}},
                {"range": {"date_first_valid": {"lte": "now"}}}
            ]})
        if not args.get('act_repealed'):
            act_filter.append({"term": {"repealed": False}})
        else:
            act_status_filter.append({"term": {"repealed": True}})

        if args.get('act_as_enacted'):
            act_status_filter.append({"term": {"in_amend": False}})

        if len(act_type_filter):
            act_type_filter.append({"not": {"exists": {"field": "subtype"}}})
            act_filter.append({"or": act_type_filter})
        if len(act_status_filter):
            act_filter.append({"or": act_status_filter})

        must_filters.append({
            "and": act_filter
        })
    else:
        not_filters.append({"term": {"type": "act"}})


def bills(args, must_filters, not_filters):
    if args.get('bills'):
        bill_filter = [{"term": {"type": "bill"}}]
        bill_type_filter = []
        bill_status_filter = []
        for arg_name, bill_type in [
            ('bill_government', 'government'), ('bill_local', 'local'),
            ('bill_private', 'private'), ('bill_members', 'member')
        ]:
            if args.get(arg_name):
                bill_type_filter.append({"term": {"subtype": bill_type}})

        if args.get('current_bills'):
            bill_status_filter.append({"term": {"bill_enacted": False}})
            bill_status_filter.append({"not": {"exists": {"field": "terminated"}}})

        if args.get('enacted_bills'):
            bill_status_filter.append({"term": {"bill_enacted": True}})
            bill_status_filter.append({"not": {"exists": {"field": "terminated"}}})

        if args.get('terminated_bills'):
            bill_status_filter.append({"exists": {"field": "terminated"}})

        if len(bill_type_filter):
            bill_type_filter.append({"not": {"exists": {"field": "subtype"}}})
            bill_filter.append({"or": bill_type_filter})

        if len(bill_status_filter):
            bill_filter.append({"or": bill_status_filter})

        must_filters.append({
            "and": bill_filter
        })
    else:
        not_filters.append({"term": {"type": "bill"}})


def other(args, must_filters, not_filters):
    if args.get('other'):
        other_filter = [{"or": [{"term": {"type": "regulation"}}, {"term": {"type": "sop"}}]}]
        other_status_filter = []
        if args.get('other_principal'):
            other_status_filter.append({"and":[
                # doesn't seem to gel with legislation.govt results
                # {"not": {"term": {"stage": "not-in-force"}}},
                {"not": {"term": {"title.std": "amendment"}}},
                {"range": {"date_first_valid": {"lte": "now"}}}
            ]})

        if args.get('other_not_in_force'):
            other_status_filter.append({"range": {"date_first_valid": {"gt": "now"}}})

        if args.get('other_amendment_force'):
            other_status_filter.append({"and":[
                # {"not": {"term": {"stage": "not-in-force"}}},
                {"term": {"title.std": "amendment"}},
                {"range": {"date_first_valid": {"lte": "now"}}}
            ]})

        if not args.get('other_revoked'):
            other_filter.append({"term": {"repealed": False}})

        if args.get('other_as_made'):
            other_status_filter.append({"term": {"in_amend": False}})

        if len(other_status_filter):
            other_filter.append({"or": other_status_filter})

        must_filters.append({
            "and": other_filter
        })
    else:
        not_filters.append({"or": [{"term": {"type": "regulation"}}, {"term": {"type": "sop"}}]})


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
        body = {
                "size": 25,
                "from": offset,
                "fields": ['title'],
                "sort": ['num'],
                "query": contains_query(args, 'html'),
                "filter":  {"term": {"_parent": args.get('id')}},
                 "highlight": {
                    "pre_tags": ["<span class='search_match'>"],
                    "post_tags": ["</span>"],
                    "fields": {'html': {"number_of_fragments": 0}},
                    #"phrase_limit" : 1024,
                    #{"fragment_size" : 200, "number_of_fragments" : 100}}
                }
            }
        results = es.search(
            index="legislation",
            doc_type='part',
            body=body)
        return {'type': 'search', 'search_type': 'contains_result', 'search_results': results['hits'], 'title': 'Advanced Search'}
    except Exception, e:
        print e
        raise CustomException('There was a problem with your query')
