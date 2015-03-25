import os
import json
import psycopg2
import re
import sys
import importlib

"""https://forms.justice.govt.nz/solr/jdo/select?q=*:*&rows=500000&fl=FileNumber%2C%20Jurisdiction%2C%20MNC%2C%20Appearances%2C%20JudicialOfficer%2C%20CaseName%2C%20JudgmentDate%2C%20Location%2C%20DocumentName%2C%20id&wt=json&json.wrf=json%22%22%22"""

def run(db, config, json_file):
    data = json.loads(re.match( '^[^(]+\((.*)\)$', json_file.read(), re.MULTILINE).groups(1)[0])
    records = data['response']['docs']

    with db.cursor() as cur:
        for record in records:
            print record
            with open(os.path.join(config.CASE_DIR, record['DocumentName'][:-4] + '.html')) as r:
                cur.execute(""" INSERT INTO documents (document, type) VALUES (%(document)s, 'html') returning id""",
                    {'document': r.read()})
            return


if __name__ == "__main__":
    if not len(sys.argv) > 1:
        raise Exception('Missing configuration file')
    sys.path.append(os.getcwd())

    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
    db = psycopg2.connect(
            database=config.DB,
            user=config.DB_USER,
            host=config.DB_HOST,
            password=config.DB_PW)
    db.set_client_encoding('utf8')
    with open(sys.argv[2]) as f:
        run(db, config, f)
