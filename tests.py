import random
import unittest
from db import connect_db
from server import *


class TestQueries(unittest.TestCase):

    def setUp(self):
        self.conn = connect_db()
        self.xml = get_act_exact('companies act 1993', db=self.conn)

    def tearDown(self):
        self.conn.close()

    def test_path_query_counts(self):
        # test path queries return correct number of leaf nodes
        self.assertEqual(len(find_sub_node(self.xml, ['2'])), 1)
        self.assertEqual(len(find_sub_node(self.xml, ['223'])), 1)
        self.assertEqual(len(find_sub_node(self.xml, ['223', 'b'])), 1)
        self.assertEqual(len(find_sub_node(self.xml, ['223', 'a+c'])), 2)
        self.assertEqual(len(find_schedule_node(self.xml, '2')), 1)

    def test_path_query_failures(self):
        self.assertRaises(CustomException, find_sub_node, self.xml, ['666'])      

    def test_definition_query_counts(self):
        self.assertEqual(len(find_definitions(self.xml, 'company')), 20)
        self.assertRaises(CustomException, find_definitions, self.xml, 'balderdash')

    def test_id_search(self):
        self.assertEqual(len(find_node_by_id('DLM320106', db=self.conn)[0]), 1)

    def test_search(self):
        self.assertEqual(len(find_node_by_query(self.xml, 'constitution')), 910)
        self.assertEqual(len(find_node_by_query(self.xml, 'fistycuffs')), 0)


if __name__ == '__main__':
    unittest.main()