import os
from os.path import join
from lxml import etree
import psycopg2
import datetime


conn = psycopg2.connect("dbname=legislation user=josh")
cur = conn.cursor()

attribs = ['id', 'act.no', 'date.assent', 'date.first.valid', 'date.as.at', 'year']

def safe_date(string):
	try:
		return datetime.datetime.strptime(string, date_format).date()
	except:
		return None
date_format = '%Y-%m-%d'
location = '/Users/josh/legislation_archive/www.legislation.govt.nz/subscribe'
count=0;
ids = set()
for dirpath, dirs, files in os.walk(location):
	files = [f for f in files if f.endswith('.xml')]
	if len(files):
		path = os.path.join(dirpath.replace(location+'/', ''), files[0])
		try:
			tree = etree.parse(os.path.join(dirpath, files[0]))
			attrib = tree.getroot().attrib
			if attrib.get('id'):
				title = tree.xpath('/act/cover/title')[0].text
				query = """INSERT INTO acts (id, version, title, path, number, date_first_valid, date_assent, date_as_at, year)
	        		VALUES (%(id)s, %(version)s, %(title)s, %(path)s, %(number)s, %(date_first_valid)s, %(date_assent)s,
	        			%(date_as_at)s, %(year)s); """
				print title
				values =  {
					'id': attrib.get('id'), 
					'title': title,
					'version': int(float(dirpath.split('/')[-1])),
					'path': path,
					'number': int(attrib.get('act.no')),
					'date_first_valid': safe_date(attrib.get('date.first.valid')),
					'date_as_at': safe_date(attrib.get('date.as.at')),
					'date_assent': safe_date(attrib.get('date.assent')),
					'year': int(attrib.get('year'))
				}

				#cur.execute(query, values)
				
				parent_id = attrib.get('id')
				for el in tree.xpath('//*[@id]'):

					new_id = el.attrib.get('id')
					if new_id not in ids:
						query = """ INSERT INTO id_lookup(id, parent_id, mapper) VALUES 
						(%(id)s, %(parent_id)s, 'acts')"""
						values = {
							'id':new_id,
							'parent_id': parent_id
						}
						try:
							cur.execute(query, values)
						except Exception, e:
							print e
					ids |= {new_id}
				
		except Exception, e:
			print 'ERROR', e, path


conn.commit()
cur.close()
conn.close()