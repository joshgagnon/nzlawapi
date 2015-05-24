# -*- coding: utf-8 -*-
import re
from xml.dom import minidom
from db import get_db
from util import Monitor, node_replace, MatchError, remove_nbsp, generate_path_string, get_path, large_parser
from traversal import decide_govt_or_path
from lxml import etree
from psycopg2 import extras
from copy import deepcopy
from collections import defaultdict
import logging
from flask import current_app


def add_new_ids(tree, document_id, title, db=None):
    """ add the new ids to the id look up """
    id_results = []
    db = db or get_db()
    with db.cursor() as cur:
        for el in tree.xpath('//*[@id]'):
            new_id = el.attrib.get('id')
            id_results.append((new_id, document_id, generate_path_string(el, title=title)[0]))
        args_str = ','.join(cur.mogrify("(%s,%s,%s)", x) for x in id_results)
        cur.execute("INSERT INTO id_lookup(govt_id, parent_id, repr) VALUES " + args_str)
    db.commit()


def get_all_ids(db=None):
    """ find every id, so we know what document a link refers to """
    db = db or get_db()
    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur:
        result_to_dict = lambda r: (r['govt_id'], r['parent_id'])
        cur.execute("""SELECT i.govt_id, parent_id from id_lookup i join latest_instruments l on i.parent_id = l.id
            """)
        return dict(map(result_to_dict, cur.fetchall()))


def safe_target(el):
    """ try to get the target id, in priority order """
    try:
        return el.attrib.get('href') or el.get('targetXmlId') or el.xpath('resourcepair')[0].attrib.get('targetXmlId')
    except:
        return el.attrib.get('id', None)

def remove_ignored_tags(tree):
    """ optimization to skip elements we aren't interested in """
    tree = deepcopy(tree)
    tags_to_remove = ['history-note', 'end', 'skeleton', 'amend', 'schedule.amendments', 'insertwords', 'amend.in']
    for el in tree.iter(*tags_to_remove):
        el.getparent().remove(el)
    return tree


def get_links(db=None):
    class InstrumentLink(object):
        use_life_cycle = False

        def __init__(self):
            self.active = {}
            self.id_to_title = {}
            self.regex = None

        def add(self, title, id):
            self.active[unicode(title.decode('utf-8'))] = {'id': id, 'title': title}
            self.id_to_title[id] = unicode(title.decode('utf-8'))

        def ordered(self):
            return sorted(self.active.keys(), key=lambda x: len(x), reverse=True)

        def combined_reg(self):
            match_string = u"(^|\W)(%s)s?($|\W)" % u"|".join(map(lambda x: re.escape(x), self.ordered()))
            return re.compile(match_string, flags=re.I & re.UNICODE)

        def get_regex(self):
            if not self.regex:
                self.regex = self.combined_reg()
            return self.regex

        def get_active(self, key):
            if key not in self.active:
                raise MatchError()
            return self.active[key]

    query = """ select title, govt_id as id from latest_instruments """

    with (db or get_db()).cursor() as cur:
        cur.execute(query)
        results = cur.fetchall()
        links = InstrumentLink()
        map(lambda x: links.add(x[0], x[1]), results)

    return links


def find_references(tree, document_id, title, id_lookup):
    """ find and source all external references """
    links = map(lambda x: {'id': safe_target(x),
        'text': etree.tostring(x, method="text", encoding="UTF-8"),
        'path': generate_path_string(x, title=title)},
        tree.xpath('.//*[@href]|.//link[resourcepair]'))
    section = map(lambda x: (document_id, x['id'], x['path'][0], x['path'][1], x['text']), [l for l in links if id_lookup.get(l['id'])])
    return section


def process_instrument_links(tree, db=None, links=None):
    """ this is the only function in this file that modifies the tree, it finds strings that look like instruments
        and makes them into links """
    links = links or get_links(db)
    mon = Monitor()
    for a in tree.xpath('.//*[@href]'):
        a.attrib['link-id'] = '%d' % mon.i
        mon.cont()

    def create_link(doc, word, result, index):
        match = doc.createElement('cataref')
        match.setAttribute('href', 'instrument/%s' % result['id'])
        match.setAttribute('target-id', '%s' % result['id'])
        match.setAttribute('link-id', '%s' % mon.i)
        match.appendChild(doc.createTextNode(word))
        return match

    domxml = minidom.parseString(remove_nbsp(etree.tostring(tree, method="html", encoding="UTF-8")))
    domxml = node_replace(domxml, links, create_link, monitor=mon)
    tree = etree.fromstring(domxml.toxml(), parser=large_parser)
    domxml.unlink()
    # next find every link to this doc, replace links
    return tree


