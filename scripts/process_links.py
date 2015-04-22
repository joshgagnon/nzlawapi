
import psycopg2

import sys
from psycopg2 import extras
import importlib
import os
from lxml import etree
from collections import defaultdict
import re

p = etree.XMLParser(huge_tree=True)

def id_lookup(db):
    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        cur.execute(""" delete from id_lookup""")
    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur, db.cursor() as out:
        cur.execute("""SELECT d.id, title, document FROM instruments i join documents d on i.id = d.id """)
        results = cur.fetchmany(1)
        count = 0
        id_results = []
        while len(results):
            for result in results:
                if count % 10 == 0:
                    print count, len(id_results)
                count += 1
                for el in etree.fromstring(result['document'], parser=p).xpath('//*[@id]'):
                    new_id = el.attrib.get('id')
                    id_results.append( (new_id, result['id'], generate_path_string(el, title=unicode(result['title'].decode('utf-8')))[0]))
            results = cur.fetchmany(1)
            if len(id_results) > 100000:
                args_str = ','.join(cur.mogrify("(%s,%s,%s)", x) for x in id_results)
                out.execute("INSERT INTO id_lookup(govt_id, parent_id, repr) VALUES " + args_str)
                id_results[:] = []

        if len(id_results):
            args_str = ','.join(cur.mogrify("(%s,%s,%s)", x) for x in id_results)
            out.execute("INSERT INTO id_lookup(govt_id, parent_id, repr) VALUES " + args_str)
            id_results[:] = []
    db.commit()


def fix_cycles(db):
    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        # lets make the interpretation act the parent of everything

        cur.execute("""
            INSERT INTO subordinates (parent_id, child_id)
            SELECT
                (select id from instruments where title = 'Interpretation Act 1999' AND version = 19) as parent_id,
                id as child_id  FROM instruments WHERE
                title != 'Interpretation Act 1999'
                """)
        cur.execute("""
            INSERT INTO subordinates (parent_id, child_id)
                (select null as parent_id, id as child_id from instruments where title = 'Interpretation Act 1999' AND version = 19)
                """)
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

                print 'removing cycle', dict(results[0])
                cur.execute(rm_query, results[0])
            else:
                break
    db.commit()


