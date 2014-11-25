from elasticsearch import Elasticsearch
from xml2json import xml2json
import psycopg2
from lxml import etree


conn = psycopg2.connect("dbname=legislation user=josh")
cur = conn.cursor()

es = Elasticsearch()
entry_mapping = {
    'act': {
        'properties': {
            'id': {'type': 'integer'},
            'title': {'type': 'string'},
            'content': {'type': 'string'}
        }
    }
}
#es.create('legislation', body={'settings': {},  'mappings': entry_mapping})



cur.execute(""" select d.id, a.version, a.title, d.document, d.id  from acts a join documents d on d.id = a.document_id """)
while True:
	res = cur.fetchmany(10)
	if not res:
		break
	else:
		for r in res:
			try:
				document = {
						"id": r[4],
						'title': r[2],
						'content': " ".join(etree.fromstring(r[3]).itertext())
					}
				print document['id']

				es.index(index='legislation', doc_type='act', body=document, id=document['id'])
			except:
				pass


es.indices.refresh(index="legislation")