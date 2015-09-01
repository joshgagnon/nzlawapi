import psycopg2
import sys
from psycopg2 import extras
from os import path
import importlib
import os
from multiprocessing import Pool
from lxml import etree
import logging
from time import sleep

def chunks(l, n):
    for i in xrange(0, len(l), n):
        yield l[i:i+n]


if __name__ == "__main__":
    if not len(sys.argv) > 1:
        raise Exception('Missing configuration file')
    sys.path.append(os.getcwd())
    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
    sys.path.append( path.dirname( path.dirname( path.abspath(__file__) ) ) )

    from celeries.tasks import process_instrument

    logging.basicConfig(level=logging.INFO)
    db = psycopg2.connect(
            database=config.DB,
            user=config.DB_USER,
            host=config.DB_HOST,
            password=config.DB_PW)
    tasks = []
    try:
        with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
            query = """SELECT i.id as id FROM instruments i
                    JOIN documents d on d.id = i.id
                    where processed_document is null"""
            cur.execute(query)
            results = cur.fetchall()
        if len(results):
            print '%s documents to process' % len(results)
            jobs = list(chunks([r['id'] for r in results], 1))
            tasks = [process_instrument.delay(j) for j in jobs]
            while True:
                tasks_finished = len(filter(lambda x: x.ready(), tasks))
                sys.stdout.write('%d%%\r' % (tasks_finished/float(len(jobs))*100))
                sys.stdout.flush()
                if tasks_finished == len(jobs):
                    break
                sleep(2)
        else:
            print 'Nothing to do'

    except KeyboardInterrupt:
        print "Keyboard interrupt in main"
        for task in tasks:
            task.revoke()
    finally:
        print "Cleaning up Main"
        with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute("select update_views()")

        db.commit()
        db.close()

