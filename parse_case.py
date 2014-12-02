from __future__ import division
from bs4 import BeautifulSoup
import os
import json 
import re
import pprint
from PIL import Image

courtfile_num = re.compile(r'^(SC |CA )?(CA|SC|CIV|CRI):?[-0-9/,(and) ]{2,}$')

path = '/Users/josh/legislation_archive/justice'
json_path = '/Users/josh/legislation_archive/justice.json'

#with open(json_path) as f:
#	json_data = json.loads(f.read())

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


def left_margin(soup):
	return get_left_position(soup.find('div'))

def el_class_style(el):
	class_name = el.find('span').attrs['class'][0]
	sheet = (e for e in el.previous_siblings if e.name == 'style').next().text.split()
	line = (s for s in sheet if s.startswith('.'+class_name)).next().replace('.'+class_name, '')[1:-1]
	return style_to_dict(line)

def style_to_dict(line):
	return dict([x.split(':') for x in line.split(';') if x])

def font_size(el):
	return int(re.match(r'\d+', el_class_style(el).get('font-size', '16px')).group())



def get_info(doc_id, json_data):
	for j in json_data['response']['docs']:
		if j['DocumentName'] == doc_id + '.pdf':
			return j

def neutral_cite(soup):
	try:
		return neutral_cite_el(soup).text
	except StopIteration:
		pass

def neutral_cite_el(soup):
	reg = re.compile(r'\[(\d){4}\] NZ(HC|CA|SC) (\d+)$')
	el = (e for e in soup.find_all('div') if reg.match(e.text) and el_class_style(e).get('font-weight') == 'bold').next()
	return el


def court_file(soup):
	el = (e for e in soup.select('div') if courtfile_num.match(e.text)).next()
	return el.text


def full_citation(soup):
	court_str = court(soup)[0]
	result = []
	el = soup.find('div')
	top = get_top_position(el)
	while top <= get_top_position(el):
		result += [el.text]
		el = next_tag(el, 'div')
	return ' '.join(result)


def court(soup):
	reg = re.compile(r'.*OF NEW ZEALAND$')
	el = (e for e in soup.select('div  span') if reg.match(e.text)).next()
	next_el = next_tag(el.parent.parent, 'div').find('span')
	result = [el.text]
	if not courtfile_num.match(next_el.text):
		result +=  [next_el.text]
	return result

def get_left_position(el):
	return int(re.search(r'.*left:(\d+).*', el.attrs['style']).group(1))

def get_top_position(el):
	return int(re.search(r'.*top:(\d+).*', el.attrs['style']).group(1))

def consecutive_align(el):
	results = []
	position = get_left_position(el)
	while position == get_left_position(el):
		results.append(el.text)
		el = next_tag(el, 'div')
	return (results, el)

def parse_between(soup):
	results = {}
	between = ['AND BETWEEN', 'BETWEEN']
	el = (e for e in soup.find_all('div') if e.text in between).next()
	plantiff_patterns = [
		re.compile('.*Plaintiff[s]?'), 
		re.compile('.*Applicant[s]?'), 
		re.compile('.*Appellant[s]?')]

	# while not at next section
	
	while el.text in between:
		# look back to get court_num
		court_num = (e for e in el.previous_siblings if courtfile_num.match(e.text)).next().text
		el = next_tag(el, 'div')
		plantiff = []
		defendant = []
		while True:
			parties, el = consecutive_align(el)
			if any((p.match(parties[-1]) for p in plantiff_patterns)):
				plantiff += parties
			else:
				defendant += parties
			if el.text != 'AND':
				break
			el = next_tag(el, 'div')

		results[court_num] = {
			'plantiffs': plantiff,
			'defendants': defendant
		}

	return results
			

def parse_versus(soup):
	results = {}
	plantiff = []
	defendant = []
	# must be x v y
	v = (e for e in soup.find_all('div') if e.text.lower() == 'v').next()
	# plantiff is every until neutral citation
	court_num = (e for e in v.previous_siblings if courtfile_num.match(e.text)).next().text
	between_el = prev_tag(v, 'div')
	cite = neutral_cite(soup) or court_num
	while between_el.text != cite:
		plantiff = [between_el.text] + plantiff
		between_el = prev_tag(between_el, 'div')
	# defendant is everything until no more capitals
	between_el = next_tag(v, 'div')
	while between_el.text and ':' not in between_el.text:
		defendant += [between_el.text]
		between_el = next_tag(between_el, 'div')
	results[court_num] = {
		'plantiff': plantiff,
		'defendant': defendant
	}
	return results


def parties(soup):
	between = ['AND BETWEEN', 'BETWEEN']
	if any([e for e in soup.find_all('div') if e.text in between]):
		return parse_between(soup)
	elif any([e for e in soup.find_all('div') if e.text.lower() == 'v']):
		return parse_versus(soup)
	else:
		result = {}
		result[court_file(soup)] = {}
		return result

def element_after_column(soup, strings):
	el = (e for e in soup.find_all('div') if e.text in strings).next()
	while get_left_position(el) == get_left_position(next_tag(el, 'div')):
		el = next_tag(el, 'div')
	return next_tag(el, 'div')

def text_after_column(soup, strings):
	try:
		return element_after_column(soup, strings).text
	except StopIteration:
		pass

def texts_after_column(soup, strings):
	try:
		els = consecutive_align(element_after_column(soup, strings))
		return ' '.join(els[0])
	except StopIteration:
		pass		

def judgment(soup):
	return text_after_column(soup, ['Judgment:', 'Sentence:', 'Sentenced:'])


