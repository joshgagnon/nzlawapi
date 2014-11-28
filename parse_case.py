from bs4 import BeautifulSoup
import os
import json 
import re
import pprint

courtfile_num = r'/^(CA|SC|CIV|CRI)/'

path = '/Users/josh/legislation_archive'
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


def neutral_cite(soup):
	return neutral_cite_el(soup).contents[0]


def neutral_cite_el(soup):
	reg = re.compile(r'\[(\d){4}\] ([A-Z]+) (\d+)')
	el = (e for e in soup.select('div  span') if reg.match(e.text)).next()
	return el


def court_file(soup):
	cite = neutral_cite_el(soup)
	el = prev_tag(cite.parent.parent, 'div')
	el = el.find('span')
	return el.contents[0]


def full_citation(soup):
	court_str = court(soup)[0]
	result = []
	el = soup.select('div')[0].find('span')
	for s in soup.select('div'):
		if s.text != court_str:
			result += [s.text]
		else:
			break
	return ' '.join(result)


def court(soup):
	reg = re.compile(r'.*OF NEW ZEALAND$')
	el = (e for e in soup.select('div  span') if reg.match(e.text)).next()
	next_el = next_tag(el.parent.parent, 'div').find('span')
	result = [el.text]
	if next_el.text != court_file(soup):
		result +=  [next_el.text]
	return result

def consecutive_align(el):
	results = []
	position = re.search(r'.*(left:\d+).*', el.attrs['style']).group(1)
	while position in el.attrs['style']:
		results.append(el.text)
		el = next_tag(el, 'div')
	return results

def parse_between(soup, el):
	between_el = (e for e in el.find_all('span') if e.text == 'BETWEEN').next().parent.parent
	plantiff = []
	defendant = []
	between_el = next_tag(between_el, 'div')
	while between_el.text != 'AND':
		plantiff.append(between_el.text)
		between_el = next_tag(between_el, 'div')
		

	between_el = next_tag(between_el, 'div')
	defendant = consecutive_align(between_el)

	return {
		'plantiff': plantiff,
		'defendant': defendant
	}
			

def parse_versus(soup, el):
	# must be x v y
	plantiff = []
	defendant = []	
	v = [e for e in el.find_all('span') if e.text == 'v'][0].parent.parent
	# plantiff is every until neutral citation
	between_el = prev_tag(v, 'div')
	cite = neutral_cite(soup)
	while between_el.text != cite:
		plantiff = [between_el.text] + plantiff
		between_el = prev_tag(between_el, 'div')
	# defendant is everything until no more capitals
	between_el = next_tag(v, 'div')
	while between_el.text and between_el.text.upper() == between_el.text:
		defendant += [between_el.text]
		between_el = next_tag(between_el, 'div')

	return {
		'plantiff': plantiff,
		'defendant': defendant
	}


def parties(soup):
	el = soup
	if any([e for e in el.find_all('span') if e.text == 'BETWEEN']):
		return parse_between(soup, el)
	else:
		return parse_versus(soup, el)

def judgment_el(soup):
	judgement_strings = ['Judgment:', 'Sentence:']
	return next_tag((e for e in soup.find_all('span') if e.text in judgement_strings).next().parent.parent, 'div')

def judgment(soup):
	return judgment_el(soup).text

def waistband(soup):
	return next_tag(judgment_el(soup), 'div').text

def counsel(soup):
	counsel_strings = ['Counsel:', 'Appearances:']
	counsel = next_tag((e for e in soup.find_all('span') if e.text in counsel_strings).next().parent.parent, 'div')
	return consecutive_align(counsel)

def is_appeal(info):
	return re.compile('.*NZ(CA|SC)*').match(info['neutral_cite'])

def appeal_result(soup):
	el = next_tag(next_tag(judgment_el(soup), 'div'), 'div')
	results = {}
	position = re.search(r'.*(left:\d+).*', el.attrs['style']).group(1)
	text_re = re.compile('.*[a-zA-Z]+.*')
	while position in el.attrs['style']:
		key = el.text
		if not text_re.match(key):
			break
		el = next_tag(el, 'div')
		results[key] = el.text
		el = next_tag(el, 'div')
	return results	

def mangle_format(soup):
	flat_soup = BeautifulSoup('<div/>').select('div')[0]
	[flat_soup.append(x) for x in soup.select('body > div > *')]
	return flat_soup


def process_file(filename):
	#print get_info(filename.replace('.html', ''), json_data)
	with open(os.path.join(path, filename)) as f:
		soup = BeautifulSoup(f.read())
		flat_soup = mangle_format(soup)
		#print flat_soup
		results = {
			'neutral_cite': neutral_cite(flat_soup),
			'court_file': court_file(flat_soup),
			'court': court(flat_soup),
			'full_citation': full_citation(flat_soup),
			'parties': parties(flat_soup),
			'counsel': counsel(flat_soup),
			'judgment': judgment(flat_soup),
			'waistband': waistband(flat_soup)
		}
		if is_appeal(results):
			results['appeal_result'] = appeal_result(soup)
		pprint.pprint(results)
		print

for f in os.listdir(path):
	if f.endswith('.html'):
		process_file(f)
		#break