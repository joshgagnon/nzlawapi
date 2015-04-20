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
import json


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
app.config.from_pyfile(sys.argv[1])
app.register_blueprint(Base)
app.register_blueprint(Validator)
app.register_blueprint(Query)
app.register_blueprint(Users)
app.json_encoder = CustomJSONEncoder
app.extensions['elasticsearch'] = elasticsearch.Elasticsearch([app.config['ES_SERVER']])
app.secret_key = app.config['SESSION_SECRET']

with open('build/manifest.json') as m:
    app.config['manifest'] =json.loads(m.read())

# disabled for now
if False:
    @app.route('/map')
    def map():
        args = request.args
        centre_id = args.get('id')
        centre_type = args.get('type')
        status = 200
        try:
            result = {'results': graph.get_links(graph.get_connected(centre_type, centre_id), {'type': centre_type, 'id': centre_id})}
        except CustomException, e:
            result = {'error': str(e)}
            status = 500
        return jsonify(result), status



def run():
    @app.teardown_appcontext
    def close_db(error):
        if hasattr(g, 'db'):
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
            print 'Request took %.2f seconds' % diff
    app.run(app.config['IP'], debug=app.config['DEBUG'], port=app.config['PORT'])


if __name__ == '__main__':
    run()

