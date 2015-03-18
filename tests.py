import unittest
from xml import etree
from server import *
from acts.definitions import *
from acts.acts import *
from acts.traversal import *
from util import xml_compare, generate_path_string
from db import connect_db_config
import os


class TestQueries(unittest.TestCase):

    def setUp(self):
        self.parser = etree.XMLParser(remove_blank_text=True)
        self.xml = etree.parse('tests/companiesact.xml', parser=self.parser)

    def tearDown(self):
        pass
        #self.conn.close()

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

    def test_search(self):
        self.assertEqual(len(find_node_by_query(self.xml, 'constitution')), 910)
        self.assertEqual(len(find_node_by_query(self.xml, 'fistycuffs')), 0)


class TestDefinitions(unittest.TestCase):

    def setUp(self):
        self.parser = etree.XMLParser(remove_blank_text=True)

    def test_definition_extraction(self):
        tree = etree.parse('tests/3_definitions.xml', parser=self.parser)
        definitions = Definitions()
        find_all_definitions(tree, definitions, expire=False)
        self.assertEqual(len(definitions.items()), 3)
        self.assertTrue('accounting period' in definitions.active)
        self.assertTrue('address for service' in definitions.active)
        self.assertTrue('annual meeting' in definitions.active)

    def test_definition_transience_simple(self):
        tree = etree.parse('tests/transient_defs.xml', parser=self.parser)
        definitions = Definitions()
        tree = process_definitions(tree, definitions)
        self.assertEqual(len(definitions.active), 0)
        self.assertEqual(len(definitions.items()), 4)

    def test_definition_redefinitions(self):
        tree = etree.parse('tests/redefinitions.xml', parser=self.parser)
        definitions = Definitions()
        tree, _ = process_definitions(tree, definitions)
        self.assertEqual(len(tree.xpath('.//catalex-def')), 4)
        self.assertEqual(tree.xpath('.//catalex-def')[0].attrib['def-id'], 'def-xxx')
        self.assertEqual(tree.xpath('.//catalex-def')[1].attrib['def-id'], 'def-yyy')
        self.assertEqual(tree.xpath('.//catalex-def')[2].attrib['def-id'], 'def-xxx')
        self.assertEqual(tree.xpath('.//catalex-def')[3].attrib['def-id'], 'def-zzz')


def transform_eqn(filename, parser):
    transform = etree.XSLT(etree.parse('xslt/equations_root.xslt'))
    tree = etree.parse(filename, parser=parser)
    # using method="html" leaves col tags unclosed, and therefore creates malformed documents which can't be read by fromstring
    # TODO: is there a fix for this, or do we even need fromstring(tosting())?
    return etree.fromstring(etree.tostring(transform(tree), encoding='UTF-8', method="xml"), parser=parser)


def print_error(msg):
    print msg

class TestEquations(unittest.TestCase):

    def setUp(self):
        self.parser = etree.XMLParser(remove_blank_text=True)

    def test_equations(self):
        for f in [f for f in os.listdir('tests/equations') if f.endswith('.xml')]:
            result = transform_eqn(os.path.join('tests/equations', f), self.parser)
            expected = etree.parse(os.path.join('tests/equations', f.replace('.xml', '.html')), parser=self.parser)
            self.assertTrue(xml_compare(result, expected.getroot(), print_error))


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



# TODO, assumes data in db, but in a hurry
# TODO, replace companies act with much much smaller act, everywhere
class InstrumentTest(unittest.TestCase):

    def setUp(self):
        import importlib
        config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
        self.conn = connect_db_config(config)
        with self.conn.cursor() as cur, app.test_request_context():
            cur.execute("""select id from latest_instruments where title = 'Companies Act 1993'""");
            self.document_id = document_id = cur.fetchone()[0]

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
            self.assertEqual(fragment['full_title'], 'Companies Act 1993 s 146')

    def test_companies_act_fragment(self):
        with app.test_request_context():
            fragment = query_instrument({'document_id': '%s' % self.document_id, 'location': 's 146(2)(a)(iv)', 'find': 'location'})
            self.assertIsNotNone(fragment['html_content'])
            self.assertEqual(fragment['format'], 'fragment')
            self.assertEqual(fragment['full_title'], 'Companies Act 1993 s 146(2)(a)(iv)')

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
            self.assertEqual(len(parts['parts']), 3)


if __name__ == '__main__':
    #hack
    unittest.main(argv=[sys.argv[0]])
