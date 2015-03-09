from db import get_db
from flask import Blueprint, request, jsonify, session
from security.auth import require_auth
import json

Users = Blueprint('users', __name__, template_folder='templates')


@Users.route('/saved_states', methods=['GET'])
@require_auth
def get_saved_states():
    db = get_db()
    with db.cursor() as cur:
        query = """select data from user_settings where user_id = %(id)s"""
        cur.execute(query, {
            'id': session['user_id']
        })
        results = cur.fetchone()
        return jsonify({'saved_states': results[0] if results else None}), 200


@Users.route('/saved_states', methods=['POST'])
@require_auth
def post_saved_states():
    db = get_db()
    with db.cursor() as cur:
        cur.execute("""delete from user_settings where user_id = %(id)s""", {'id': session['user_id']})
        query = """insert into user_settings (user_id, data) values (%(id)s, %(data)s) """
        cur.execute(query, {
            'id': session['user_id'],
            'data': json.dumps(request.get_json().get('saved_states'))
        })
        db.commit()
        return jsonify({'success': True}), 200
