import unittest
import importlib
import sys
import os
import re

path = 'tests/cases'


def transform_pdf(pdf):
    # call pdf2html, gut etc, return processed html
    return pdf


def transform_case_html(html):
    #  read html, create new xml tree, cleaned up
    return html

class CaseConversion(unittest.TestCase):
    for test_file in os.list(path):
        open(os.path.join(path, test_file)) as f:
            transform_pdf(f)

if __name__ == '__main__':
    sys.path.append(os.getcwd())
    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
    # Make server routes available in testing mode
    # Run the tests
    unittest.main(argv=[sys.argv[0]])
