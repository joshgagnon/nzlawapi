import json
import urllib2
import time
import sys
import re

# query to get most crap
"""https://forms.justice.govt.nz/solr/jdo/select?q=*&facet=true&facet.field=Location&facet.field=Jurisdiction&facet.limit=-1&facet.mincount=1&rows=500000&json.nl=map&fq=text%3A(*)&fq=JudgmentDate%3A*&sort=JudgmentDate%20desc&fl=FileNumber%2C%20Jurisdiction%2C%20MNC%2C%20Appearances%2C%20JudicialOfficer%2C%20CaseName%2C%20JudgmentDate%2C%20Location%2C%20DocumentName%2C%20id%2C%20score&wt=json&json.wrf=json"""


def process(db, config):
    base = 'https://forms.justice.govt.nz/search/Documents/pdf/'

    with open(sys.argv[1]) as f:
        data = json.loads(re.match( '^[^(]+\((.*)\)$', f.read(), re.MULTILINE).groups(1)[0])
    count = 0
    out = config.CASE_DIR
    for i in data['response']['docs'][count:]:
        while True:
            #time.sleep(1)
            try:
                response = urllib2.urlopen(base + i['id'])
                with open(os.path.join(out,i['id'].split('/')[-1], 'w')) as f:
                    f.write(response.read())
                count += 1
            except:
                pass
            else:
                break


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
    process(db, config)
    db.commit()
