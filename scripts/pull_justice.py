import json
import urllib2
import time
import sys

base = 'https://forms.justice.govt.nz/search/Documents/pdf/'
out = '/Users/josh/legislation_archive/justice/'
with open(sys.argv[1]) as f:
	data = json.loads(f.read())

count = 3777;
for i in data['response']['docs'][count:]:
	print count
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