import unittest
import importlib
import sys
import os
import re


class TestLinkParsing(unittest.TestCase):

    def test_transform(self):
        with open('tests/link_examples.txt') as links, open('tests/links_manually_fixed.txt') as expected:
            expected_lines = expected.readlines()
            for i, line in enumerate(links.readlines()):
                self.assertEqual(
                    link_to_canonical(line),
                    unicode(expected_lines[i].strip(), 'utf-8').replace(u"\u00A0", u' '))


class PluralsTest(unittest.TestCase):

    def test_plural_sets(self):
        self.assertEqual(key_set('Capital letters'), ('Capital letter', 'Capital letters'))
        self.assertEqual(key_set('classes'), ('class', 'classes'))
        self.assertEqual(key_set('class'), ('class', 'classes'))
        self.assertEqual(key_set('fish'), ('fish', 'fishes'))
        self.assertEqual(key_set('sheep'), ('sheep', 'sheeps'))
        self.assertEqual(key_set('child'), ('child', 'children', 'childrens','childs'))


if __name__ == '__main__':

    sys.path.append(os.getcwd())
    from traversal import *
    from definitions import key_set

    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')

    # Make server routes available in testing mode
    # Run the tests
    unittest.main(argv=[sys.argv[0]])

else:
    from traversal import *
    from definitions import key_set