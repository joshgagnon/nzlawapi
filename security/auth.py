from functools import wraps
from flask import request, session, current_app, redirect, jsonify
from db import get_db

def request_wants_json():
    best = request.accept_mimetypes \
        .best_match(['application/json', 'text/html'])
    return best == 'application/json' and \
        request.accept_mimetypes[best] > \
        request.accept_mimetypes['text/html']

def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        #try:
        if 'user_id' in session: # or current_app.config.get('NO_AUTH'):
            # hack for dev, find a better way
            #if current_app.config.get('NO_AUTH'):
            #    session['user_id'] = 666
            #    return f(*args, **kwargs)
            # Add IP + UA hash to user_logins table
            db = get_db()
            with db.cursor() as cur:
                cur.execute('UPDATE user_logins SET access_time = NOW() WHERE user_id = %(user_id)s AND access_hash = \'%(access_hash)s\'', {
                    'user_id': session['user_id'],
                    'access_hash': hash(request.headers.get('user_agent') + request.remote_addr)
                })
                db.commit()

                if False:
                    if cur.rowcount == 0:# and not current_app.config.get('NO_AUTH'):
                        # This session either didn't originate on this device/IP or has been dropped due to other active sessions.
                        # To make CORS easier to deal with, superagent doesn't differentiate XHR requests with any headers
                        # Therefore do hard redirect or not based on destination
                        if request.path == '/' or request.path.startswith('/open') or request.path.startswith('/edit') :
                            return redirect('/logout')
                        else:
                            return jsonify({'error': 'Please log in to use this functionality'}), 403

            return f(*args, **kwargs)
        #if request_wants_json():
        return jsonify({'error': 'Please log in or create an account to use this functionality'}), 403
        #return redirect(current_app.config.get('USERS_LOGIN_URL'))
        # can't do this pokemon style
        #except Exception, e:
        #    return jsonify(error=str(e)), 500

    return wrapper
