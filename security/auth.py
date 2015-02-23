from functools import wraps
from flask import  session, current_app


def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if 'user_id' in session or current_app.config.get('NO_AUTH'):
            return f(*args, **kwargs)
        return 'You need to log in <a href="' + current_app.config.get('USERS_LOGIN_URL') + '">here</a>'
    return wrapper
