from bs4 import BeautifulSoup
import os
import json 
import re

path = '/Users/josh/legislation_archive/justice_trial'
json_path = '/Users/josh/legislation_archive/justice.json'

with open(json_path) as f:
	json_data = json.loads(f.read())

def next_tag(el, name):
	el = el.next_sibling
	while  el.name != name:
		el = el.next_sibling
	return el

def prev_tag(el, name):
	el = el.previous_sibling
	while  el.name != name:
		el = el.previous_sibling
	return el


def get_info(doc_id, json_data):
	for j in json_data['response']['docs']:
		if j['DocumentName'] == doc_id + '.pdf':
			return j

def get_page_one(soup):
	return soup.select('body > a[name="1"]')[0]


def neutral_cite(soup):
	return neutral_cite_el(soup).contents[0]

def neutral_cite_el(soup):
	reg = re.compile(r'\[(\d){4}\] ([A-Z]+) (\d+)')
	el = next_tag(get_page_one(soup), 'div')
	el = [e for e in el.select('div  span') if reg.match(e.text)][0]
	return el


def court_file(soup):
	cite = neutral_cite_el(soup)
	el = prev_tag(cite.parent.parent, 'div')
	el = el.find('span')
	return el.contents[0]

def full_citation(soup):
	el = next_tag(get_page_one(soup), 'div').select('div')[0].find('span')
	return el.contents[0]

def court(soup):
	el = next_tag(get_page_one(soup), 'div')
	reg = re.compile(r'.*OF NEW ZEALAND$')
	el = [e for e in el.select('div  span') if reg.match(e.text)][0]
	prev_el = prev_tag(el.parent.parent, 'div').find('span')
	return '%s %s' % (prev_el.contents[0], el.contents[0])

def between(soup):
	el = next_tag(get_page_one(soup), 'div')

def process_file(filename):
	print get_info(filename.replace('.html', ''), json_data)
	with open(os.path.join(path, filename)) as f:
		soup = BeautifulSoup(f.read())

		results = {
			'neutral_cite': neutral_cite(soup),
			'court_file': court_file(soup),
			'court': court(soup),
			'full_citation': full_citation(soup),
			'between': between(soup)
		}
		print results

for f in os.listdir(path):
	if f.endswith('.html'):
		process_file(f)
		#break