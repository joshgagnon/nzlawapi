# -*- coding: utf-8 -*-
from views import Base
from validator.validator import Validator
from users.users import Users
from query.query import Query
import graph
import sys
from util import CustomException
from flask import jsonify, g, request, Flask
from flask.json import JSONEncoder
import datetime
import time
import elasticsearch


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


app = Flask(__name__, static_folder='build')
app.config.from_pyfile(sys.argv[1])
app.register_blueprint(Base)
app.register_blueprint(Validator)
app.register_blueprint(Query)
app.register_blueprint(Users)
app.json_encoder = CustomJSONEncoder
app.extensions['elasticsearch'] = elasticsearch.Elasticsearch([app.config['ES_SERVER']])
app.secret_key = app.config['SESSION_SECRET']


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


@app.teardown_appcontext
def close_db(error):
    if hasattr(g, 'db'):
        g.db.close()


@app.before_request
def before_request():
    g.start = time.time()


@app.teardown_request
def teardown_request(exception=None):
    diff = time.time() - g.start
    if diff > 2:
        print 'Request took %.2f seconds' % diff


if __name__ == '__main__':

    app.run(app.config['IP'], debug=app.config['DEBUG'], port=app.config['PORT'])
