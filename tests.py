import random
import unittest
from server import *


class TestQueries(unittest.TestCase):

    def setUp(self):
        self.xml = read_file(act_to_filename('companiesact1993'))

    def test_path_query_counts(self):
        # test path queries return correct number of leaf nodes
        self.assertEqual(len(find_node(self.xml, ['2'])), 1)
        self.assertEqual(len(find_node(self.xml, ['schedule', '2'])), 1)
        self.assertEqual(len(find_node(self.xml, ['223'])), 1)
        self.assertEqual(len(find_node(self.xml, ['223', 'b'])), 1)
        self.assertEqual(len(find_node(self.xml, ['223', 'a+c'])), 2)

    def test_path_query_failures(self):
        self.assertRaises(CustomException, find_node, self.xml, ['666'])      

    def test_definition_query_counts(self):
        self.assertEqual(len(find_definitions(self.xml, 'company')), 20)
        self.assertEqual(len(find_definitions(self.xml, 'balderdash')), 0)

    def test_id_search(self):
        self.assertEqual(len(find_node_by_id('DLM320106')), 1)

    def test_search(self):
        self.assertEqual(len(find_node_by_query(self.xml, 'constitution')), 910)
        self.assertEqual(len(find_node_by_query(self.xml, 'fistycuffs')), 0)


if __name__ == '__main__':
    unittest.main()