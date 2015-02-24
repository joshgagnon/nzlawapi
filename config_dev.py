import os
home = os.path.expanduser("~")

IP = '0.0.0.0'
PORT = 5001
DEBUG = True
CASE_DIR = os.path.join(home, 'legislation_archive/justice')
ACT_DIR = os.path.join(home, 'legislation_archive/legislation.govt.nz/subscribe')
BUILD_DIR = './build'
REPROCESS_DOCS = False
# REPROCESS_DOCS = True

DB_USER = 'josh'
DB_PW = ''
HOST = 'localhost'
DB = 'legislation'

ES_SERVER = {"host": "localhost", "port": 9200}

USERS_LOGIN_URL = 'https://users.catalex.nz/browser-login'

SESSION_SECRET = 'secret_here'
SSO_SHARED_SECRET = 'put_secret_here'


NO_AUTH = True