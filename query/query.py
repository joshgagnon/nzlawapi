from acts.acts import query_instrument
from acts.queries import get_references, get_versions, get_section_references, get_contents
from cases.cases import query_case
from elasticsearch import query_instrument_fields, query_case_fields, query_all
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from util import CustomException
from security.auth import require_auth
from db import get_db
import psycopg2


Query = Blueprint('query', __name__, template_folder='templates')


@Query.route('/article_auto_complete')
@require_auth
def article_auto_complete():
    db = get_db()
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            select name, id, type, find, query  from titles
               where name ilike '%%'||%(query)s||'%%'
               order by  base_score asc, position(%(query)s in lower(name)), char_length(name) asc, refs desc,  year desc
            limit 50;
            """, {'query': request.args.get('query').lower()})
        return jsonify({'results': cur.fetchall()})


@Query.route('/definition/<string:ids>')
@Query.route('/definition/<string:ids>/<string:exids>')
@require_auth
def get_definition_route(ids, exids=None):
    try:
        return jsonify(get_definition(ids.split(';'), exids.split(';') if exids else None))
    except Exception, e:
        raise CustomException('Could not retrieve definition')


@Query.route('/link/<string:key>')
@Query.route('/link/<string:doc_type>/<string:key>')
@require_auth
def get_link_route(doc_type=None, key=None):
    if doc_type is None or doc_type == 'instrument':
        return jsonify(query_instrument({'find': 'preview', 'id': key}))
    else:
        raise CustomException("Can't locate link information")



@Query.route('/references/<int:document_id>')
@require_auth
def get_references_route(document_id):
    return jsonify(get_references(document_id))


# deprecate
@Query.route('/section_references')
@require_auth
def get_section_references_route():
    return jsonify(get_section_references(
        request.args.get('document_id'), request.args.get('govt_ids').split(','), request.args.get('target_path')))



@Query.route('/versions/<int:document_id>')
@require_auth
def get_versions_route(document_id):
    return jsonify(get_versions(document_id))


@Query.route('/contents/<int:document_id>')
@require_auth
def get_contents_route(document_id):
    return jsonify(get_contents(document_id))


def get_definition(ids, exids):
    with get_db().cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute('SELECT html, priority FROM definitions WHERE  id=ANY(%(ids)s) order by priority desc', {
            'ids': ids
        })
        defs = cur.fetchall()
        html = ''.join(map(lambda a: a['html'], defs))
        if exids and len(exids):
            cur.execute('SELECT html, priority FROM definitions WHERE  id=ANY(%(ids)s) order by priority desc', {
                'ids': exids
            })
            defs = cur.fetchall()
            # TODO get rid of html
            html += '<p class="other-defs">Other definitions found:</p>'
            html += ''.join(map(lambda a: a['html'], defs))
        return {'html_content': html}


@Query.route('/definitions/<string:term>')
@require_auth
def query_definitions(term):
    offset = request.args.get('offset', '0')  # TODO: Use this
    with get_db().cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""SELECT full_word, html, d.id, d.document_id FROM definitions d
            JOIN latest_instruments l on l.id = d.document_id
            WHERE full_word  ilike %(term)s order by length(full_word) LIMIT 25 OFFSET %(offset)s """, {
            'term': '%s%%' % term,
            'offset': offset
        })
        result = {'title': 'Define: %s' % term, 'results': cur.fetchall()}
    return jsonify(result)


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
    return jsonify(result)
