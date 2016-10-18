import os
home = os.path.expanduser("~")

IP = '0.0.0.0'
PORT = 3001
DEBUG = True
CASE_DIR = os.path.join(home, 'legislation_archive/justice')
ACT_DIR = os.path.join(home, 'legislation_archive/legislation.govt.nz/subscribe')
PDFTOHTML = '/usr/local/Cellar/pdftohtml/0.40a/bin/pdftohtml' #0.40
PDFTOHTMLEX = ' /usr/local/bin/pdf2htmlEX'
BUILD_DIR = './build'
SCRIPT_DIR = './scripts'
REPROCESS_DOCS = False
#REPROCESS_DOCS = True

DB_USER = 'josh'
DB_PW = ''
DB_HOST = '127.0.0.1'
DB = 'catalex_browser'

ES_SERVER = {"host": "localhost", "port": 9200}
LAW_BROWSER_LOGIN_URL = 'http://localhost:3000/login'
USERS_LOGIN_URL = 'http://localhost:8000/browser-login'
ACCOUNT_URL = 'http://localhost:8000'
OAUTH_ACCESS_TOKEN_URL = 'http://localhost:8000/oauth/access_token'
USER_RESOURCE_URL = 'http://localhost:8000/api/user'
USER_LOGOUT_URL = 'http://localhost:8000/auth/logout'

OAUTH_CLIENT_ID = 'Ci2p9dIgic61zkEwzC6q'
OAUTH_CLIENT_SECRET = 'JOIQnhYD8DvzBswPm27z'


MAX_SESSIONS_PER_USER = 2

SESSION_SECRET = 'secret_here'
SSO_SHARED_SECRET = 'put_secret_here'


USE_SKELETON = True
#NO_AUTH = True
