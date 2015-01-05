from db import get_db, get_act_exact
from util import tohtml
from nltk.stem import *
from lxml import etree

from nltk.stem.snowball import SnowballStemmer
from nltk.stem.wordnet import WordNetLemmatizer
from nltk.corpus import wordnet as wn
from xml.dom import minidom
import re


def is_noun(tag):
    return tag in ['NN', 'NNS', 'NNP', 'NNPS']


def is_verb(tag):
    return tag in ['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ']


def is_adverb(tag):
    return tag in ['RB', 'RBR', 'RBS']


def is_adjective(tag):
    return tag in ['JJ', 'JJR', 'JJS']

def penn_to_wn(tag):
    if is_adjective(tag):
        return wn.ADJ
    elif is_noun(tag):
        return wn.NOUN
    elif is_adverb(tag):
        return wn.ADV
    elif is_verb(tag):
        return wn.VERB
    return None


ws_split = re.compile(r'\s+', re.U).split

def processNode(parent, defs):
    doc = parent.ownerDocument
    for node in parent.childNodes[:]:
        if node.nodeType==node.TEXT_NODE:
            words = ws_split(node.nodeValue)
            new_words = []
            changed = False
            for word in words:
                if word in defs:
                    text = ' '.join(new_words+[''])
                    print word
                    parent.insertBefore(doc.createTextNode(text), node)
                    b = doc.createElement('b')
                    b.appendChild(doc.createTextNode(word))
                    parent.insertBefore(b, node)
                    new_words = ['']
                    changed = True
                else:
                    new_words.append(word)
            if changed:
                text = ' '.join(new_words)
                parent.replaceChild(doc.createTextNode(text), node)
        else:
            processNode(node, defs)
            

lmtzr = WordNetLemmatizer()

def find_all_definitions(tree):
    nodes = tree.xpath(".//def-para[descendant::def-term]")
    results = {}
    for node in nodes:
        html = etree.tostring(node, encoding='UTF-8')
        keys = node.xpath('.//def-term')
        for key in keys:
            # super ugly hack to prevent placeholders like 'A'
            if len(key.text) > 1:
            	base = lmtzr.lemmatize(key.text)
            	if base not in results:
                	results[base] = {'key': key.text, 'html_content': html}
                if key.text.lower() not in results:
                	results[key.text.lower()] = {'key': key.text, 'html_content': html}
                print base, key.text
    return results

def insert_definitions(tree):
	interpretation = get_act_exact('Interpretation Act 1999')
	definitions = find_all_definitions(interpretation)
	keys = definitions.keys()
	domxml = minidom.parseString(etree.tostring(tree, encoding='UTF-8', method="html"))
	processNode(domxml, keys)
	"""for el in list(tree.iter(tag=etree.Element)):
		#todo update defintions as they are traversed
		if el.text: # and tail
		 	intersects = [key for key in keys if key in el.text]
		 	print intersects
			for intersect in intersects:
				sub = etree.SubElement(el, "catalex-def")
	"""
	return tree

