import unittest
import importlib
import sys
import os
import re
from util import xml_compare
from lxml import etree

path = 'tests/cases'


class CaseConversion(unittest.TestCase):
    def test_transform(self):
        with app.test_request_context():
            for test_file in sorted(os.listdir(path)):
                if test_file.endswith('xml') and not test_file.startswith('template.') and '006_ASB v Black' not test_file:
                    print 'Running test for %s' % test_file
                    result = process_case(os.path.join(path, test_file.replace('.xml', '.pdf')), debug=True) #test_file=='006_ASB v Black NZCOA_1-5.xml')
                    expected = etree.parse(open(os.path.join(path, test_file))).getroot()
                    def p(x):
                        print x
                    self.assertTrue(xml_compare(etree.fromstring(result), expected, p))
                    print 'Passed test for %s' % test_file

class PluralsTest(unittest.TestCase):

    def test_plural_sets(self):
        print 'myma'



if __name__ == '__main__':
    sys.path.insert(0, os.getcwd())
    from transform_case import process_case
    from server import app

    unittest.main(argv=[sys.argv[0]])
