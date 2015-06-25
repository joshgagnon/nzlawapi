import unittest
import importlib
import sys
import os
import re
from util import xml_compare


path = 'tests/cases'


class CaseConversion(unittest.TestCase):
    def test_transform(self):
        with app.test_request_context():
            for test_file in os.listdir(path):
                print test_file
                if test_file.endswith('xml') and not test_file.startswith('template.'):
                    process_case(os.path.join(path, test_file.replace('.xml', '.pdf')))


class PluralsTest(unittest.TestCase):

    def test_plural_sets(self):
        print 'myma'



if __name__ == '__main__':
    sys.path.insert(0, os.getcwd())
    from transform_case import process_case
    from server import app

    unittest.main(argv=[sys.argv[0]])