def refs_and_subs(db, do_references, do_subordinates):

    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        if do_references:
            cur.execute(""" delete from document_references""")
            cur.execute(""" delete from section_references""")
        if do_subordinates:
            cur.execute(""" delete from subordinates""")

    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur:
        result_to_dict = lambda r: (r['govt_id'], r['parent_id'])
        cur.execute("""SELECT i.govt_id, parent_id from id_lookup i join latest_instruments l on i.parent_id = l.id """)
        id_lookup = dict(map(result_to_dict, cur.fetchall()))

    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur:
        query = """ select title, id from instruments """
        cur.execute(query)

        titles = {unicode(x['title'].decode('utf-8')): x['id'] for x in cur.fetchall()}
        id_to_title = {v: k for k, v in titles.items()}

        keys = sorted(titles.keys(), key=lambda x: len(x), reverse=True)
        regex = re.compile(u"(^|\W)(%s)($|\W)" % u"|".join(map(lambda x: re.escape(x), keys)), flags=re.I & re.UNICODE)

    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur:
        cur.execute('select count(*) as count from latest_instruments')
        total = cur.fetchone()['count']

    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur, db.cursor() as out:
        count = 0.0
        cur.execute("""SELECT document, d.id, title from instruments i join documents d on i.id = d.id""")
        documents = cur.fetchmany(1)
        while len(documents):
            for document in documents:
                count += 1
                sys.stdout.write("%d%%\r" % (count/total*100))
                tree = etree.fromstring(document['document'], parser=p)
                source_id = document['id']

                # todo, break up processing steps
                if do_references:
                    links = map(lambda x: {'id': x.attrib['href'], 'text': etree.tostring(x, method="text", encoding="UTF-8"),
                        'path': generate_path_string(x, title=unicode(document['title'].decode('utf-8')))},
                        tree.xpath('.//extref[@href][not(ancestor::history-note)]|.//intref[@href][not(ancestor::history-note)]'))
                    counters = defaultdict(int)
                    for link in links:
                        if link['id'] in id_lookup:
                            counters[id_lookup[link['id']]] = counters[id_lookup[link['id']]] + 1
                    if len(counters.items()):
                        flattened = map(lambda x: (source_id, x[0], x[1]), counters.items())
                        args_str = ','.join(cur.mogrify("(%s,%s,%s)", x) for x in flattened)
                        out.execute("INSERT INTO document_references (source_id, target_id, count) VALUES " + args_str)

                        flattened = map(lambda x: (source_id, x['id'], x['path'][0], x['path'][1], x['text'], id_lookup[x['id']]), [l for l in links if id_lookup.get(l['id'])])
                        args_str = ','.join(cur.mogrify("(%s,%s,%s,%s, %s, %s)", x) for x in flattened)
                        out.execute("INSERT INTO section_references (source_document_id, target_govt_id, source_repr, source_url, link_text, target_document_id) VALUES " + args_str)

                if do_subordinates:
                    ids = []
                    pursuant = tree.xpath('.//pursuant[not(ancestor::end)][not(ancestor::skeleton)]')
                    title = unicode(document['title'].decode('utf-8'))
                    if len(pursuant):
                        try:
                            refs = pursuant[0].xpath('.//extref')
                            if len(refs):
                                ids = [id_lookup[ref.attrib['href']] for ref in refs]
                            else:
                                ids = [titles[x[1]] for x in regex.findall(etree.tostring(pursuant[0], method="text", encoding="UTF-8"))]
                            ids = list(set(ids))
                        except KeyError:
                            print refs, document.get('title')
                    else:
                        # see if there is a 'is called the principal Act'
                        rules = ('translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz")', '[not(ancestor::end)][not(ancestor::skeleton)]')
                        principal = tree.xpath('//text[contains(%s, "is called the principal act")]%s' % rules)
                        if not len(principal):
                            principal = tree.xpath('//text[contains(%s, "these regulations amend the")]%s' % rules)
                        if not len(principal):
                            principal = tree.xpath('//text[contains(%s, "an act to amend the")]%s' % rules)
                        if not len(principal):
                            principal = tree.xpath('//text[contains(%s, "this act amends the")]%s' % rules)
                        if not len(principal):
                            principal = tree.xpath('//text[contains(%s, "these regulations amend the")]%s' % rules)
                        if not len(principal):
                            principal = tree.xpath('//text[contains(%s, "this part amends ")]%s' % rules)
                        if not len(principal):
                            principal = tree.xpath('//text[contains(%s, "these parts amends ")]%s' % rules)
                        if not len(principal):
                            principal = tree.xpath('//text[contains(%s, "this section amends ")]%s' % rules)
                        if not len(principal):
                            principal = tree.xpath('//text[contains(%s, "these sections amends ")]%s' % rules)
                        if not len(principal):
                            principal = tree.xpath('//text[contains(%s, "this clause amends ")]%s' % rules)
                        if not len(principal):
                            principal = tree.xpath('//text[contains(%s, "this clauses amends ")]%s' % rules)
                        if not len(principal):
                            principal = tree.xpath('//text[contains(%s, "this schedule amends ")]%s' % rules)
                        if not len(principal):
                            principal = tree.xpath('//text[contains(%s, "these schedules amends ")]%s' % rules)
                        if not len(principal):
                            principal = tree.xpath('//text[contains(%s, "this regulation amends ")]%s' % rules)
                        if not len(principal):
                            principal = tree.xpath('//text[contains(%s, "this rule amends ")]%s' % rules)
                        if not len(principal):
                            principal = tree.xpath('//text[contains(%s, "these rules amends ")]%s' % rules)
                        if not len(principal):
                            principal = tree.xpath('//def-term[contains(%s, "principal act")]%s' % rules)
                        if not len(principal):
                            principal = tree.xpath('//def-term[contains(%s, "principal regulations")]%s' % rules)
                        try:
                            if len(principal):
                                link = principal[0].xpath('./extref|./def-term')
                                if len(link):
                                    link_id = link[0].attrib.get('href') or link[0].attrib.get('id')
                                    ids = [id_lookup[link_id]]
                                else:
                                    ids = [titles[x[1]] for x in regex.findall(etree.tostring(principal[0], method="text", encoding="UTF-8"))]
                        except (KeyError, IndexError):
                            print document.get('title')
                        # 'These regulations amend the'
                    ids = list(set([i for i in ids if i != document.get('id') and id_to_title.get(i) != title]))
                    if len(ids):
                        print document.get('title'), [id_to_title.get(i) for i in ids]
                        args_str = ','.join(cur.mogrify("(%s, %s)", (x, document['id'])) for x in ids)
                        out.execute("INSERT INTO subordinates (parent_id, child_id) VALUES " + args_str)
                    else:
                        if 'Amendment' in document.get('title'):
                            print 'Could not find parent for: ', document.get('title')
            documents = cur.fetchmany(1)
    db.commit()
    fix_cycles(db)


