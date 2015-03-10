from db import get_db
from flask import Blueprint, request, jsonify, session
import psycopg2
import json

Validator = Blueprint('validator', __name__, template_folder='templates')


@Validator.route('/submit_issue', methods=['POST'])
def post_reports():
    db = get_db()
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        query = """insert into error_submissions (user_id, details, state) values
            (%(user_id)s,  %(details)s, %(state)s) """
        cur.execute(query, {
            'user_id': session['user_id'],
            'details': request.get_json().get('details'),
            'state': json.dumps(request.get_json().get('state'))
        })
        db.commit()
        return jsonify(status='success'), 200


@Validator.route('/submit_issues', methods=['GET'])
def get_reports():
    db = get_db()
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        query = """select * from error_submissions """
        cur.execute(query)
        return jsonify({"results": cur.fetchall()}), 200
