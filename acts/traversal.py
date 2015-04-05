from util import CustomException, levenshtein
from db import get_db
from operator import itemgetter
import re
from lxml import etree

def cull_tree(nodes_to_keep):
    """ Culls nodes that aren't in the direct line of anything in the nodes_to_keep """

    [n.attrib.update({'current': 'true'}) for n in nodes_to_keep]
    all_parents = set()
    [all_parents.update(list(x.iterancestors()) + [x]) for x in nodes_to_keep]

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
    [fix_parents(n) for n in nodes_to_keep]
    return nodes_to_keep[0].getroottree()


def limit_tree_size(tree, nodes=300):
    count = 0
    for t in list(tree.iter()):
        if count > nodes:
            t.getparent().remove(t)
        count += 1
    return tree


def generate_range(string):
    tokens = string.split('-')
    # do stuff
    return tokens


def get_number(string):
    print string
    match = re.compile('.*(\d+)/*$').match(string)
    if match:
        return match.groups()[0]


def nodes_from_path_string(tree, path):
    #todo, rule
    pattern = re.compile('(s|sch|section|schedule|part) +([\.\da-z ]+)\W*(cl )?(.*)?')
    path = path.lower()
    parts = pattern.match(path)
    # actually, maybe easier just to get it in canonical form
    keys = []
    try:
        if parts:
            parts = parts.groups()
            if parts[0].startswith('sch'):
                if parts[1] == '1' or not parts[1] or not parts[1][0].isdigit():
                    tree = tree.xpath(".//schedule")[0]
                    if parts[1].startswith('cl'):
                        keys += [get_number(parts[1])]
                else:
                    key = parts[1].split()[0].strip()
                    tree = tree.xpath(".//schedule[label='%s']" % key)[0]
                    if len(parts[1].split()) > 1 and get_number(parts[1]):
                        keys += [get_number(parts[1])]

            elif parts[0].startswith('part'):
                part_match = re.compile('part (\w)+\W*').match(path)
                tree = tree.xpath(".//part[label='%s']" % part_match.group(1))[0]
                return nodes_from_path_string(tree, path.replace(part_match.group(0), ''))
            else:
                if isinstance(tree, etree._ElementTree) or tree.getroottree().getroot() == tree:
                    tree = tree.xpath(".//body")[0]
                keys.append(parts[1].strip())
            if parts and parts[3]:
                keys += filter(lambda x: len(x), re.split('[^.a-zA-Z\d]+', parts[3]))
        else:
            pattern = re.compile('[\W_]+')
            keys = pattern.sub(' ', path).split()
            if len(keys) and keys[0].startswith('sch'):
                tree = tree.xpath(".//schedule")[0]
                keys = []
    except IndexError, e:
        raise CustomException("Path not found")
    return find_sub_node(tree, keys)


def find_sub_node(tree, keys):
    """depth first down the tree matching labels in keys"""
    node = tree
    try:
        for i, a in enumerate(keys):
            if a:
                # if '-' in :
                #    a = " or ".join(["label = '%s'" % x for x in generate_range(a)])
                if '+' in a:

                    #a = "label = ('%s')" % "','".join(a.split('+'))
                    a = " or ".join(["label = '%s'" % x for x in a.split('+')])
                else:
                    # fuck, starts with is busted
                    a = "label[normalize-space(.) = '%s'] or label[normalize-space(.) = '%s']" % (a, a.upper())
                node = node.xpath(".//*[not(self::part) and not(self::subpart)][%s]" % a)
            if i < len(keys) - 1:
                #get shallowist nodes
                node = sorted(map(lambda x: (x, len(list(x.iterancestors()))), node), key=itemgetter(1))[0][0]
            else:
                #if last part, get all equally shallow results
                nodes = sorted(map(lambda x: (x, len(list(x.iterancestors()))), node), key=itemgetter(1))
                node = [x[0] for x in nodes if x[1] == nodes[0][1]]
        if not len(keys):
            node = [node]
        if not len(node):
            raise CustomException("Empty")
        return node
    except Exception, e:
        print e
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


def find_node_by_location(tree, query):
    return nodes_from_path_string(tree, query)


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


def find_document_id_by_govt_id(node_id, db=None):
    with (db or get_db()).cursor() as cur:
        try:
            query = """
            select a.id from latest_instruments a
            join id_lookup i on i.parent_id = a.id
            where i.govt_id = %(node_id)s """
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


def find_node_by_govt_id(tree, query):
    try:
        return tree.xpath(".//*[@id='%s']" % query)
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


