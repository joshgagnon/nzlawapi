from lxml import etree
import sys

tree = etree.parse(sys.argv[1])

print tree

title = tree.xpath('/act/cover/title')[0].text

def process_subprovision(subprovision):
	return


def process_provision(provision):
	return {
		'title': provision.xpath('heading')[0].text,
		'subprovision': process_subprovision(provision.xpath('prov.body/subprov')),
		'number':  provision.xpath('label')[0].text or '1'
	}

def process_section(section):
	return {
		'title': section.xpath('heading')[0].text,
		'provisions': map(process_provision, section.xpath('prov'))
	}



parts = map(process_section, tree.xpath('/act/body/part'))
print parts

