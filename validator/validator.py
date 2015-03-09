from db import get_db
from flask import Blueprint, request, jsonify, session


Validator = Blueprint('validator', __name__, template_folder='templates')


@Validator.route('/error_submission', methods=['POST'])
def post_reports():
    db = get_db()
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        query = """insert into error_submissions (id, details, state) values
            (%(id)s,  %(details)s, %(state)s, ) """
        cur.execute(query, {
            'id': session['id'],
            'details': request.form.get('details'),
            'state': request.form.get('state')
        })
        db.commit()
        return jsonify(status='success'), 200
