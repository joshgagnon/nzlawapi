from __future__ import absolute_import
from psycopg2 import extras
from celeries.celery import app
from db import get_db
import server
from acts import links
from acts import queries
from util import large_parser
from lxml import etree


@app.task
def process_instrument(document_ids):
    with server.app.test_request_context():
        db = get_db()
        title_store = links.get_links(db)

        def get_links(tree, db):
            return links.process_instrument_links(tree, db, links=title_store)

        with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
            for document_id in document_ids:
                query = """SELECT *, exists(select 1 from latest_instruments where id=i.id) as latest FROM instruments i
                            JOIN documents d on d.id = i.id
                            where processed_document is null
                            and i.id = %(id)s """

                cur.execute(query, {'id': document_id})
                result = cur.fetchall()
                if len(result):
                    queries.process_instrument(
                        row=result[0], db=db,
                        refresh=False,
                        latest=result[0].get('latest'),
                        strategy={'links': get_links})
        db.commit()
        db.close()
    return 'done'


@app.task
def process_skeleton(document_ids):
    with server.app.test_request_context():
        for document_id in document_ids:
            db = get_db()
            print 'fetching %d for skeletizing' % document_id
            query = """SELECT *, exists(select 1 from latest_instruments where id=i.id) as latest FROM instruments i
                    JOIN documents d on d.id = i.id
                    where skeleton is null
                    and i.id = %(id)s """
            with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
                cur.execute(query, {'id': document_id})
                result = cur.fetchall()
            db.commit()
            if result:
                tree = etree.fromstring(result[0]['processed_document'], parser=large_parser)
                doc_id = result[0].get('id')
                version = result[0].get('version')
                db.commit()
                queries.process_skeleton(doc_id, tree, version=version, db=db)
            else:
                db.commit()
            db.close()
