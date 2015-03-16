import json
import urllib2
import time
import sys

# query to get most crap
"""https://forms.justice.govt.nz/solr/jdo/select?q=*&facet=true&facet.field=Location&facet.field=Jurisdiction&facet.limit=-1&facet.mincount=1&rows=50&json.nl=map&fq=text%3A(*)&fq=JudgmentDate%3A*&sort=JudgmentDate%20desc&fl=FileNumber%2C%20Jurisdiction%2C%20MNC%2C%20Appearances%2C%20JudicialOfficer%2C%20CaseName%2C%20JudgmentDate%2C%20Location%2C%20DocumentName%2C%20id%2C%20score&wt=json&json.wrf=json"""

base = 'https://forms.justice.govt.nz/search/Documents/pdf/'
out = '/Users/josh/legislation_archive/justice/'
with open(sys.argv[1]) as f:
    data = json.loads(f.read())

for i in data['response']['docs'][count:]:

    while True:
        #time.sleep(1)
        try:
            response = urllib2.urlopen(base + i['id'])
            with open(out+i['id'].split('/')[-1], 'w') as f:
                f.write(response.read())

            count += 1
        except:
            pass
        else:
            break