def find_parent_instrument(tree, document_id, title, id_lookup, titles):
    """ amendments etc should have a 'parent' instrument that they inherit definitions from """
    ids = []
    if any([test in title for test in ['Amendment', 'Rules', 'Regulations']]):
        principal_els = []
        pursuant = tree.xpath('.//pursuant')
        if len(pursuant):
            principal_els.append((pursuant[0], etree.tostring(pursuant[0], method="text", encoding="UTF-8")))
        else:
            # see if there is a 'is called the principal Act'
            text_pairs = map(lambda x: (x, etree.tostring(x, method="text", encoding="UTF-8")), tree.xpath('.//text'))

            for t in text_pairs:
                if any([phrase in t[1].lower() for phrase in [
                    "an act to amend the",
                    "this act amends the",
                    "these regulations amend the",
                    "these rules amends ",
                    "principal act",
                    "principal regulations"]]):
                    principal_els.append(t)
                    if 'principal' in t[1].lower():
                        break
        for el in tree.xpath('.//prov[heading[contains(., "Principal Act") or contains(., "Principal Regulation")]]'):
            principal_els.append((el, etree.tostring(el, method="text", encoding="UTF-8")))
        for el in tree.xpath('.//leg-title[contains(., "to amend")]'):
            principal_els.append((el, etree.tostring(el, method="text", encoding="UTF-8")))
        try:
            if len(principal_els):
                for el, text in principal_els:
                    links = el.xpath('.//link[resourcepair]|.//*[@href]')
                    for link in links:
                        ids += [id_lookup[safe_target(link)] for link in links]
                    else:
                        ids += [titles.get_active(x[1])[0] for x in titles.get_regex().findall(text)]
        except (KeyError, IndexError):
            pass
        ids = list(set([i for i in ids if i != document_id and titles.id_to_title.get(i) != title]))
    return ids


def reparse_link_texts(tree, target_id, target_govt_id, source_id=None, db=None):
    """ find links whose href is misrepresented by its text """
    """ ie, "section 2(e) and 3(b)(i)"" will be default only point to s 2 """
    inserts = []
    db = db or get_db()
    with db.cursor(cursor_factory=extras.RealDictCursor, name="link_cursor") as cur:
        if source_id:
            cur.execute("""select * from id_lookup i join section_references s on i.govt_id = s.target_govt_id and source_document_id=%(source_id)s where parent_id = %(id)s;
                """, {'id': target_id, 'govt_id': target_govt_id, 'source_id': source_id})
        else:
            cur.execute("""select * from id_lookup i join section_references s on i.govt_id = s.target_govt_id where parent_id = %(id)s;
                """, {'id': target_id, 'govt_id': target_govt_id})
        refs = cur.fetchall()
        memo = {}
        if len(refs):
            current_app.logger.info('%d refs for id %d' % (len(refs), target_id))
            nodes_by_id = {x.attrib['id']: x for x in tree.findall('.//*[@id]')}

            for ref in refs:
                try:
                    paths = []
                    if (ref['target_govt_id'], ref['link_text']) in memo:
                        paths = memo[(ref['target_govt_id'], ref['link_text'])]

                    else:
                        nodes = decide_govt_or_path(tree, ref['target_govt_id'], ref['link_text'], nodes_by_id=nodes_by_id)
                        if len(nodes) > 1 or nodes[0] != nodes_by_id[ref['target_govt_id']]:
                            paths = [get_path(n) for n in nodes]
                    memo[(ref['target_govt_id'], ref['link_text'])] = paths
                    if len(paths):
                        for p in paths:
                            inserts.append(cur.mogrify("""INSERT INTO document_section_references (link_id, target_path, target_govt_id, target_document_id)
                                    VALUES (%(link_id)s, %(target_path)s, %(target_govt_id)s, %(target_document_id)s)""",
                                    {'link_id': ref['link_id'], 'target_path': p, 'target_govt_id': ref['target_govt_id'], 'target_document_id': target_id} ))
                    else:
                        inserts.append(cur.mogrify("""INSERT INTO document_section_references (link_id, target_path, target_govt_id, target_document_id)
                                    VALUES (%(link_id)s, %(target_path)s, %(target_govt_id)s, %(target_document_id)s)""",
                                     {'link_id': ref['link_id'], 'target_path': None, 'target_govt_id': ref['target_govt_id'], 'target_document_id': target_id} ))



                except Exception, e:
                    current_app.logger.debug(e)
    return inserts



