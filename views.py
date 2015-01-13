from flask import Blueprint, render_template

mod = Blueprint('base', __name__, template_folder='templates')


@mod.route('/')
@mod.route('/validator')
@mod.route('/full_article')
def browser(act='', query=''):
    return render_template('browser.html')
