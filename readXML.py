from lxml import etree
import pprint
import sys

tree = etree.parse(sys.argv[1])

print tree

title = tree.xpath('/act/cover/title')[0].text

def process_paragraph(paragraph):
	results = {'text': paragraph.xpath('para/text')[0].text}
	if len(paragraph.xpath('label')):
		results['number'] = paragraph.xpath('label')[0].text
	results['subparagraphs'] =  map(process_paragraph, paragraph.xpath('para/label-para | para/def-para'))
	return results


def process_subprovision(subprovision):
	results = {
		'number': subprovision.xpath('label')[0].text,
		'paragraphs': map(process_paragraph, subprovision.xpath('para/label-para | para/def-para'))
	}
	if len(subprovision.xpath('para/text')):
		results['text'] = subprovision.xpath('para/text')[0].text
	return results


def process_provision(provision):
	return {
		'title': provision.xpath('heading')[0].text,
		'subprovision': map(process_subprovision, provision.xpath('prov.body/subprov')),
		'number':  provision.xpath('label')[0].text
	}

def process_section(section):
	return {
		'title': section.xpath('heading')[0].text,
		'provisions': map(process_provision, section.xpath('prov'))
	}



parts = map(process_section, tree.xpath('/act/body/part'))

pp = pprint.PrettyPrinter()
pp.pprint(parts)