def reparse_link_text(tree, document_id, db=None):
    inserts, deletes = reparse_link_textss(tree, document_id, db)
    if len(inserts):
        with db.cursor() as cur:
            for insert in inserts:
                cur.excute(insert)
            for delete in deletes:
                cur.execute(delete)
        db.commit()


def fix_cycles(db=None):
    """ remove cycles from relationship heirarchy, just to be safe """
    db = db or get_db()
    # find and remove cycles
    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        query = """
            WITH RECURSIVE search_graph(child_id, parent_id, depth, path, cycle) AS (
                SELECT g.child_id, g.parent_id, 1,
                  ARRAY[g.child_id],
                  false
                FROM subordinates g
              UNION ALL
                SELECT g.child_id, g.parent_id, sg.depth + 1,
                  path || g.child_id,
                  g.child_id = ANY(path)
                FROM subordinates g, search_graph sg
                WHERE g.child_id = sg.parent_id AND NOT cycle )

            SELECT distinct child_id, parent_id, year FROM search_graph g join instruments on id = child_id where cycle = true order by year limit 1; """

        rm_query = """delete from subordinates where child_id = %(child_id)s and parent_id = %(parent_id)s"""
        while True:
            cur.execute(query)
            results = cur.fetchall()
            if len(results):
                current_app.logger.info('removing cycle', dict(results[0]))
                cur.execute(rm_query, results[0])
            else:
                break
    db.commit()


def analyze_new_links(row, db=None):
    db = db or get_db()
    document_id = row.get('id')
    # clean up refs
    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        #cur.execute(""" delete from document_section_references where source_document_id = %(document_id)s""",
        #            {'document_id': document_id})
        cur.execute(""" delete from section_references where source_document_id = %(document_id)s""",
                    {'document_id': document_id})
        cur.execute(""" delete from id_lookup where parent_id = %(document_id)s""",
                    {'document_id': document_id})

    title = unicode(row['title'].decode('utf-8'))
    tree = etree.fromstring(row['document'], parser=large_parser)
    tree = remove_ignored_tags(tree)
    add_new_ids(tree, document_id, title, db)
    id_lookup = get_all_ids(db)
    links = get_links(db)
    section_refs = find_references(tree, document_id, title, id_lookup)

    parent_ids = find_parent_instrument(tree, document_id, title, id_lookup, links)
    if len(parent_ids):
        with db.cursor() as out:
            args_str = ','.join(out.mogrify("(%s, %s)", (x, document_id)) for x in parent_ids)
            out.execute("INSERT INTO subordinates (parent_id, child_id) VALUES " + args_str)

    if title != 'Interpretation Act 1999':  # lol
        with db.cursor() as out:
            # i really don't like this, think of a better way
            out.execute("""
                INSERT INTO subordinates (parent_id, child_id) values
                    ((select id as parent_id from instruments where title = 'Interpretation Act 1999' AND version = 19), %(child_id)s)
                """, {'child_id': document_id})

    with db.cursor() as out:
        if len(section_refs):
            args_str = ','.join(out.mogrify("(%s,%s,%s,%s, %s)", x) for x in section_refs)
            out.execute("INSERT INTO section_references (source_document_id, target_govt_id, source_repr, source_url, link_text) VALUES " + args_str)

    db.commit()

    inserts = []

    # documents to scan to find true targets
    documents_ids_scan = [x for x in list(set(map(lambda x: id_lookup.get(x[1]), section_refs))) if x]
    inserts += reparse_link_texts(tree, document_id, row.get('govt_id'), db=db)
    for id_scan in documents_ids_scan:
        with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute('select document, govt_id from instruments i join documents d on i.id = d.id where i.id = %(id)s', {'id': id_scan})
            row_to_scan = cur.fetchone()
            tree_to_scan = etree.fromstring(row_to_scan['document'], parser=large_parser)
            inserts += reparse_link_texts(tree_to_scan, id_scan, row_to_scan.get('govt_id'), source_id=document_id, db=db)

    current_app.logger.info('inserting %d links' % len(inserts))
    with db.cursor() as out:
        for insert in inserts:
            out.execute(insert)

    fix_cycles(db)

