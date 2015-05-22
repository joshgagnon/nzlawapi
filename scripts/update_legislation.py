# -*- coding: utf-8 -*-
from lxml import etree, objectify
import urllib2
import logging
import psycopg2
from psycopg2 import extras
import sys
import importlib
import os
from os import path
import re
import json
from flask import current_app


url = "http://www.legislation.govt.nz/atom.aspx?search=ad_act@bill@regulation@deemedreg______25_ac@bc@rc@dc@apub@aloc@apri@apro@aimp@bgov@bloc@bpri@bmem@rpub@rimp_ac@bc@rc@ainf@anif@aaif@aase@arep@bcur@bena@bter@rinf@rnif@raif@rasm@rrev_a_aw_se&p=1&t=New%20Zealand%20Legislation%20custom%20feed&d=90"

resource_url = "http://www.legislation.govt.nz/subscribe"
parser=etree.XMLParser(resolve_entities=False)
def run(db, config):
    from acts.links import analyze_new_links
    from acts.queries import get_unprocessed_instrument, get_instrument_object
    from acts.instrument_es import delete_instrument_es, update_old_versions_es
    import server

    response = urllib2.urlopen(url)
    response_string = response.read()

    doc = etree.fromstring(response_string, etree.XMLParser(resolve_entities=False, huge_tree=True))

    objectify.deannotate(doc, cleanup_namespaces=True)
    for elem in doc.iter():
        if not hasattr(elem.tag, 'find'): continue
        i = elem.tag.find('}')
        if i >= 0:
            elem.tag = elem.tag[i+1:]

    updated_ids = []
    for el in doc.xpath('//entry'):
        link = el.find('link')
        updated = el.xpath('updated')[0].text
        interested = re.match(r'^/(act|regulation|bill|sop)/', link.attrib['href'])
        if interested:
            filename = el.xpath('id')[0].text.split(':')[2]
            path = '/'.join(link.attrib['href'].split('/')[1:-1] + ['%s%s' % (filename, '.xml')])
            # look for path in db
            with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
                current_app.logger.debug('checking %s' % path)
                cur.execute("""select i.id, (d.updated < %(updated)s) as stale from instruments i join documents d on i.id = d.id
                    where path = %(path)s""",
                    {'path': path, 'updated': updated})
                document = cur.fetchone()

                if document and (document.get('stale') or True):
                    cur.execute("""delete from documents where id = %(id)s """, {'id': document.get('id')})
                    delete_instrument_es(document.get('id'))
                    current_app.logger.info('remove %s %d' % (updated, document.get('id')))
                # we have found newer
                if not document or document.get('stale'):
                    doc_url = '/'.join([resource_url, path])
                    current_app.logger.info('Fetching %s' % doc_url)
                    try:
                        doc_response = urllib2.urlopen(doc_url)
                        updated_ids.append(initial_insert(doc_response.read(), path, updated, db))
                    except:
                        current_app.logger.info('Failed to fetch %s ' % doc_url)

    updated_ids = filter(lambda x: x, updated_ids)
    db.commit()
    if not len(updated_ids): return
    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        current_app.logger.info('New instruments found, updating (%d)' % len(updated_ids))
        cur.execute("refresh materialized view latest_instruments")
        # analyze the new links

    for updated_id in updated_ids:
        analyze_new_links(get_unprocessed_instrument(updated_id, db=db), db)
    # process the docs

    for updated_id in updated_ids:
        get_instrument_object(updated_id, db=db)

    update_old_versions_es(updated_ids, db=db)
    db.commit()

    # find all ids that are not latest
    # updated_ids
    return



def initial_insert(xml_text, doc_path, updated, db):
    from util import safe_date, get_title


    version = int(float(doc_path.split('/')[-2]))
    doc_type = doc_path.split('/')[0]
    document_id = None
    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        try:
            tree = etree.fromstring(xml_text, parser)

            attrib = tree.attrib
            if attrib.get('id'):
                title = get_title(tree)
                title = title.replace('\n', '').strip()

                query = """INSERT INTO instruments (id, govt_id, version, title, path, number, date_as_at,date_assent, type,
                        date_first_valid, date_gazetted, date_terminated, date_imprint, year, repealed, in_amend,
                        pco_suffix, raised_by, official, subtype, terminated, stage, date_signed, imperial, instructing_office, attributes)
                    VALUES (%(id)s, %(govt_id)s, %(version)s, %(title)s, %(path)s, %(number)s, %(date_as_at)s,%(date_assent)s, %(type)s,
                        %(date_first_valid)s, %(date_gazetted)s, %(date_terminated)s, %(date_imprint)s,
                        %(year)s, %(repealed)s, %(in_amend)s, %(pco_suffix)s, %(raised_by)s, %(official)s, %(subtype)s,
                        %(terminated)s, %(stage)s, %(date_signed)s, %(imperial)s, %(instructing_office)s, %(attr)s); """

                cur.execute(""" INSERT INTO documents (document, type, updated) VALUES (%(document)s, 'xml', %(updated)s) returning id""",
                        {'document': xml_text,
                        'updated': updated})

                document_id = cur.fetchone()['id']

                values = {
                    'id': document_id,
                    'govt_id': attrib.get('id'),
                    'title': title,
                    'version': version,
                    'path': doc_path,
                    'number': attrib.get('sr.no', attrib.get('sop.no', attrib.get('act.no', attrib.get('bill.no')))),
                    'date_first_valid': safe_date(attrib.get('date.first.valid')),
                    'date_gazetted': safe_date(attrib.get('date.date_gazetted')),
                    'date_terminated': safe_date(attrib.get('date.terminated')),
                    'date_imprint': safe_date(attrib.get('date.imprint')),
                    'date_as_at': safe_date(attrib.get('date.as.at')),
                    'date_assent': safe_date(attrib.get('date.assent')),
                    'year': int(attrib.get('year')),
                    'repealed': attrib.get('terminated') == "repealed",
                    'in_amend': attrib.get('in.amend') != 'false',
                    'pco_suffix': attrib.get('pco.suffix'),
                    'raised_by': attrib.get('raised.by'),
                    'official': attrib.get('official'),
                    'type': doc_type,
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
            log.error(e, path)
    return document_id


if __name__ == "__main__":
    if not len(sys.argv) > 1:
        raise Exception('Missing configuration file')
    sys.path.append(os.getcwd())
    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
    import sys
    from os import path
    sys.path.append( path.dirname( path.dirname( path.abspath(__file__) ) ) )
    from acts import queries
    import server
    #logging.basicConfig(filename='update_legislation.log', level=logging.INFO)
    logging.basicConfig(filename=config.UPDATE_LEGISLATION_LOG_FILE, level=logging.INFO)
    db = psycopg2.connect(
            database=config.DB,
            user=config.DB_USER,
            host=config.DB_HOST,
            password=config.DB_PW)
    db.set_client_encoding('utf8')
    with server.app.test_request_context():
        run(db, config)