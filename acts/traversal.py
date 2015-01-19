from lxml import etree
from util import tohtml, CustomException, levenshtein
from db import get_db
from operator import itemgetter


def cull_tree(nodes):
    [n.attrib.update({'current': 'true'}) for n in nodes]

    all_parents = set()
    [all_parents.update(list(x.iterancestors()) + [x]) for x in nodes]

    def test_inclusion(node, current):
        inclusion = node == current or node.tag in ['label', 'heading', 'cover', 'text']
        if not inclusion and node.tag == 'crosshead':
            # is the crosshead the first previous one?
            try:
                inclusion = node == current.itersiblings(tag='crosshead', preceding=True).next()
            except StopIteration:
                pass
        return inclusion or node in all_parents

    def fix_parents(node):
        while node.getparent() is not None:
            parent = node.getparent()
            to_remove = filter(lambda x: not test_inclusion(x, node), parent.getchildren())
            [parent.remove(x) for x in to_remove]
            node = parent
    [fix_parents(n) for n in nodes]
    return nodes[0].getroottree()


def generate_range(string):
    tokens = string.split('-')
    #do stuff
    return tokens


def find_sub_node(tree, keys):
    node = tree
    try:
        for i, a in enumerate(keys):
            if a:
                #if '-' in :
                #    a = " or ".join(["label = '%s'" % x for x in generate_range(a)])
                if '+' in a:

                    #a = "label = ('%s')" % "','".join(a.split('+'))
                    a = " or ".join(["label = '%s'" % x for x in a.split('+')])
                else:
                    a = "label = '%s'" % a
                node = node.xpath(".//*[not(self::part) and not(self::subpart)][%s]" % a)
            if i < len(keys) - 1:
                #get shallowist nodes
                node = sorted(map(lambda x: (x, len(list(x.iterancestors()))), node), key=itemgetter(1))[0][0]
            else:
                #if last part, get all equally shallow results
                nodes = sorted(map(lambda x: (x, len(list(x.iterancestors()))), node), key=itemgetter(1))
                node = [x[0] for x in nodes if x[1] == nodes[0][1]]
        if not len(node):
            raise CustomException("Empty")
        return node
    except Exception:
        raise CustomException("Path not found")


def find_part_node(tree, query):
    #todo add path test
    keys = query.split('/')
    tree = tree.xpath(".//part[label='%s']" % keys[0])
    keys = keys[1:]
    if len(keys):
        tree = tree[0]
    return find_sub_node(tree, keys)


def find_schedule_node(tree, query):
    #todo add schedule test
    keys = query.split('/')
    tree = tree.xpath(".//schedule[label='%s']" % keys[0])
    keys = keys[1:]
    if len(keys):
        tree = tree[0]
    return find_sub_node(tree, keys)


def find_section_node(tree, query):
    keys = query.split('/')
    tree = tree.xpath(".//body")[0]
    return find_sub_node(tree, keys)


def find_definitions(tree, query):
    nodes = tree.xpath(".//def-para[descendant::def-term[contains(.,'%s')]]" % query)
    if not len(nodes):
        raise CustomException("Path for definition not found")
    return nodes


def find_definition(tree, query):
    try:
        nodes = tree.xpath(".//def-para/para/text/def-term[contains(.,'%s')]" % query)
        lev_nodes = sorted(map(lambda x: (x, levenshtein(query, x.text)), nodes), key=itemgetter(1))
        return lev_nodes[0][0].iterancestors(tag='def-para').next()
    except Exception, e:
        print e
        raise CustomException("Path for definition not found")


def find_title_by_id(node_id, db=None):
    with (db or get_db()).cursor() as cur:
        try:
            query = """
            select a.title from documents d
            join acts a on a.document_id = d.id
            join id_lookup i on i.parent_id = a.source_id and i.mapper = 'acts'
            where i.id = %(node_id)s
            order by version desc
            limit 1; """
            cur.execute(query, {'node_id': node_id})
            return cur.fetchone()[0]
        except Exception, e:
            print e
            raise CustomException("Result not found")


def find_node_by_query(tree, query):
    try:
        return tree.xpath(".//*[contains(.,'%s')]" % query)
    except Exception, e:
        print e
        raise CustomException("Path not found")


def get_references_for_ids(ids):
    with get_db().cursor() as cur:
        query = """ select id, title from
            (select parent_id, mapper from id_lookup where id = ANY(%(ids)s)) as q
            join acts a on a.id = q.parent_id and q.mapper = 'acts' group by id, title """
        cur.execute(query, {'ids': ids})
        return {'references': cur.fetchall()}