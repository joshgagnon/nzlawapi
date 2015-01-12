from db import connect_db, get_act_exact
import psycopg2
from definitions import find_all_definitions, render_definitions, process_node, Definitions
from lxml import etree
from xml.dom import minidom
from psycopg2.extras import RealDictCursor as dict_curs
import json


if __name__ == "__main__":
    conn = connect_db()
    interpretation = get_act_exact('Interpretation Act 1999', db=conn)
    definitions_orig = find_all_definitions(interpretation)


    with conn.cursor(cursor_factory=dict_curs) as in_cur, \
        conn.cursor(cursor_factory=dict_curs) as out_cur:
        
        query = """select a.id, path, version, document, d.id as document_id from acts a 
        join documents d on a.document_id = d.id
        where a.processed = false order by id desc"""
        in_cur.execute(query)

        results = in_cur.fetchmany(1)
        while len(results):
            result = results[0]
            #print result['id'], result['path']
            try:
                domxml = minidom.parseString(result['document'])
                definitions = definitions_orig.__deepcopy__()
                process_node(domxml, definitions)
                doc = domxml.toxml()
                json_defs = json.dumps(render_definitions(definitions))
                
                update_act_query = 'update acts set processed = true, definitions = %(definitions)s where id = %(id)s and version = %(version)s'
                update_doc_query = 'update documents set document = %(doc)s where id = %(id)s'
                out_cur.execute(update_act_query, {'definitions': json_defs, 'id': result['id'], 'version': result['version']})
                out_cur.execute(update_doc_query, {'doc': doc, 'id': result['document_id']})
            except Exception, e:
                print 'FAIL', e
                print result['path'], result['id'], result['version']
            results = in_cur.fetchmany(1)



    conn.commit()
    conn.close()
    #domxml = minidom.parseString(etree.tostring(tree, encoding='UTF-8', method="html"))
    #process_node(domxml, definitions)
    #tree = etree.fromstring(domxml.toxml(), parser=etree.XMLParser(huge_tree=True))
    #return tree, render_definitions(definitions)
