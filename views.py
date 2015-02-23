import sys
from functools import wraps
import hmac
from hashlib import sha256
from flask import Blueprint, render_template, session, request, redirect, Flask

Base = Blueprint('base', __name__, template_folder='templates')

app = Flask(__name__, static_folder='build')
app.config.from_pyfile(sys.argv[1])
login_page = app.config['USERS_LOGIN_URL']
shared_secret = app.config['SSO_SHARED_SECRET']


def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if 'user_id' in session:
            return f(*args, **kwargs)
        return 'You need to log in <a href="' + login_page + '">here</a>'
    return wrapper


@Base.route('/login')
def login():
    args = request.args
    user_id = args.get('user_id')
    user_name = args.get('name')
    timestamp = args.get('timestamp')
    provided_code = args.get('code')

    if user_id is None or timestamp is None or user_name is None or provided_code is None:
        return redirect(login_page)

    message = str(user_id) + str(user_name) + str(timestamp)
    hash_obj = hmac.new(key=shared_secret, msg=message, digestmod=sha256)
    calculated_code = hash_obj.hexdigest()

    if provided_code != calculated_code:
        return redirect(login_page)

    session['user_id'] = user_id
    session['user_name'] = user_name

    return redirect('/')


@Base.route('/logout')
def logout():
    del session['user_id']
    return redirect('/')


@Base.route('/')
@Base.route('/validator')
@Base.route('/browser')
@Base.route('/open_article/<sub>')
@Base.route('/open_article/<sub>/<subsub>')
@require_auth
def browser(**args):
    return render_template('browser.html')
