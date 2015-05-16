import unittest
import os
import importlib
import psycopg2
import distutils.util
import sys
from server import app
from xml import etree
from flask import json
from acts.definitions import *
from acts.acts import *
from acts.traversal import *
from util import xml_compare, generate_path_string
from db import connect_db_config
from migration import run as run_migration
from query.query import *

from acts import tests

def init_database(filename):
    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
    # Drop and recreate test database ready for each TestCase to enter data
    conn = psycopg2.connect(database='postgres', user=config.DB_USER, password=config.DB_PW)
    conn.set_isolation_level(0)

    with conn.cursor() as cur:
        cur.execute('DROP DATABASE IF EXISTS ' + config.DB + ';')
        cur.execute('CREATE DATABASE ' + config.DB + ';')
    conn.close()

    # Load schema and update with migrations if required
    conn = connect_db_config(config)
    with open('tests/schema.sql') as f, conn.cursor() as cur:
        cur.execute(f.read())
    conn.commit()

    with open(os.path.join('tests/data', filename)) as f, conn.cursor() as cur:
        cur.execute(f.read())
    conn.commit()

    # Intercept stdout during migrations
    stdout = sys.stdout
    sys.stdout = open(os.devnull, 'w')

    run_migration()

    sys.stdout = stdout

    return conn

@unittest.skip("demonstrating skipping")
class TestQueries(unittest.TestCase):

    def setUp(self):
        self.parser = etree.XMLParser(remove_blank_text=True)
        self.tree = etree.parse('tests/companiesact.xml', parser=self.parser).getroot()

    def test_path_query_counts(self):
        # test path queries return correct number of leaf nodes
        self.assertEqual(len(find_sub_node(self.tree, ['2'])), 1)
        self.assertEqual(len(find_sub_node(self.tree, ['223'])), 1)
        self.assertEqual(len(find_sub_node(self.tree, ['223', 'b'])), 1)
        self.assertEqual(len(find_sub_node(self.tree, ['223', 'a+c'])), 2)
        self.assertEqual(len(find_sub_node(self.tree, ['223', 'a-c'])), 3)
        self.assertEqual(len(find_sub_node(self.tree.find('.//body'), ['1-10'])), 10)
        self.assertEqual(len(find_sub_node(self.tree.find('.//body'), ['1+8-10+15'])), 5)
        self.assertEqual(len(find_sub_node(self.tree.find('.//body'), ['2+11-13+18-19+25'])), 7)


    def test_find_by_string(self):
        prov = nodes_from_path_string(self.tree, 's 2')[0]
        self.assertTrue(prov.tag, 'prov')
        self.assertEqual(nodes_from_path_string(self.tree, 'Part 1 s 2')[0], prov)
        prov = nodes_from_path_string(self.tree, 's 216(2)(b)')[0]
        self.assertTrue(prov.tag, 'label-para')
        self.assertEqual(nodes_from_path_string(self.tree, 'Part 12 s 216(2)(b)')[0], prov)
        self.assertRaises(CustomException, nodes_from_path_string, self.tree, 'Part 2 s 666')
        sched = nodes_from_path_string(self.tree, 'sch')[0]
        self.assertTrue(sched.tag, 'schedule')
        self.assertEqual(nodes_from_path_string(self.tree, 'schedule 1')[0], sched)
        self.assertEqual(nodes_from_path_string(self.tree, 'sch 3 cl 1')[0].tag, 'prov')
        self.assertEqual(nodes_from_path_string(self.tree, 'sch 3 cl 1(2)')[0].tag, 'subprov')

    def test_path_query_failures(self):
        self.assertRaises(CustomException, find_sub_node, self.tree, ['666'])

    def test_definition_query_counts(self):
        self.assertEqual(len(find_definitions(self.tree, 'company')), 20)
        self.assertRaises(CustomException, find_definitions, self.tree, 'balderdash')

    def test_search(self):
        self.assertEqual(len(find_node_by_query(self.tree, 'constitution')), 910)
        self.assertEqual(len(find_node_by_query(self.tree, 'fistycuffs')), 0)

