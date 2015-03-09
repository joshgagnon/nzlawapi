from functools import wraps
from flask import session, current_app, redirect


def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if 'user_id' in session or current_app.config.get('NO_AUTH'):
            # hack for dev, find a better way
            if 'user_id' not in session:
                session['user_id'] = 666
            return f(*args, **kwargs)
        return redirect(current_app.config.get('USERS_LOGIN_URL'))
    return wrapper
