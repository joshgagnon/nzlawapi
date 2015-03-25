import datetime
import json
from psycopg2 import extras
import psycopg2

date_format = '%Y-%m-%d'


def safe_date(string):
    try:
        return datetime.datetime.strptime(string, date_format).date()
    except:
        return None


def run(db, config):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute('SELECT id, attributes from instruments')
        results = cur.fetchall()
        for result in results:
            date = safe_date(result.get('attributes').get('date.assent'))
            if date:
                cur.execute('UPDATE instruments SET date_assent = %(date)s where id = %(id)s', {'date': date, 'id': result['id']})


