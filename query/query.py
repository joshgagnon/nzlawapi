from acts.acts import query_act, query_acts, get_act_node_by_id
from cases.cases import get_full_case, get_case_info, case_search
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from util import CustomException
from db import get_db
import psycopg2
import re


Query = Blueprint('query', __name__, template_folder='templates')


@Query.route('/article_auto_complete')
def article_auto_complete():
    try:
        db = get_db()
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                select id, name, type from titles
                   where name ilike '%%'||%(query)s||'%%' order by name limit 25;
                """, {'query': request.args.get('query')})
            return jsonify({'results': cur.fetchall()})
    except Exception, e:
        return jsonify(error=str(e))


@Query.route('/act_search_id/<string:query>')
def search_by_id(query):
    status = 200
    try:
        result = get_act_node_by_id(query)
    except Exception, e:
        result = {'error': str(e)}
        status = 500
    return jsonify(result), status


def query_case(args):
    case = args.get('title')
    if case and args.get('validator'):
        return get_case_info(case)
    if case:
        return get_full_case(case)
    # TODO id
    if args.get('id'):
        return get_full_case(id=args.get('id'))
    raise CustomException('Invalid search type')


def query_cases(args):
    query = args.get('query')
    if not query:
        raise CustomException('Query missing')
    results = case_search(re.escape(args.get('query', '')))
    return {'results': results, 'title': 'Search: %s' % query}


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
                    "fields": ["title^3", "full_citation^3", "docunent"]
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
    print results
    return {'type': 'search', 'search_results': results['hits'], 'title': 'Search: %s' % query}


@Query.route('/case/file/<path:filename>')
def case_file(filename):
    case_path = current_app.config['CASE_DIR']
    return send_from_directory(case_path, filename)


@Query.route('/query')
def query():
    args = request.args
    query_type = args.get('type')
    status = 200
    try:
        if query_type == 'search':
            result = query_all(args)
        elif query_type in ['act', 'regulation', 'instrument']:
            result = query_act(args)
        elif query_type == 'acts' or query_type == 'regulations':
            result = query_acts(args)
        elif query_type == 'case':
            result = query_case(args)
        elif query_type == 'cases':
            result = query_cases(args)
        else:
            raise CustomException('Badly formed query')
    except CustomException, e:
        result = {'error': str(e)}
        status = 500
    return jsonify(result), status
