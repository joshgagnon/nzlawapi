from bs4 import BeautifulSoup
import os
import json 
import re
import pprint

courtfile_num = re.compile(r'^(CA|SC|CIV|CRI)[-0-9/ ]{5,}$')

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

def el_class_style(el):
	class_name = el.find('span').attrs['class'][0]
	sheet = (e for e in el.previous_siblings if e.name == 'style').next().text.split()
	line = (s for s in sheet if s.startswith('.'+class_name)).next().replace('.'+class_name, '')[1:-1]
	return style_to_dict(line)

def style_to_dict(line):
	return dict([x.split(':') for x in line.split(';') if x])


def get_info(doc_id, json_data):
	for j in json_data['response']['docs']:
		if j['DocumentName'] == doc_id + '.pdf':
			return j


def neutral_cite(soup):
	return neutral_cite_el(soup).text


def neutral_cite_el(soup):
	reg = re.compile(r'\[(\d){4}\] ([A-Z]+) (\d+)')
	el = (e for e in soup.select('div  span') if reg.match(e.text)).next()
	return el


def court_file(soup):
	cite = neutral_cite_el(soup)
	el = prev_tag(cite.parent.parent, 'div')
	return el.text


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

def get_left_position(el):
	return int(re.search(r'.*left:(\d+).*', el.attrs['style']).group(1))

def consecutive_align(el):
	results = []
	position = get_left_position(el)
	while position == get_left_position(el):
		results.append(el.text)
		el = next_tag(el, 'div')
	return (results, el)

def parse_between(soup):
	results = {}

	el = (e for e in soup.find_all('div') if e.text == 'BETWEEN').next()

	# while not at next section
	while el.text == 'BETWEEN': 
		# look back to get court_num
		court_num = (e for e in el.previous_siblings if courtfile_num.match(e.text)).next().text

		el = next_tag(el, 'div')
		plantiff, el = consecutive_align(el)
		el = next_tag(el, 'div') #skip and
		defendant, el = consecutive_align(el)
		el = next_tag(el, 'div') #skip and
		results[court_num] = {
			'plantiffs': plantiff,
			'defendants': defendant
		}

	return results
			

def parse_versus(soup):
	# must be x v y
	plantiff = []
	defendant = []	
	v = (e for e in soup.find_all('span') if e.text == 'v').next().parent.parent
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
	if any([e for e in soup.find_all('span') if e.text == 'BETWEEN']):
		return parse_between(soup)
	else:
		return parse_versus(soup)

def judgment_el(soup):
	judgement_strings = ['Judgment:', 'Sentence:']
	return next_tag((e for e in soup.find_all('span') if e.text in judgement_strings).next().parent.parent, 'div')

def judgment(soup):
	return judgment_el(soup).text

def waistband(soup):
	results = []
	# two identified cases so far:  bold, or capitals
	el = next_tag(judgment_el(soup), 'div')
	if el.get('font-style') == 'bold':
		while el_class_style(el).get('font-style') == 'bold':
			results.append(el.text)
			el = next_tag(el, 'div')
	elif el.text.upper() == el.text:
		while el.text.upper() == el.text:
			results.append(el.text)
			el = next_tag(el, 'div')
	return ' '.join(results)

def counsel(soup):
	counsel_strings = ['Counsel:', 'Appearances:', 'Solicitors/Counsel:']
	counsel = next_tag((e for e in soup.find_all('span') if e.text in counsel_strings).next().parent.parent, 'div')
	return consecutive_align(counsel)[0]

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
		if text_re.match(el.text):
			results[key], el = consecutive_align(el)
			results[key] = ' '.join(results[key])
		else:
			results = [key]
			break

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
		results = {
			'neutral_cite': neutral_cite(flat_soup),
			'court': court(flat_soup),
			'full_citation': full_citation(flat_soup),
			'parties': parties(flat_soup),
			'counsel': counsel(flat_soup),
			'judgment': judgment(flat_soup),
			'waistband': waistband(flat_soup)
		}
		if is_appeal(results):
			results['appeal_result'] = appeal_result(flat_soup)
		pprint.pprint(results)
		print

for f in os.listdir(path):
	if f.endswith('.html'):
		process_file(f)
		#break