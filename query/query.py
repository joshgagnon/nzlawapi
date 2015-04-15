from acts.acts import query_instrument
from acts.queries import get_references, get_versions, get_section_references, get_contents
from cases.cases import query_case
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from util import CustomException
from security.auth import require_auth
from db import get_db
import psycopg2


Query = Blueprint('query', __name__, template_folder='templates')


@Query.route('/article_auto_complete')
@require_auth
def article_auto_complete():
    try:
        db = get_db()
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                select name, id, type, find, query  from titles
                   where name ilike '%%'||%(query)s||'%%'
                   order by  base_score asc, position(%(query)s in lower(name)), char_length(name) asc, refs desc, children desc, year desc
                limit 50;
                """, {'query': request.args.get('query').lower()})
            return jsonify({'results': cur.fetchall()})
    except Exception, e:
        return jsonify(error=str(e))


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


@Query.route('/definitions/<string:term>')
@require_auth
def query_definitions(term):
    offset = request.args.get('offset', '0')  # TODO: Use this
    status = 200
    try:
        with get_db().cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""SELECT full_word, html, d.id, d.document_id FROM definitions d
                JOIN latest_instruments l on l.id = d.document_id
                WHERE full_word  ilike %(term)s order by length(full_word) LIMIT 25 OFFSET %(offset)s """, {
                'term': '%s%%' % term,
                'offset': offset
            })
            result = {'title': 'Define: %s' % term, 'results': cur.fetchall()}
    except Exception, e:
        result = {'error': str(e)}
        status = 500
    return jsonify(result), status


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
    """ this is the basic search """
    query = args.get('query').lower()
    es = current_app.extensions['elasticsearch']
    offset = args.get('offset')
    results = es.search(
        index="legislation",
        body={
            "from": offset, "size": 25,
            "fields": ["id", "title", "full_citation", 'year', 'number', 'type', 'subtype', 'base_score', 'refs'],
            "sort": [

                "_score",
                {"base_score": "asc"},
                {"refs": "desc"},
            ],
            "query": {
                "bool": {
                    "should": [
                        {"multi_match": {
                            "query": query,
                            "fields": ["title.std", "full_citation"],
                            "boost": 3
                        }},
                    ],
                    "must": [
                        {"multi_match": {
                            "query": query,
                            "fields": ["title", "full_citation"]
                        }}],
                }
            },

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
    must_filters = []
    not_filters = []

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
            print must
        if args.get('year'):
            must.append(year_query(args))
        if args.get('acts'):
            act_type_filter = []
            act_status_filter = []
            act_filter = [{"term": {"type": "act"}}]
            for arg_name, act_type in [('act_public', 'public'), ('act_local', 'local'), ('act_private', 'private'), ('act_provincial', 'provincial'), ('act_imperial', 'imperial')]:
                if args.get(arg_name):
                    act_type_filter.append({"term": {"subtype": act_type}})

            if args.get('act_principal'):
                act_status_filter.append({"and":[
                    # doesn't seem to gel with legislation.govt results
                    #{"not": {"term": {"stage": "not-in-force"}}},
                    {"not": {"term": {"title.std": "amendment"}}},
                    {"range": {"date_first_valid": {"lte": "now"}}}
                    ]})
            if args.get('act_not_in_force'):
                act_status_filter.append({"range": {"date_first_valid": {"gt": "now"}}})

            if args.get('act_amendment_in_force'):
                act_status_filter.append({"and":[
                    #{"not": {"term": {"stage": "not-in-force"}}},
                    {"term": {"title.std": "amendment"}},
                    {"range": {"date_first_valid": {"lte": "now"}}}
                    ]})
            if not args.get('act_repealed'):
                act_filter.append({"term": {"repealed": False}})
            else:
                act_status_filter.append({"term": {"repealed": True}})

            if args.get('act_as_enacted'):
                act_filter.append({"term": {"in_amend": False}})

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

        if args.get('bills'):
            bill_filter = [{"term": {"type": "bill"}}]
            bill_type_filter = []
            bill_status_filter = []
            for arg_name, bill_type in [('bill_government', 'government'), ('bill_local', 'local'), ('bill_private', 'private'), ('bill_members', 'member')]:
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

        if args.get('other'):
            # TODO: status: 'other_principal', 'other_not_in_force', 'other_amendment_force','other_as_made', 'other_revoked'
            other_filter = [{"or": [{"term": {"type": "regulation"}}, {"term": {"type": "sop"}}]}]
            other_status_filter = []
            if args.get('other_principal'):
                other_status_filter.append({"and":[
                    # doesn't seem to gel with legislation.govt results
                    #{"not": {"term": {"stage": "not-in-force"}}},
                    {"not": {"term": {"title.std": "amendment"}}},
                    {"range": {"date_first_valid": {"lte": "now"}}}
                    ]})

            if args.get('other_not_in_force'):
                other_status_filter.append({"range": {"date_first_valid": {"gt": "now"}}})

            if args.get('other_amendment_force'):
                other_status_filter.append({"and":[
                    #{"not": {"term": {"stage": "not-in-force"}}},
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

        es = current_app.extensions['elasticsearch']
        offset = args.get('offset', 0)
        body = {
                "from": offset, "size": 25,
                "fields": ["id", "title",'year', 'number', 'type', 'subtype'],
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

            }

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
        results = es.search(
            index="legislation",
            doc_type="instrument",
            body=body)
        def get_totals(hit):
            result = {}
            for detail in hit['_explanation']['details']:
                pass
            return result
        clean_results = results['hits'] #map(get_totals, results['hits'])
        return {'type': 'search', 'search_results': clean_results, 'title': 'Advanced Search'}
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
