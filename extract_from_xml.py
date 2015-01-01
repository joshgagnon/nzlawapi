import os
from os.path import join
from lxml import etree
import psycopg2
import datetime




date_format = '%Y-%m-%d'

def safe_date(string):
    try:
        return datetime.datetime.strptime(string, date_format).date()
    except:
        return None

def process_acts(cur):
    location = '/Users/josh/legislation_archive/www.legislation.govt.nz/subscribe/act'
    count=0;
    ids = set()
    for dirpath, dirs, files in os.walk(location):
        files = [f for f in files if f.endswith('.xml')]
        if len(files):
            path = os.path.join(dirpath.replace('/Users/josh/legislation_archive/www.legislation.govt.nz/subscribe/', ''), files[0])
            try:
                tree = etree.parse(os.path.join(dirpath, files[0]))
                attrib = tree.getroot().attrib
                if attrib.get('id'):
                    title = tree.xpath('/act/cover/title')[0].text
                    query = """INSERT INTO acts (id, document_id, version, title, path, number, date_first_valid, date_assent, date_as_at, year, repealed)
                        VALUES (%(id)s, %(document_id)s, %(version)s, %(title)s, %(path)s, %(number)s, %(date_first_valid)s, %(date_assent)s, 
                            %(date_as_at)s, %(year)s, %(repealed)s); """
                    print title

                    doc_query = """INSERT INTO documents (searchable, type, document)
                        VALUES (to_tsvector('english', %(searchable)s), %(type)s, %(document)s) returning id"""


                    doc_values = {
                        'searchable': " ".join(tree.getroot().itertext()),
                        'type': 'xml',
                        'document': etree.tostring(tree, encoding='UTF-8', method='xml')
                    }

                    cur.execute(doc_query, doc_values)
                    document_id = cur.fetchone()[0]
                    print document_id
                    values =  {
                        'document_id': document_id,
                        'id': attrib.get('id'), 
                        'title': title,
                        'version': int(float(dirpath.split('/')[-1])),
                        'path': path,
                        'number': int(attrib.get('act.no')),
                        'date_first_valid': safe_date(attrib.get('date.first.valid')),
                        'date_as_at': safe_date(attrib.get('date.as.at')),
                        'date_assent': safe_date(attrib.get('date.assent')),
                        'year': int(attrib.get('year')),
                        'repealed': attrib.get('terminated') == "repealed"
                    }
                    cur.execute(query, values)
                    if 0: # do ids
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

def process_regulations(cur):
    location = '/Users/josh/legislation_archive/www.legislation.govt.nz/subscribe/regulation'
    count=0;
    ids = set()
    for dirpath, dirs, files in os.walk(location):
        files = [f for f in files if f.endswith('.xml')]
        if len(files):
            path = os.path.join(dirpath.replace('/Users/josh/legislation_archive/www.legislation.govt.nz/subscribe/', ''), files[0])
            try:
                tree = etree.parse(os.path.join(dirpath, files[0]))
                attrib = tree.getroot().attrib
                if attrib.get('id'):
                    title = tree.xpath('/act/cover/title')[0].text
                    query = """INSERT INTO regulations (id, document_id, version, title, path, number, date_first_valid, date_gazetted, date_terminated, date_imprint, year, repealed)
                        VALUES (%(id)s, %(document_id)s, %(version)s, %(title)s, %(path)s, %(number)s, %(date_first_valid)s, %(date_assent)s, 
                            %(date_as_at)s, %(year)s, %(repealed)s); """
                    print title

                    doc_query = """INSERT INTO documents (searchable, type, document)
                        VALUES (to_tsvector('english', %(searchable)s), %(type)s, %(document)s) returning id"""


                    doc_values = {
                        'searchable': " ".join(tree.getroot().itertext()),
                        'type': 'xml',
                        'document': etree.tostring(tree, encoding='UTF-8', method='xml')
                    }

                    cur.execute(doc_query, doc_values)
                    document_id = cur.fetchone()[0]
                    print document_id
                    values =  {
                        'document_id': document_id,
                        'id': attrib.get('id'), 
                        'title': title,
                        'version': int(float(dirpath.split('/')[-1])),
                        'path': path,
                        'number': int(attrib.get('act.no')),
                        'date_first_valid': safe_date(attrib.get('date.first.valid')),
                        'date_gazetted': safe_date(attrib.get('date.date_gazetted')),
                        'date_terminated': safe_date(attrib.get('date.ter')),
                        'date_imprint': safe_date(attrib.get('date.imprint')),
                        'year': int(attrib.get('year')),
                        'repealed': attrib.get('terminated') == "repealed"
                    }
                    cur.execute(query, values)
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


if __name__ = '__main__':
    conn = psycopg2.connect("dbname=legislation user=josh")
    cur = conn.cursor()
    process_acts(cur)
    process_regulations(cur)
    conn.commit()
    cur.close()
    conn.close()