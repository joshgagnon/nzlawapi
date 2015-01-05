from flask import Blueprint, render_template, json, jsonify, g, request, send_from_directory

mod = Blueprint('base', __name__, template_folder='templates')


@mod.route('/')
@mod.route('/validator')
@mod.route('/full_act')
def browser(act='', query=''):
    return render_template('browser.html')