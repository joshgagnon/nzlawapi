# -*- coding: utf-8 -*-
import unittest
import importlib
import sys
import os
import re
from util import xml_compare, tohtml
from lxml import etree, html
from lxml.html.diff import htmldiff, html_annotate
import codecs

def ugly_replace(string):
    # this has a very very bad smell
    return string.replace(u"\u00A0", u' ').replace(u'\xe2\x80\x99', "'").replace('&#8217;', "'").replace(u'\xa0', ' ') #.replace(u'\u2019', "'");


class TestLinkParsing(unittest.TestCase):

    def test_transform(self):
        with open('tests/link_examples.txt') as links, open('tests/links_manually_fixed.txt') as expected:
            expected_lines = expected.readlines()
            for i, line in enumerate(links.readlines()):
                # TODO, use utils remove_nbsp
                self.assertEqual(
                    link_to_canonical(line),
                    ugly_replace(unicode(expected_lines[i].strip(), 'utf-8')))


class PluralsTest(unittest.TestCase):

    def test_plural_sets(self):
        self.assertEqual(key_set('Capital letters'), ('Capital letter', 'Capital letters'))
        self.assertEqual(key_set('classes'), ('class', 'classes'))
        self.assertEqual(key_set('class'), ('class', 'classes'))
        self.assertEqual(key_set('fish'), ('fish', 'fishes'))
        self.assertEqual(key_set('sheep'), ('sheep', 'sheeps'))
        self.assertEqual(key_set('child'), ('child', 'children', 'childrens','childs'))


def print_error(msg):
    print msg

#@unittest.skip("demonstrating skipping")
class TestEquations(unittest.TestCase):

    def setUp(self):
        self.parser = etree.XMLParser(remove_blank_text=True)

    def test_equations(self):
        def transform_eqn(filename, parser):
            transform = etree.XSLT(etree.parse('xslt/equations_root.xslt'))
            tree = etree.parse(filename, parser=parser)
            # using method="html" leaves col tags unclosed, and therefore creates malformed documents which can't be read by fromstring
            # TODO: is there a fix for this, or do we even need fromstring(tosting())?
            return etree.fromstring(etree.tostring(transform(tree), encoding='UTF-8', method="xml"), parser=parser)

        for f in [f for f in os.listdir('tests/equations') if f.endswith('.xml')]:
            result = transform_eqn(os.path.join('tests/equations', f), self.parser)
            expected = etree.parse(os.path.join('tests/equations', f.replace('.xml', '.html')), parser=self.parser)
            self.assertTrue(xml_compare(result, expected.getroot(), print_error))



class PartialTransformTest(unittest.TestCase):

    def setUp(self):
        self.parser = etree.XMLParser(remove_blank_text=True, encoding="utf-8")

    def test_partials(self):
        for f in [f for f in os.listdir('tests/partial_instruments') if f.endswith('.xml')]:
            print f
            with codecs.open(os.path.join('tests/partial_instruments', f), encoding='utf-8') as fp:
                result = tohtml(etree.fromstring(fp.read(), self.parser)).getroot()
            with codecs.open(os.path.join('tests/partial_instruments', f.replace('.xml', '.html')), encoding='utf-8') as fp:
            #with open(os.path.join('tests/partial_instruments', f.replace('.xml', '.html'))) as fp:
                #expected = html.fromstring(re.sub(ur'\xe2\x80\x99', "'", fp.read(), flags=re.UNICODE),
                expected = html.fromstring(ugly_replace(fp.read()),
                    parser=etree.HTMLParser(remove_blank_text=True, encoding="utf-8"))
            self.assertTrue(xml_compare(result, expected, print_error, do_attr=False))


@unittest.skip("demonstrating skipping")
class FullTransformTest(unittest.TestCase):

    def setUp(self):
        self.parser = etree.XMLParser(remove_blank_text=True)

    def test_html_transform(self):
        path = 'tests/instruments'
        sub = re.compile('\W')
        with app.test_request_context():
            for test_file in os.listdir(path):
                if test_file.endswith('html'):
                    print test_file
                    result = tohtml(etree.parse(os.path.join(path, test_file.replace('.html', '.xml'))))
                    expected = etree.parse(open(os.path.join(path, test_file)), parser=etree.HTMLParser()).xpath('.//body/div[1]')[0]
                    # findall much faster than xpath, but no 'or'
                    remove = expected.findall('.//div[@class="actbodylastpage"]') + expected.findall('.//div[@class="contents"]')
                    for r in remove:
                        r.getparent().remove(r)
                    #xpath = './/div[@class="prov"]|.//div[@class="form"]'
                    xpath = ".//div[contains(concat(' ', @class, ' '), ' part ')]"
                    results = result.xpath(xpath)
                    for i, seg in enumerate(expected.xpath(xpath)):
                        expected_seg = sub.sub('', etree.tostring(seg, method="text", encoding="utf-8"))
                        #print expected_seg
                        if len(results) <= i:
                            print etree.tostring(seg, method="text", encoding="utf-8")
                        result_seg = sub.sub('', etree.tostring(results[i], method="text", encoding="utf-8"))
                        x = [i for i in xrange(len(result_seg)) if i >= len(expected_seg) or result_seg[i] != expected_seg[i]]
                        if len(x):
                            print result_seg[x[0]-10:x[0]+100]
                            print expected_seg[x[0]-10:x[0]+100]

                        self.assertEqual(result_seg, expected_seg)
                        # we add too many links for this to work
                        #self.assertTrue(xml_compare(prov, results[i], print_error, do_attr=False))





if __name__ == '__main__':

    sys.path.insert(0, os.getcwd())
    from traversal import *
    from definitions import key_set
    from server import app
    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')

    # Make server routes available in testing mode
    # Run the tests
    unittest.main(argv=[sys.argv[0]])

else:
    from traversal import *
    from definitions import key_set
    from server import app