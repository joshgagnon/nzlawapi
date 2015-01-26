from flask import Blueprint, render_template

Base = Blueprint('base', __name__, template_folder='templates')


@Base.route('/')
@Base.route('/validator')
@Base.route('/browser')
@Base.route('/full_article')
@Base.route('/graph')
def browser(act='', query=''):
    return render_template('browser.html')
