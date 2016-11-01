import hmac
from hashlib import sha256
from flask import Blueprint, render_template, request, redirect, current_app, session, jsonify
from security.auth import require_auth
from db import get_db
import json
import requests
from flask_cors import  cross_origin

Base = Blueprint('base', __name__, template_folder='templates')


@Base.route('/login')
def login():
    args = request.args
    provided_code = args.get('code')

    if not all([provided_code]):
        return redirect(current_app.config.get('USERS_LOGIN_URL'))

    params = {
        'code': provided_code,
        'grant_type': 'authorization_code',
        'client_id': current_app.config.get('OAUTH_CLIENT_ID'),
        'client_secret': current_app.config.get('OAUTH_CLIENT_SECRET'),
        'redirect_uri': current_app.config.get('LAW_BROWSER_LOGIN_URL')
    }
    response = requests.post(current_app.config.get('OAUTH_ACCESS_TOKEN_URL'), data=params)
    data = response.json()

    response = requests.get(current_app.config.get('USER_RESOURCE_URL'), params={'access_token': data['access_token']})
    data = response.json()
    session['user_id'] = data['id']
    session['user_name'] = data['email']

    # Register this device/IP session
    db = get_db()
    with db.cursor() as cur:
        try:
            cur.execute('INSERT INTO user_logins (user_id, access_hash, access_time) VALUES (%(user_id)s, \'%(access_hash)s\', NOW())', {
                'user_id': data['id'],
                'access_hash': hash(request.headers.get('user_agent') + request.remote_addr)
            })
            db.commit()
        except Exception:
            # User might be already logged in with this device/IP, ignore
            db.rollback()
    return redirect('/')


def limit_logon(user_id):
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
    try:
        del session['user_id']
    except:
        pass
    return redirect(current_app.config.get('USER_LOGOUT_URL'))


#@require_auth
@Base.route('/')
@Base.route('/open_article/<sub>')
@Base.route('/open_article/<sub>/<subsub>')
@Base.route('/open_definition/<sub>', strict_slashes=False)
@Base.route('/open_definition/<sub>/<subsub>', strict_slashes=False)
@Base.route('/edit_published/<sub>')
@Base.route('/case_preview', methods=['GET'])
def browser(**args):
    return render_template('browser.html',
                           json_data=json.dumps({
                                                'logged_in': 'user_id' in session,
                                                'login_url': current_app.config.get('USERS_LOGIN_URL'),
                                                'account_url': current_app.config.get('ACCOUNT_URL')
                                                 }))

@Base.route('/touch', methods=['GET'])
@cross_origin()
def touch(**args):
    return jsonify({'status': 'success'})


@Base.route('/published/<int:id>')
def published(id):
    with get_db().cursor() as cur:
        cur.execute('SELECT html from published_views where publish_id = %(id)s', {'id': id})
        return render_template('published.html', content= unicode(cur.fetchone()[0].decode('utf-8')) )