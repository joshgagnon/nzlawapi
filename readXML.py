from lxml import etree
import pprint
import sys
from lxml.etree import tostring
from itertools import chain

tree = etree.parse(sys.argv[1])

title = tree.xpath('/act/cover/title')[0].text



def process_paragraph(paragraph):
	results = {'text': tostring(paragraph.xpath('para/text')[0] , method="text" , encoding='utf8'),
			'id': paragraph.attrib.get('id')
			}
	if len(paragraph.xpath('label')):
		results['number'] = paragraph.xpath('label')[0].text
	results['children'] =  map(process_paragraph, paragraph.xpath('para/label-para | para/def-para' ))
	return results


def process_subprovision(subprovision):
	results = {
		'number': subprovision.xpath('label')[0].text,
		'children': map(process_paragraph, subprovision.xpath('para/label-para | para/def-para')),
		'id': subprovision.attrib.get('id')
	}
	if len(subprovision.xpath('para/text')):
		results['text'] = subprovision.xpath('para/text')[0].text
	return results


def process_provision(provision):
	return {
		'title': provision.xpath('heading')[0].text,
		'children': map(process_subprovision, provision.xpath('prov.body/subprov')),
		'number':  provision.xpath('label')[0].text,
		'id': provision.attrib.get('id')
	}

def process_section(section):
	return {
		'title': section.xpath('heading')[0].text,
		'children': map(process_provision, section.xpath('prov')),
		'number': section.xpath('label')[0].text,
		'id': section.attrib.get('id')
	}



doc = map(process_section, tree.xpath('/act/body/prov | /act/body/part'))
sections = list(chain.from_iterable(filter(lambda x: x, map(lambda x: x.get('children', []), doc))))
pp = pprint.PrettyPrinter()





def find(sections, *args):
	args = list(args)
	arg = args[0]
	if len(sections) == 1:
		sec = sections[0]
	else:
		sec = filter(lambda s: s.get('number') == str(arg), sections)[0]
		args.pop(0)
	if len(args):
		sec = find(sec.get('children'), *args)
	return sec

pp.pprint(find(sections, 41, 'b'))
pp.pprint(find(sections, 107, 1, 'c'))
pp.pprint(find(sections, 222))