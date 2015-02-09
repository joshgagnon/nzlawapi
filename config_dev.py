import os
home = os.path.expanduser("~")

IP = '0.0.0.0'
PORT = 5001
DEBUG = True
CASE_DIR = os.path.join(home, 'legislation_archive/justice')
ACT_DIR = os.path.join(home, 'legislation_archive/legislation.govt.nz/subscribe')
BUILD_DIR = './build'

DB_USER = 'josh'
DB_PW = ''
HOST = 'localhost'
DB = 'legislation'

ES_SERVER = {"host": "localhost", "port": 9200}