from db import get_db
from acts.acts import query_act, query_acts, get_act_node_by_id
from util import CustomException
from views import mod
from cases.cases import get_full_case, get_case_info, case_search
import graph
import sys
from flask import jsonify, g, request, send_from_directory, Flask
from flask.json import JSONEncoder
import datetime
import re
import psycopg2
import time


class CustomJSONEncoder(JSONEncoder):
    def default(self, obj):
        try:
            if isinstance(obj, datetime.date):
                return obj.isoformat()
        except TypeError:
            pass
        #else:
        #    return list(iterable)
        return JSONEncoder.default(self, obj)


if len(sys.argv) <= 1:
    raise Exception('need a config file')


app = Flask(__name__, static_folder='build')
app.config.from_pyfile(sys.argv[1])
app.register_blueprint(mod)
app.json_encoder = CustomJSONEncoder


@app.route('/acts.json')
def acts(act='', query=''):
    try:
        db = get_db()
        with db.cursor() as cur:
            cur.execute("""(select trim(title), id from acts
                where title is not null group by id, title order by trim(title))
                union
                (select trim(title), id from regulations
                where title is not null group by id, title order by trim(title))""")
            return jsonify({'acts': cur.fetchall()})
    except Exception, e:
        return jsonify(error=str(e))


@app.route('/cases.json')
def cases(act='', query=''):
    try:
        db = get_db()
        with db.cursor() as cur:
            cur.execute("""select trim(full_citation), document_id from cases where full_citation is not null order by trim(full_citation)""")
            return jsonify({'cases': cur.fetchall()})
    except Exception, e:
        return jsonify(error=str(e))


@app.route('/act_case_hint.json')
def act_case_hint():
    try:
        db = get_db()
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                select title as name, type from
                    ((select trim(full_citation) as title, 'case' as type from cases
                        where full_citation is not null order by trim(full_citation))
                    union
                    (select trim(title) as title, 'act' as type from acts
                        where latest_version = true and title is not null group by id, title order by trim(title) )
                    union
                    (select trim(title) as title, 'regulation' as type from regulations
                        where latest_version = true and title is not null group by id, title order by trim(title))) q
                   where title ilike '%%'||%(query)s||'%%' order by title limit 25;
                """, {'query': request.args.get('query')})
            return jsonify({'results': cur.fetchall()})
    except Exception, e:
        return jsonify(error=str(e))


@app.route('/validate_case', methods=['POST'])
def validate():
    db = get_db()
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        query = """update cases set validated = %(validated)s, reporter = %(username)s where id = %(id)s """
        cur.execute(query, {
            'id': request.form.get('id'),
            'validated': request.form.get('validated'),
            'username': request.form.get('username')
        })
        db.commit()
        return jsonify(status='success'), 200


@app.route('/error_reports', methods=['GET'])
def get_reports():
    with get_db().cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        query = """select * from error_reports where id = %(id)s """
        print request.args.get('id')
        cur.execute(query, {'id': request.args.get('id')})
        return jsonify(results=cur.fetchall())


@app.route('/error_reports', methods=['POST'])
def post_reports():
    db = get_db()
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        query = """insert into error_reports (id, reporter, details, fields, mapper) values
            (%(id)s, %(reporter)s, %(details)s, %(fields)s, 'cases') """
        cur.execute(query, {
            'id': request.form.get('id'),
            'reporter': request.form.get('reporter'),
            'details': request.form.get('details'),
            'fields': request.form.getlist('fields[]')
        })
        db.commit()
        return jsonify(status='success'), 200


@app.route('/act_search_id/<string:query>')
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
    raise CustomException('Invalid search type')


def query_cases(args):
    query = args.get('query')
    if not query:
        raise CustomException('Query missing')
    results = case_search(re.escape(args.get('query', '')))
    return {'results': results}


def query_all(args):
    #title = args.get('article_name')
    results = []
    return {'results': results}


@app.route('/case/file/<path:filename>')
def case_file(filename):
    case_path = app.config['CASE_DIR']
    return send_from_directory(case_path, filename)


@app.route('/query')
def query():
    args = request.args
    query_type = args.get('type')
    status = 200
    try:
        if query_type == 'act' or query_type == 'regulation':
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


@app.route('/map')
def map():
    args = request.args
    centre_id = args.get('id')
    status = 200
    try:
        result = {'results': graph.get_links(centre_id)}
    except CustomException, e:
        result = {'error': str(e)}
        status = 500
    return jsonify(result), status


@app.teardown_appcontext
def close_db(error):
    if hasattr(g, 'db'):
        g.db.close()


@app.before_request
def before_request():
    g.start = time.time()


@app.teardown_request
def teardown_request(exception=None):
    diff = time.time() - g.start
    if diff > 2:
        print 'Request took %.2f seconds' % diff


if __name__ == '__main__':
    app.run(app.config['IP'], debug=app.config['DEBUG'], port=app.config['PORT'])
