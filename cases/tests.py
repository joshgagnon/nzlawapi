import unittest
import importlib
import sys
import os
import re
from util import xml_compare
from cases import transform_case

path = 'tests/cases'


class CaseConversion(unittest.TestCase):
    for test_file in os.list(path) if test_file.endswith('xml') and not test_file.startswith('template.'):
        transform_case.process_case(test_file)


if __name__ == '__main__':
    sys.path.append(os.getcwd())
    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
    # Make server routes available in testing mode
    # Run the tests
    unittest.main(argv=[sys.argv[0]])
