import hmac
from hashlib import sha256
from flask import Blueprint, render_template, request, redirect, current_app, session
from security.auth import require_auth
from db import get_db
import json

Base = Blueprint('base', __name__, template_folder='templates')


@Base.route('/login')
def login():
    args = request.args
    user_id = args.get('user_id')
    user_name = args.get('name')
    timestamp = args.get('timestamp')
    admin = args.get('admin')
    provided_code = args.get('code')

    if not all([user_id, timestamp, user_name, admin, provided_code]):
        return redirect(current_app.config.get('USERS_LOGIN_URL'))

    message = str(request.base_url) + str(user_id) + str(user_name) + str(timestamp) + str(admin)
    hash_obj = hmac.new(key=current_app.config.get('SSO_SHARED_SECRET'), msg=message, digestmod=sha256)
    calculated_code = hash_obj.hexdigest()

    if provided_code != calculated_code:
        return redirect(current_app.config.get('USERS_LOGIN_URL'))

    session['user_id'] = user_id
    session['user_name'] = user_name

    # Register this device/IP session
    db = get_db()
    with db.cursor() as cur:
        try:
            cur.execute('INSERT INTO user_logins (user_id, access_hash, access_time) VALUES (%(user_id)s, \'%(access_hash)s\', NOW())', {
                'user_id': user_id,
                'access_hash': hash(request.headers.get('user_agent') + request.remote_addr)
            })
            db.commit()
        except Exception:
            # User might be already logged in with this device/IP, ignore
            db.rollback()
    # If this takes us over login limit, delete old sessions
    if False:
        # DISABLED
        max_sessions = current_app.config.get('MAX_SESSIONS_PER_USER')
        with db.cursor() as cur:
            cur.execute('SELECT COUNT(*) FROM user_logins WHERE user_id = %(user_id)s', {'user_id': user_id})
            result = cur.fetchone()
            if result[0] > max_sessions:
                # This deletes ALL above max_sessions, not just oldest
                cur.execute("""
                    DELETE FROM user_logins WHERE user_id = %(user_id)s AND access_hash NOT IN (
                        SELECT access_hash FROM user_logins WHERE user_id = %(user_id)s ORDER BY access_time DESC LIMIT %(max_sessions)s
                    )
                """, {
                    'user_id': user_id,
                    'max_sessions': max_sessions
                })
                db.commit()

    return redirect('/')


@Base.route('/logout')
def logout():
    del session['user_id']
    return redirect(current_app.config.get('USERS_LOGOUT_URL'))


#@require_auth
@Base.route('/')
@Base.route('/open_article/<sub>')
@Base.route('/open_article/<sub>/<subsub>')
@Base.route('/edit_published/<sub>')
@Base.route('/case_preview', methods=['GET'])
def browser(**args):
    return render_template('browser.html', json_data=json.dumps({'logged_in': 'user_id' in session}))


@Base.route('/published/<int:id>')
def published(id):
    with get_db().cursor() as cur:
        cur.execute('SELECT html from published_views where publish_id = %(id)s', {'id': id})
        return render_template('published.html', content= unicode(cur.fetchone()[0].decode('utf-8')) )