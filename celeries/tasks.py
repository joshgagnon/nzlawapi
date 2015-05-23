from __future__ import absolute_import
from psycopg2 import extras
from celeries.celery import app
from db import get_db
import server


@app.task
def process_instrument(document_id):
    with server.app.test_request_context():
        db = get_db()
        with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
            query = """SELECT *, exists(select 1 from latest_instruments where id=i.id) as latest FROM instruments i
                        JOIN documents d on d.id = i.id
                        where processed_document is null
                        and i.id = %(id)s """

            cur.execute(query, {'id': document_id})
            result = cur.fetchall()
            return dict(result)