def analyze_links(db):
    from acts import traversal
    with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
        cur.execute('select count(*) as count from latest_instruments')
        total = cur.fetchone()['count']
    with db.cursor(cursor_factory=extras.RealDictCursor, name="law_cursor") as cur, db.cursor(cursor_factory=extras.RealDictCursor) as cur2:

        cur.execute("""SELECT document, id, title, govt_id from latest_instruments""")
        results = cur.fetchmany(10)
        output = []
        count = 0.0
        while len(results):
            for result in results:
                count += 1
                print result['id']
                # these group bys significantly help the opimizer
                cur2.execute("""select target_govt_id, link_text
                    from section_references s
                    where target_document_id =  %(id)s and target_govt_id !=  %(govt_id)s and target_path is null
                    group by  target_govt_id, link_text;
                    """, result)
                refs = cur2.fetchall()
                if not len(refs):
                    continue
                tree = etree.fromstring(result['document'], parser=p)
                for elem in tree.xpath('.//*[self::end or self::amend or self::text or self::history-note]'):
                    elem.getparent().remove(elem)

                nodes_by_id = {x.attrib['id']: x for x in tree.findall('.//*[@id]')}

                for ref in refs:
                    link = ref['link_text']
                    try:
                        nodes = traversal.decide_govt_or_path(tree, ref['target_govt_id'], ref['link_text'], nodes_by_id=nodes_by_id)
                        if len(nodes) > 1 or nodes[0] != nodes_by_id[ref['target_govt_id']]:
                            output.append(cur2.mogrify('select replace_references(%s, %s, %s)', (ref['target_govt_id'], ref['link_text'], [get_path(n) for n in nodes])))
                    except Exception, e:
                        print e
                sys.stdout.write("%d%%\r" % (count/total*100))
                sys.stdout.flush()


            results = cur.fetchmany(10)
    with db.cursor() as out:
        for o in output:
            out.execute(o)
    db.commit()



def run(db, config, do_id_lookup=True, do_references=True, do_subordinates=True, do_links=True):
    if do_id_lookup:
        id_lookup(db)

    if do_references or do_subordinates:
        refs_and_subs(db, do_references, do_subordinates)

    if do_links:
        analyze_links(db)



if __name__ == "__main__":
    if not len(sys.argv) > 1:
        raise Exception('Missing configuration file')
    sys.path.append(os.getcwd())
    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')
    import sys
    from os import path
    sys.path.append( path.dirname( path.dirname( path.abspath(__file__) ) ) )
    from util import generate_path_string, get_path
    db = psycopg2.connect(
            database=config.DB,
            user=config.DB_USER,
            host=config.DB_HOST,
            password=config.DB_PW)
    # poor mans switches
    if False:
        run(db, config,
        do_id_lookup=('skip_ids' not in sys.argv[1:]),
        do_references=('skip_references' not in sys.argv[1:]),
        do_subordinates=('skip_subordinates' not in sys.argv[1:]),
        do_links=('skip_links' not in sys.argv[1:]))

    run(db, config,
        do_id_lookup=False,
        do_references=True,
        do_subordinates=False,
        do_links=True)

    db.close()

