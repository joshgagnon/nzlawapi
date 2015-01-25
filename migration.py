from __future__ import print_function
import importlib
import sys
import psycopg2
import os


def prep_table(db):
    with db.cursor() as cur:
        cur.execute("""
            CREATE TABLE  IF NOT EXISTS migrations (name text);
            """)
    db.commit()


def connect_db(config):
    return psycopg2.connect(
        database=config.DB,
        user=config.DB_USER,
        password=config.DB_PW)


def get_migrations(db):
    files = set([f for f in os.listdir('migrations') if not f.startswith('_') and not f.endswith('.pyc')])
    with db.cursor() as cur:
        cur.execute(""" SELECT name FROM migrations """)
        return sorted(list(files.difference(map(lambda x: x[0], cur.fetchall()))))


def run_py_migration(db, filename, config):
    mod = importlib.import_module('migrations.%s' % filename.replace('.py', ''))
    mod.run(db, config)


def run_sql_migration(db, filename):
    with open(os.path.join('migrations', filename)) as f, db.cursor() as cur:
        cur.execute(f.read())


def run_migration(db, filename, config):
    print('Executing %s' % filename)
    if filename.endswith('.py'):
        run_py_migration(db, filename, config)
    elif filename.endswith('.sql'):
        run_sql_migration(db, filename)
    else:
        raise Exception('Unknown migration file extension')
    with db.cursor() as cur:
        cur.execute("INSERT INTO migrations (name) VALUES (%(filename)s) ", {
            'filename': filename
        })


def run():
    if not len(sys.argv) > 1:
        raise Exception('Missing configuration file')
    config = importlib.import_module(sys.argv[1].replace('.py', ''))
    db = connect_db(config)
    prep_table(db)
    migrations = get_migrations(db)
    map(lambda m: run_migration(db, m, config), migrations)
    db.commit()
    print('Migrations Complete')


if __name__ == '__main__':
    run()