#@unittest.skip("demonstrating skipping")
class TestDefinitions(unittest.TestCase):

    def setUp(self):
        self.parser = etree.XMLParser(remove_blank_text=True)

    def test_definition_extraction(self):
        tree = etree.parse('tests/3_definitions.xml', parser=self.parser)
        definitions = Definitions()
        find_all_definitions(tree, definitions, document_id=0, expire=False)
        self.assertEqual(len(definitions.items()), 3)
        self.assertTrue(('accounting period', 'accounting periods') in definitions.active)
        self.assertTrue(('address for service', 'address for services', 'addresses for service', 'addresses for services') in definitions.active)
        self.assertTrue(('annual meeting', 'annual meetings') in definitions.active)

    def test_definition_transience_simple(self):
        tree = etree.parse('tests/transient_defs.xml', parser=self.parser)
        tree, definitions = populate_definitions(tree, document_id=0)
        tree = process_definitions(tree, definitions)
        self.assertEqual(len(definitions.active), 1)  # one global
        self.assertEqual(len(definitions.items()), 4)

    def test_definition_redefinitions(self):
        tree = etree.parse('tests/redefinitions.xml', parser=self.parser)
        tree, definitions = populate_definitions(tree, document_id=0)
        tree, _ = process_definitions(tree, definitions)
        self.assertEqual(len(tree.xpath('.//catalex-def')), 4)
        self.assertEqual(tree.xpath('.//catalex-def')[0].attrib['def-ids'], '0-xxx')
        self.assertEqual(tree.xpath('.//catalex-def')[1].attrib['def-ids'], '0-yyy')
        self.assertEqual(tree.xpath('.//catalex-def')[2].attrib['def-ids'], '0-xxx')
        self.assertEqual(tree.xpath('.//catalex-def')[3].attrib['def-ids'], '0-zzz')

    def test_case_and_plurals(self):
        tree = etree.parse('tests/plural_charcase_defs.xml', parser=self.parser)
        tree, definitions = populate_definitions(tree, document_id=0)
        tree, _ = process_definitions(tree, definitions)
        self.assertEqual(len(definitions.items()), 6)
        self.assertEqual(len(tree.xpath('.//*[@cid="case_wrong_start"]/catalex-def-def')), 0)
        self.assertEqual(len(tree.xpath('.//*[@cid="case_wrong_end"]/catalex-def')), 0)
        self.assertEqual(len(tree.xpath('.//*[@cid="case_correct"]/catalex-def')), 1)
        self.assertEqual(len(tree.xpath('.//*[@cid="case_plural_correct"]/catalex-def')), 1)
        self.assertEqual(len(tree.xpath('.//*[@cid="plural_correct"]/catalex-def')), 1)
        self.assertEqual(len(tree.xpath('.//*[@cid="plural_wrong"]/catalex-def')), 0)
        self.assertEqual(len(tree.xpath('.//*[@cid="complex_plural_correct"]/catalex-def')), 1)
        self.assertEqual(len(tree.xpath('.//*[@cid="complex_plural_possessive_correct"]/catalex-def')), 1)
        self.assertEqual(len(tree.xpath('.//*[@cid="complex_plural_possessive_correct_2"]/catalex-def')), 2)
        self.assertEqual(len(tree.xpath('.//*[@cid="complex_plural_possessive_correct_3"]/catalex-def')), 4)
        self.assertEqual(len(tree.xpath('.//catalex-def')), 12)

    def test_complex(self):
        tree = etree.parse('tests/companiesact_gutted.xml', parser=self.parser)
        tree, definitions = populate_definitions(tree, document_id=0)
        tree, _ = process_definitions(tree, definitions)


def transform_eqn(filename, parser):
    transform = etree.XSLT(etree.parse('xslt/equations_root.xslt'))
    tree = etree.parse(filename, parser=parser)
    # using method="html" leaves col tags unclosed, and therefore creates malformed documents which can't be read by fromstring
    # TODO: is there a fix for this, or do we even need fromstring(tosting())?
    return etree.fromstring(etree.tostring(transform(tree), encoding='UTF-8', method="xml"), parser=parser)


def print_error(msg):
    print msg

@unittest.skip("demonstrating skipping")
class TestEquations(unittest.TestCase):

    def setUp(self):
        self.parser = etree.XMLParser(remove_blank_text=True)

    def test_equations(self):
        for f in [f for f in os.listdir('tests/equations') if f.endswith('.xml')]:
            result = transform_eqn(os.path.join('tests/equations', f), self.parser)
            expected = etree.parse(os.path.join('tests/equations', f.replace('.xml', '.html')), parser=self.parser)
            self.assertTrue(xml_compare(result, expected.getroot(), print_error))

#@unittest.skip("demonstrating skipping")
class TestPathExtraction(unittest.TestCase):
    def setUp(self):
        self.parser = etree.XMLParser(remove_blank_text=True)

    def test_equations(self):
        tree = etree.parse('tests/path_extraction.xml', parser=self.parser)
        el = tree.xpath('.//*[@id="zzz"]')[0]
        self.assertEqual(generate_path_string(el)[0], 'Test Act 666 s 2(1)(a)(i)')
        el = tree.xpath('.//*[@id="yyy"]')[0]
        self.assertEqual(generate_path_string(el)[0], 'Test Act 666 s 2(1)(a)')
        el = tree.xpath('.//*[@id="xxx"]')[0]
        self.assertEqual(generate_path_string(el)[0], 'Test Act 666 s 2(1)')
        el = tree.xpath('.//*[@id="aaa"]')[0]
        self.assertEqual(generate_path_string(el)[0], 'Test Act 666 sch 1 cl 1(1)')

