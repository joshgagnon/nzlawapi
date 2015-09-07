import os
from distutils import spawn

IP = '0.0.0.0'
PORT = 5001
DEBUG = True
CASE_DIR = os.path.join('/Users/josh', 'legislation_archive/justice')
ACT_DIR = os.path.join(os.getcwd(), 'tests/legislation_archive/subscribe')
PDFTOHTML = '/usr/local/Cellar/pdftohtml/0.40a/bin/pdftohtml'  # 0.40
PDFTOHTMLEX = spawn.find_executable('pdf2htmlEX')
BUILD_DIR = './build'
SCRIPT_DIR = './scripts'
REPROCESS_DOCS = False

DB_USER = 'josh'
DB_PW = ''
DB_HOST = '127.0.0.1'
DB = 'browser_test'

ES_SERVER = {"host": "localhost", "port": 9200}

USERS_LOGIN_URL = 'https://users.catalex.nz/browser-login'
MAX_SESSIONS_PER_USER = 2

SESSION_SECRET = 'test_session_secret'
SSO_SHARED_SECRET = 'test_shared_secret'

USE_SKELETON = True
NO_AUTH = True
