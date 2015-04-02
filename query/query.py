from acts.acts import query_instrument
from acts.queries import get_references, get_versions, get_section_references, get_contents
from cases.cases import query_case
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from util import CustomException
from security.auth import require_auth
from db import get_db
import psycopg2
import re


Query = Blueprint('query', __name__, template_folder='templates')


@Query.route('/article_auto_complete')
@require_auth
def article_auto_complete():
    try:
        db = get_db()
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                select name, id, type, find, query  from titles
                   where name ilike '%%'||%(query)s||'%%' order by year desc limit 50;
                """, {'query': request.args.get('query')})
            return jsonify({'results': cur.fetchall()})
    except Exception, e:
        return jsonify(error=str(e))


@Query.route('/act_search_id/<string:query>')
@require_auth
def search_by_id(query):
    status = 200
    try:
        result = get_act_node_by_id(query)
    except Exception, e:
        result = {'error': str(e)}
        status = 500
    return jsonify(result), status


@Query.route('/definition/<string:ids>')
@require_auth
def get_definition_route(ids):
    status = 200
    try:
        result = get_definition(ids.split(';'))
    except Exception, e:
        result = {'error': 'Could not retrieve definition'}
        status = 500
    return jsonify(result), status


@Query.route('/link/<string:key>')
@Query.route('/link/<string:doc_type>/<string:key>')
@require_auth
def get_link_route(doc_type=None, key=None):
    status = 200
    try:
        if doc_type is None or doc_type == 'instrument':
            result = query_instrument({'find': 'preview', 'id': key})
        else:
            raise CustomException("Can't locate link information")
    except Exception, e:
        result = {'error': str(e)}
        status = 500
    return jsonify(result), status


@Query.route('/references/<int:document_id>')
@require_auth
def get_references_route(document_id):
    status = 200
    try:
        result = get_references(document_id)
    except Exception, e:
        result = {'error': str(e)}
        status = 500
    return jsonify(result), status


@Query.route('/section_references')
@require_auth
def get_section_references_route():
    status = 200
    try:
        result = get_section_references(request.args.get('govt_ids').split(','))
    except Exception, e:
        result = {'error': str(e)}
        status = 500
    return jsonify(result), status


@Query.route('/versions/<int:document_id>')
@require_auth
def get_versions_route(document_id):
    status = 200
    try:
        result = get_versions(document_id)
    except Exception, e:
        result = {'error': str(e)}
        status = 500
    return jsonify(result), status


@Query.route('/contents/<int:document_id>')
@require_auth
def get_contents_route(document_id):
    status = 200
    try:
        result = get_contents(document_id)
    except Exception, e:
        result = {'error': str(e)}
        status = 500
    return jsonify(result), status


def get_definition(ids):
    with get_db().cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute('SELECT html, priority FROM definitions WHERE  id=ANY(%(ids)s) order by priority', {
            'ids': ids
        })
        return {'html_content': ''.join(map(lambda a: a['html'], cur.fetchall()))}


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


def contains_query(args):
    if args.get('contains_type') == 'all_words':
        return {
            "simple_query_string": {
                "query": args.get('contains'),
                "fields": ['document'],
                "default_operator": 'AND'
            }}
    if args.get('contains_type') == 'any_words':
        return {
            "simple_query_string": {
                "query": args.get('contains'),
                "fields": ['document'],
                "default_operator": 'OR'
            }}
    if args.get('contains_type') == 'exact':
        return {
            "match_phrase": {
                "document": args.get('contains')
            }}


def query_all(args):
    query = args.get('query')
    es = current_app.extensions['elasticsearch']
    offset = args.get('offset')
    results = es.search(
        index="legislation",
        body={
            "from": offset, "size": 25,
            "fields": ["id", "title", "full_citation"],
            "sort": [
                "_score",
            ],
            "query": {
                "multi_match": {
                    "query": query,
                    "fields": ["title^3", "full_citation^3", "document"]
                }
            },
            "highlight": {
                "pre_tags": ["<span class='search_match'>"],
                "post_tags": ["</span>"],
                "fields": {
                    "document": {},
                    "full_citation": {},
                    "title": {}
                }
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


def query_instrument_fields(args):
    must = []
    fields = {}
    type_filters = []

    try:
        if args.get('title'):
            must.append({"simple_query_string": {
                "query": args.get('title'),
                "fields": ['title'],
                "default_operator": 'AND'}
            })
        if args.get('contains'):
            fields['document'] = {}
            must.append(contains_query(args))
        if args.get('year'):
            must.append(year_query(args))
        if args.get('acts'):
            act_type_filter = []
            for arg_name, act_type in [('act_public', 'public'), ('act_local', 'local'), ('act_private', 'private'), ('act_provincial', 'provincial'), ('act_imperial', 'imperial')]:
                if args.get(arg_name):
                    act_type_filter.append({"term": {"subtype": act_type}})

            # TODO: status: 'act_principal', 'act_not_in_force', 'act_amendment_in_force', 'act_as_enacted', 'act_repealed'
            act_status_filter = []
            # Example heuristic for when ES is populated
            # if args.get('act_principal'):
            #     act_status_filter.append({
            #         "bool": {
            #             "must": [
            #                 {"term": {"amendment": false}}
            #                 {"term": {"status": "in-force"}}  # TODO: status field must have "index" : "not_analyzed" for hyphen to work
            #             ]
            #         }
            #     })

            # To be included type==act and at least one of each type and status filter must match
            type_filters.append({
                "bool": {
                    "must": [
                        {"term": {"type": "act"}},
                        {"bool": {"should": act_type_filter}},
                        {"bool": {"should": act_status_filter}}
                    ]
                }
            })
        if args.get('bills'):
            bill_type_filter = []
            for arg_name, bill_type in [('bill_government', 'government'), ('bill_local', 'local'), ('bill_private', 'private'), ('bill_members', 'member')]:
                if args.get(arg_name):
                    bill_type_filter.append({"term": {"subtype": bill_type}})

            # TODO: status: 'current_bills', 'enacted_bills', 'terminated_bills'
            bill_status_filter = []

            type_filters.append({
                "bool": {
                    "must": [
                        {"term": {"type": "bill"}},
                        {"bool": {"should": bill_type_filter}},
                        {"bool": {"should": bill_status_filter}}
                    ]
                }
            })
        if args.get('other'):
            # TODO: status: 'other_principal', 'other_not_in_force', 'other_amendment_force','other_as_made', 'other_revoked'
            type_filters.append({"term": {"type": "regulation"}})
            type_filters.append({"term": {"type": "sop"}})

        es = current_app.extensions['elasticsearch']
        offset = args.get('offset', 0)
        results = es.search(
            index="legislation",
            doc_type="instrument",
            body={
                "from": offset, "size": 25,
                "fields": ["id", "title"],
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
                },
                "filter": {
                    "bool": {
                        "should": type_filters
                    }
                }
            })
        return {'type': 'search', 'search_results': results['hits'], 'title': 'Advanced Search'}
    except Exception, e:
        print e
        raise CustomException('There was a problem with your query')


@Query.route('/case/file/<path:filename>')
@require_auth
def case_file(filename):
    case_path = current_app.config['CASE_DIR']
    return send_from_directory(case_path, filename)


@Query.route('/query')
@require_auth
def query():
    args = request.args
    query_type = args.get('doc_type')
    status = 200
    try:
        if query_type == 'all':
            result = query_all(args)
        elif query_type in ['act', 'regulation', 'sop', 'bill', 'instrument']:
            result = query_instrument(args)
        elif query_type in ['instruments']:
            result = query_instrument_fields(args)
        elif query_type == 'case':
            result = query_case(args)
        elif query_type == 'cases':
            result = query_case_fields(args)
        else:
            raise CustomException('Badly formed query')
    except CustomException, e:
        result = {'error': str(e)}
        status = 500
    return jsonify(result), status
