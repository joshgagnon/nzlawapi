from acts.acts import query_instrument
from acts.queries import get_references, get_versions, get_section_references, get_contents
from cases.cases import query_case
from elasticsearch import query_instrument_fields, query_case_fields
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
        elif query_type == 'contains':
            result = query_contains(args)
        else:
            raise CustomException('Badly formed query')
    except CustomException, e:
        result = {'error': str(e)}
        status = 500
    return jsonify(result), status
