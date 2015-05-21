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

    query = """ select title, id from latest_instruments """

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

    counters = defaultdict(int)
    for link in links:
        if link['id'] in id_lookup:
            counters[id_lookup[link['id']]] = counters[id_lookup[link['id']]] + 1
    document = []
    section = []
    if len(counters.items()):
        document = map(lambda x: (document_id, x[0], x[1]), counters.items())
        section = map(lambda x: (document_id, x['id'], x['path'][0], x['path'][1], x['text'], id_lookup[x['id']]), [l for l in links if id_lookup.get(l['id'])])
    return document, section


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


def get_reparse_link_texts(tree, target_id, target_govt_id, db=None):
    """ find links whose href is misrepresented by its text """
    """ ie, "section 2(e) and 3(b)(i)"" will be default only point to s 2 """
    inserts = []
    deletes = []
    db = db or get_db()
    with db.cursor(cursor_factory=extras.RealDictCursor, name="link_cursor") as cur:
    # these group bys significantly help the optimizer, #UPDATE NOT ANY MORE
        cur.execute("""select target_govt_id, link_text
            from section_references s
            where target_document_id =  %(id)s and target_govt_id !=  %(govt_id)s and target_path is null
            group by  target_govt_id, link_text;
            """, {'id': target_id, 'govt_id': target_govt_id})
        refs = cur.fetchall()
        if len(refs):
            nodes_by_id = {x.attrib['id']: x for x in tree.findall('.//*[@id]')}

            for ref in refs:
                link = ref['link_text']
                try:
                    nodes = decide_govt_or_path(tree, ref['target_govt_id'], ref['link_text'], nodes_by_id=nodes_by_id)
                    if len(nodes) > 1 or nodes[0] != nodes_by_id[ref['target_govt_id']]:
                        inserts.append(cur.mogrify("""INSERT INTO section_references (source_document_id, target_govt_id, source_repr, source_url, link_text, target_path, target_document_id)
                            (SELECT r.source_document_id, r.target_govt_id, r.source_repr, r.source_url, r.link_text,  unnest(%(target_paths)s) as target_path, r.target_document_id
                                from section_references r where r.target_govt_id=%(target_govt_id)s and r.link_text=%(link_text)s)""",
                            {'target_govt_id': ref['target_govt_id'], 'link_text': ref['link_text'], 'target_paths': [get_path(n) for n in nodes]}))
                        deletes.append(cur.mogrify("""DELETE FROM section_references s where  s.target_govt_id = %(target_govt_id)s and s.link_text = %(link_text)s  and s.target_path is null""",
                        {'target_govt_id': ref['target_govt_id'], 'link_text': ref['link_text']}))
                except Exception, e:
                    current_app.logger.debug(e)
    return inserts, deletes

def replace_reparse_link_texts(tree, target_id, target_govt_id, section_refs, db=None):
    """ find links whose href is misrepresented by its text """
    """ ie, "section 2(e) and 3(b)(i)"" will be default only point to s 2 """
    inserts = []
    nodes_by_id = {x.attrib['id']: x for x in tree.findall('.//*[@id]')}
    for tuple_ref in section_refs:
        ref = {'source_document_id': tuple_ref[0], 'target_govt_id': tuple_ref[1],
                'source_repr': tuple_ref[2], 'source_url': tuple_ref[3], 'link_text': tuple_ref[4], 'target_document_id': tuple_ref[5]}
        try:
            nodes = decide_govt_or_path(tree, ref['target_govt_id'], ref['link_text'], nodes_by_id=nodes_by_id)
            if len(nodes) > 1 or nodes[0] != nodes_by_id[ref['target_govt_id']]:
                for n in nodes:
                    inserts.append((tuple_ref[0], tuple_ref[1], tuple_ref[2], tuple_ref[3], get_path(n), tuple_ref[5]))
            else:
                inserts.append(tuple_ref)
        except Exception, e:
            current_app.logger.debug(e)
    return inserts


def reparse_link_text(tree, document_id, db=None):
    inserts, deletes = get_reparse_link_textss(tree, document_id, db)
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
                logging.info('removing cycle', dict(results[0]))
                cur.execute(rm_query, results[0])
            else:
                break
    db.commit()


def analyze_new_links(row, db=None):
    db = db or get_db()
    document_id = row.get('id')
    # clean up refs
    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        cur.execute(""" delete from document_references where source_id = %(document_id)s""",
                    {'document_id': document_id})
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
    document_refs, section_refs = find_references(tree, document_id, title, id_lookup)
    logging.info('found refs: %d %d' % (len(document_refs), len(section_refs)))
    if len(document_refs):
        with db.cursor() as out:
            args_str = ','.join(out.mogrify("(%s,%s,%s)", x) for x in document_refs)
            out.execute("""INSERT INTO document_references (source_id, target_id, count) VALUES """ +
                        args_str)

    parent_ids = find_parent_instrument(tree, document_id, title, id_lookup, links)
    logging.info('parents: %s', ','.join(parent_ids) or 'None')
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
    inserts = []
    # documents to scan to find true targets
    documents_ids_scan = map(lambda x: x[1], document_refs)
    for id_scan in documents_ids_scan:
        with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute('select document, govt_id from instruments i join documents d on i.id = d.id where i.id = %(id)s', {'id': id_scan})
            row_to_scan = cur.fetchone()
            tree_to_scan = etree.fromstring(row_to_scan['document'], parser=large_parser)
            refs = filter(lambda x: x[5] == id_scan, section_refs)
            inserts += replace_reparse_link_texts(tree_to_scan, id_scan, row_to_scan.get('govt_id'), refs, db=db)

    logging.info('inserting %d links' % len(inserts))
    if len(inserts):
        with db.cursor() as out:
            args_str = ','.join(out.mogrify("(%s,%s,%s,%s, %s, %s)", x) for x in inserts)
            out.execute("""INSERT INTO section_references (source_document_id, target_govt_id,
                source_repr, source_url, link_text, target_document_id) VALUES """ + args_str)
    fix_cycles(db)