def hearing(soup):
	return text_after_column(soup, ['Hearing:','Hearings:', 'received:'])


def charge(soup):
	return text_after_column(soup, ['Charge:'])


def plea(soup):
	return text_after_column(soup, ['Plea:'])


def received(soup):
	return text_after_column(soup, ['received:'])


def bench(soup):
	return text_after_column(soup, ['Court:'])


def find_bars(soup):

	def is_black(pixel):
		return sum(pixel) < 150

	images = soup.find_all('img')
	results = []

	for image_el in images:
		page_number = int(image_el.attrs['name'])
		image_path = os.path.join(path, image_el.attrs['src'])
		im = Image.open(image_path)
		pixels = im.load()
		x = im.size[0]//2
		previous = 0
		for y in xrange(im.size[1]):
			if is_black(pixels[x, y]) and y > previous + 5:
				results.append((page_number, y))
				previous = y
				if len(results) == 2:
					return results

def get_page(el):
	return int(el.find_previous_sibling('img').attrs['name'])


def first_el_after_bar(soup, bars):
	el = soup.select('img[name=%d]'%bars[0][0])[0]
	line_gap = 50
	top = bars[0][1]
	return (div for div in el.find_next_siblings('div') 
		if top < get_top_position(div) < top + line_gap
		).next()


def waistband_el(soup):
	results = []
	bars = find_bars(soup)
	# next, skip to court num, as title is at bottom
	line_height = 10
	el = first_el_after_bar(soup, bars)

	while get_top_position(el) + line_height < bars[1][1] and get_page(el) <= bars[1][0]:
		results.append(el.text)
		el = next_tag(el, 'div')
	return [' '.join(results), el]


def waistband(soup):
	return waistband_el(soup)[0]


def counsel(soup):
	counsel_strings = ['Counsel:', 'Appearances:']
	try:
		def inclusion(el):
			return el.text in counsel_strings and font_size(el) > 14

		counsel = next_tag((e for e in soup.find_all('div') if inclusion(e)).next(), 'div')
		return consecutive_align(counsel)[0]
	except: pass
	try:
		counsel_tag = (e for e in soup.find_all('div') if any(e.text.startswith(x) for x in counsel_strings)).next()
		counsel = counsel_tag.text
		for c in counsel_strings:
			counsel = counsel.replace(c, '')
		counsel = [counsel.strip()]
		# keep consuming until a ':' appears, dumb and will have to do for now
		while True:
			counsel_tag = next_tag(counsel_tag, 'div')
			if ':' in counsel_tag.text:
				break
			else:
				counsel.append(counsel_tag.text)
		return counsel
	except: pass

def matter(soup):
	result = {}
	result['UNDER'] = texts_after_column(soup, ['UNDER'])
	result['IN THE MATTER OF'] = texts_after_column(soup, ['IN THE MATTER OF'])
	result['IN THE ESTATE OF'] = texts_after_column(soup, ['IN THE ESTATE OF'])	
	for k, i in result.items():
		if not i:
			del result[k]
	return result

def is_appeal(info):
	if info['neutral_cite']:
		return re.compile('.*NZ(CA|SC).*').match(info['neutral_cite'])


def appeal_result(soup):
	el = waistband_el(soup)[1]
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
	# first give all bg images page numbers
	for div in soup.select('body > div'):
		div.find('img').attrs['name'] = div.find_previous_sibling('a').attrs['name']
	[flat_soup.append(x) for x in soup.select('body > div > *')]
	return flat_soup


def process_file(filename):
	#print get_info(filename.replace('.html', ''), json_data)
	with open(os.path.join(path, filename)) as f:
		soup = BeautifulSoup(f.read())
		flat_soup = mangle_format(soup)
		print filename
		results = {
			'neutral_cite': neutral_cite(flat_soup),
			'court': court(flat_soup),
			'full_citation': full_citation(flat_soup),
			'parties': parties(flat_soup),
			'counsel': counsel(flat_soup),
			'judgment': judgment(flat_soup),
			'waistband': waistband(flat_soup),
			'hearing': hearing(flat_soup),
			'received': received(flat_soup),
			'matter': matter(flat_soup),
			'charge': charge(flat_soup),
			'plea': plea(flat_soup),
			'bench': bench(flat_soup)
		}
		if not results['waistband']:
			raise 'dics'
		if is_appeal(results):
			results['appeal_result'] = appeal_result(flat_soup)
		return results


success = 0
fails = 0
#files = [path+'/007da75b-44b1-45f4-aa6c-c43adb69c415.html']
#files = [path+'/01e4a31c-2afd-41dd-86ef-0573179e6a9e.html']
#files = [path+'/ffecdbdb-e5d9-4d24-9430-32fcf630c4b4.html']
files = [path+'/01e4a31c-2afd-41dd-86ef-0573179e6a9e.html',
'fff55fd5-24b4-48df-b47f-9eab2e475d7e.html',
'ffe96266-d738-4ac1-8f2f-2153ea36a1c6.html',
'fff55fd5-24b4-48df-b47f-9eab2e475d7e.html',
'fffc7d1c-bbd5-44ec-8439-8036f7952f97.html'
]
#files = os.listdir(path)
with open('failed_files.txt', 'w') as failed_output:
	for f in files:
		if f.endswith('.html'):
			try:
				pprint.pprint(process_file(f))
				success += 1
			except ValueError, e:
			#except Exception, e:
				print e
				failed_output.write(f)
				failed_output.write('\n')
				fails += 1

print 'success: %d  fails: %d' % (success, fails)
		#break