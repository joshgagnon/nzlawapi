from flask import Blueprint, render_template

Base = Blueprint('base', __name__, template_folder='templates')


@Base.route('/')
@Base.route('/validator')
@Base.route('/browser')
@Base.route('/open_article/<sub>')
@Base.route('/open_article/<sub>/<subsub>')
def browser(**args):
    return render_template('browser.html')
