from db import get_db
from flask import Blueprint, request, jsonify
import psycopg2


Validator = Blueprint('validator', __name__, template_folder='templates')


@Validator.route('/validate_case', methods=['POST'])
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


@Validator.route('/error_reports', methods=['GET'])
def get_reports():
    with get_db().cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        query = """select * from error_reports where id = %(id)s """
        print request.args.get('id')
        cur.execute(query, {'id': request.args.get('id')})
        return jsonify(results=cur.fetchall())


@Validator.route('/error_reports', methods=['POST'])
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
