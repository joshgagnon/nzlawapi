# -*- coding: utf-8 -*-
from views import Base
from validator.validator import Validator
from users.users import Users
from query.query import Query
import graph
import sys
import os
from util import CustomException
from flask import jsonify, g, request, Flask, render_template
from flask.json import JSONEncoder
import datetime
import time
import elasticsearch
import logging
import json
from logging import Formatter
from logging.handlers import RotatingFileHandler


class CustomJSONEncoder(JSONEncoder):
    def default(self, obj):
        try:
            if isinstance(obj, datetime.date):
                return obj.isoformat()
        except TypeError:
            pass
        #else:
        #    return list(iterable)
        return JSONEncoder.default(self, obj)


if len(sys.argv) <= 1:
    raise Exception('need a config file')
if not os.path.isfile('build/manifest.json'):
    raise Exception('need a build manifest.  Run gulp')


app = Flask(__name__, static_folder='build')
app.config.from_pyfile(os.environ.get('CONFIG_FILE') or sys.argv[1])
app.register_blueprint(Base)
app.register_blueprint(Validator)
app.register_blueprint(Query)
app.register_blueprint(Users)
app.json_encoder = CustomJSONEncoder
app.extensions['elasticsearch'] = elasticsearch.Elasticsearch([app.config['ES_SERVER']])
app.secret_key = app.config['SESSION_SECRET']

with open('build/manifest.json') as m:
    app.config['manifest'] =json.loads(m.read())

if app.config.get('LOG_FILE'):

    handler = RotatingFileHandler(
    app.config['LOG_FILE'],
    'a',
    maxBytes=1024 * 1024,
    backupCount=20)
else:
    handler = logging.StreamHandler()
handler.setFormatter(Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
handler.setLevel(logging.DEBUG)
app.logger.addHandler(handler)
logging.getLogger('werkzeug').addHandler(handler)
app.logger.setLevel(logging.INFO)


@app.teardown_appcontext
def close_db(error):
    if hasattr(g, 'db'):
        g.db.commit()
        g.db.close()

@app.before_request
def before_request():
    g.start = time.time()
    # Check that application is not down for maintenance
    if os.path.isfile('down_lock') and not request.path.endswith(('.png', '.jpg', '.css')):
        return render_template('down.html'), 503

@app.teardown_request
def teardown_request(exception=None):
    diff = time.time() - g.start
    if diff > 2:
        app.logger.info('Request took %.2f seconds' % diff)

@app.errorhandler(CustomException)
def handle_invalid_usage(error):
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    app.logger.info('ERROR %s' % error.message)
    return response

def run():
    app.run(app.config['IP'], debug=app.config['DEBUG'], port=app.config['PORT'])
    app.logger.info('Starting Server')

if __name__ == '__main__':
    run()

