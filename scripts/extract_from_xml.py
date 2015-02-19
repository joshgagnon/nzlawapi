import os
from lxml import etree
import psycopg2
from psycopg2 import extras
import datetime
import xml.etree.ElementTree as ET
import sys
import importlib
import json

date_format = '%Y-%m-%d'

def safe_date(string):
    try:
        return datetime.datetime.strptime(string, date_format).date()
    except:
        return None


def process(type, db, config):
    location = '%s/%s' % (config.ACT_DIR, type)
    count = 0
    with db.cursor() as cur:

        parser = etree.XMLParser(resolve_entities=False)
        print location
        for dirpath, dirs, files in os.walk(location):
            files = [f for f in files if f.endswith('.xml')]


            if len(files):

                path = os.path.join(dirpath.replace(config.ACT_DIR+'/', ''), files[0])
                try:
                    print path
                    tree = etree.parse(os.path.join(dirpath, files[0]), parser)

                    attrib = tree.getroot().attrib
                    if attrib.get('id'):
                        title = etree.tostring(tree.xpath('.//billref|.//title')[0], method="text", encoding="UTF-8")
                        #TODO
                        title = title.replace('\n', '').strip()
                        query = """INSERT INTO instruments (id, govt_id, version, title, path, number, date_as_at, type,
                                date_first_valid, date_gazetted, date_terminated, date_imprint, year, repealed, in_amend,
                                pco_suffix, raised_by, official, subtype, terminated, stage, date_signed, imperial, instructing_office, attributes)
                            VALUES (%(id)s, %(govt_id)s, %(version)s, %(title)s, %(path)s, %(number)s, %(date_as_at)s, %(type)s,
                                %(date_first_valid)s, %(date_gazetted)s, %(date_terminated)s, %(date_imprint)s,
                                %(year)s, %(repealed)s, %(in_amend)s, %(pco_suffix)s, %(raised_by)s, %(official)s, %(subtype)s,
                                %(terminated)s, %(stage)s, %(date_signed)s, %(imperial)s, %(instructing_office)s, %(attr)s); """

                        with open(os.path.join(dirpath, files[0])) as r:
                            cur.execute(""" INSERT INTO documents (document, type) VALUES (%(document)s, 'xml') returning id""",
                                {'document': r.read()})

                        document_id = cur.fetchone()[0]

                        values = {
                            'id': document_id,
                            'govt_id': attrib.get('id'),
                            'title': title,
                            'version': int(float(dirpath.split('/')[-1])),
                            'path': path,
                            'number': attrib.get('sr.no', attrib.get('sop.no', attrib.get('act.no', attrib.get('bill.no')))),
                            'date_first_valid': safe_date(attrib.get('date.first.valid')),
                            'date_gazetted': safe_date(attrib.get('date.date_gazetted')),
                            'date_terminated': safe_date(attrib.get('date.terminated')),
                            'date_imprint': safe_date(attrib.get('date.imprint')),
                            'date_as_at': safe_date(attrib.get('date.as.at')),
                            'year': int(attrib.get('year')),
                            'repealed': attrib.get('terminated') == "repealed",
                            'in_amend': attrib.get('in.amend') != 'false',
                            'pco_suffix': attrib.get('pco.suffix'),
                            'raised_by': attrib.get('raised.by'),
                            'official': attrib.get('official'),
                            'type': type,
                            'subtype': attrib.get('act.type', attrib.get('sr.type', attrib.get('bill.type'))),
                            'terminated': attrib.get('terminated'),
                            'stage': attrib.get('stage'),
                            'date_signed': safe_date(attrib.get('date.signed')),
                            'imperial':  attrib.get('imperial') == 'yes',
                            'instructing_office': attrib.get('instructing_office'),
                            'attr': json.dumps(dict(attrib))
                        }
                        cur.execute(query, values)

                except etree.XMLSyntaxError, e:
                    print 'ERROR', e, path


if __name__ == "__main__":
    if not len(sys.argv) > 1:
        raise Exception('Missing configuration file')
    sys.path.append(os.getcwd())

    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
    db = psycopg2.connect(
            database=config.DB,
            user=config.DB_USER,
            password=config.DB_PW)
    db.set_client_encoding('utf8')
    process('act', db, config)
    process('regulation', db, config)
    process('sop', db, config)
    process('bill', db, config)
    db.commit()