@unittest.skip("demonstrating skipping")
class AutocompleteTest(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.conn = init_database('autocomplete.sql')

    def tearDown(self):
        self.conn.close()

    def get_auto_complete(self, query):
        result = self.app.get('/article_auto_complete?query={}'.format(query))
        return json.loads(result.data)['results']

    # def assertCount(self, query, count):
    #     data = json.loads(result.data)
    #     self.assertEqual(len(data['results']), count)

    def test_no_results(self):
        self.assertEqual(0, len(self.get_auto_complete('abcdef')))

    def test_limited_results(self):
        self.assertEqual(50, len(self.get_auto_complete('Comp')))

    def test_exact_results(self):
        results = self.get_auto_complete('Companies Act')
        self.assertEqual(19, len(results))
        self.assertEqual('Companies Act 1993', results[0]['name'])

    def test_case_insensitive(self):
        self.assertEqual(19, len(self.get_auto_complete('cOmpAnIEs act')))


# TODO, assumes data in db, but in a hurry
# TODO, replace companies act with much much smaller act, everywhere
@unittest.skip("demonstrating skipping")
class InstrumentTest(unittest.TestCase):

    def setUp(self):
        self.conn = init_database('instruments.sql')
        self.document_id = 'DLM319569'

    def tearDown(self):
        self.conn.close()

    def test_companies_act_full(self):
        with app.test_request_context():
            self.assertIsNotNone(self.document_id)
            full = query_instrument({'document_id': '%s' % self.document_id})
            self.assertIsNotNone(full['html_content'])
            self.assertEqual(full['format'], 'skeleton')
            self.assertEqual(full['title'], 'Companies Act 1993')

    def test_companies_act_full_govt_id(self):
        with app.test_request_context():
            full = query_instrument({'id': 'DLM319569'})
            self.assertIsNotNone(full['html_content'])
            self.assertEqual(full['format'], 'skeleton')
            self.assertEqual(full['title'], 'Companies Act 1993')

    def test_companies_act_govt_fragment(self):
        with app.test_request_context():
            fragment = query_instrument({'document_id': '%s' % self.document_id, 'govt_location': 'DLM320681', 'find': 'govt_location'})
            self.assertIsNotNone(fragment['html_content'])
            self.assertEqual(fragment['format'], 'fragment')
            # self.assertEqual(fragment['full_title'], 'Companies Act 1993 s 146')  # TODO: Uncomment when REPROCESS_DOCS = True works for test harness

    def test_companies_act_fragment(self):
        with app.test_request_context():
            fragment = query_instrument({'document_id': '%s' % self.document_id, 'location': 's 146(2)(a)(iv)', 'find': 'location'})
            self.assertIsNotNone(fragment['html_content'])
            self.assertEqual(fragment['format'], 'fragment')
            # self.assertEqual(fragment['full_title'], 'Companies Act 1993 s 146(2)(a)(iv)')  # TODO: Uncomment when REPROCESS_DOCS = True works for test harness

    def test_companies_act_preview(self):
        with app.test_request_context():
            preview = query_instrument({'document_id': '%s' % self.document_id, 'find': 'preview'})
            self.assertIsNotNone(preview['html_content'])
            self.assertEqual(preview['format'], 'preview')
            self.assertEqual(preview['full_title'], 'Companies Act 1993')

    def test_companies_act_more(self):
        with app.test_request_context():
            parts = query_instrument({'document_id': '%s' % self.document_id, 'find': 'more', 'parts': '4,5,6'})
            self.assertIsNotNone(parts['parts'])
            # self.assertEqual(len(parts['parts']), 3)  # TODO: Uncomment when REPROCESS_DOCS = True works for test harness


if __name__ == '__main__':
    # Warn against potentially dropping the live database
    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
    if config.DB.find('test') == -1:
        print 'About to drop database "' + config.DB + '" - Proceed? [y/N]'
        confirm = raw_input().lower()
        try:
            if not distutils.util.strtobool(confirm):
                sys.exit(-1)
        except Exception, e:
            sys.exit(-1)

    # Make server routes available in testing mode
    app.config['TESTING'] = True

    # Run the tests
    unittest.main(argv=[sys.argv[0]])
