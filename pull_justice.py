import json
import urllib2
import time
import sys

base = 'https://forms.justice.govt.nz/search/Documents/pdf/'
out = '/Users/josh/legislation_archive/justice/'
with open(sys.argv[1]) as f:
	data = json.loads(f.read())

count = 2230;
for i in data['response']['docs'][count:]:
	print i['id']
	response = urllib2.urlopen(base + i['id'])
	print count, i['id'].split('/')[-1]
	with open(out+i['id'].split('/')[-1], 'w') as f:
		f.write(response.read())
	
	count += 1
	time.sleep(1)