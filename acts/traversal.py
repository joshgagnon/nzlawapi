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


def get_number(string):
    print string
    match = re.compile('[^\d]*(\d+)/*$').match(string)
    if match:
        return match.groups(1)

tag_names = {
    'sch': 'schedule',
    'schedule': 'schedule',
    'part': 'part',
    'subpart': 'subpart'
}

def nodes_from_path_string(tree, path):
    path = path.lower().strip()
    pattern = re.compile('(schedule|section|sch|clause|rule|part|subpart|s|r|cl)[, ]{,2}(.*)')
    part_pattern = re.compile('([a-z\d]+),? ?(subpart|clause|rule|section|s|cl|r)?')
    parts = pattern.match(path)
    keys = []
    try:
        if parts:
            parts = parts.groups()
            if any([parts[0].startswith(k) for k in tag_names.keys()]):
                # match up 'cl ' or 's ', 'section ' or 'clause ' then until '('
                label = '1'
                remainder = parts[1].strip()
                if remainder: # and not re.compile('(s|sch|cl|clause)').match(remainder):
                    sub = part_pattern.match(remainder).groups()
                    # sub[0] is the sch/part label
                    label = sub[0]
                    remainder = remainder[len(label):].strip()
                tree = tree.xpath(".//%s[label='%s' or label='%s']" % (tag_names[parts[0]], label, label.upper()))[0]
                return nodes_from_path_string(tree, remainder.replace(',', '').strip())
            else:
                if isinstance(tree, etree._ElementTree) or tree.getroottree().getroot() == tree:
                    tree = tree.xpath(".//body")[0]
            if parts[1]:
                _keys = map(lambda x: x.strip(), filter(lambda x: len(x), re.split('[^.a-zA-Z\d\+\- ]+', parts[1])))
                # join on + -
                i = 0
                keys = []
                while i < len(_keys):
                    if i and _keys[i] in ['+', '-']:
                        keys[-1] += _keys[i] + _keys[i+1]
                        i += 2
                    else:
                        keys.append(_keys[i])
                        i += 1
        print keys
    except IndexError, e:
        raise CustomException("Path not found")
    return find_sub_node(tree, keys)


def find_sub_node(tree, keys):
    """depth first down the tree matching labels in keys"""
    node = tree
    xpath_query = ".//*[not(self::part) and not(self::subpart) and not(ancestor::amend) and not(ancestor::end)][%s]"
    depth = lambda x: len(list(x.iterancestors('prov', 'subprov', 'schedule')))
    shallowest = lambda nodes: sorted(map(lambda x: (x, depth(x)), nodes), key=itemgetter(1))[0][0]
    def get_closest(node, path):
        while True:
            try:
                return shallowest(node.xpath(path))
            except IndexError:
                node = node.getparent()
                if node is None or not len(node):
                    raise StopIteration()

    def label(string):
        return "label[normalize-space(.) = '%s'] or label[normalize-space(.) = '%s']" % (string, string.upper())
    try:
        for i, a in enumerate(keys):
            if a:
                adds = a.split('+')
                nodes = []
                for add in adds:
                    if '-' in add:
                        # we can't assume any reasonable lexicographical ordering of labels, so instead
                        # find first match and continue until last
                        labels = [label(x.strip()) for x in add.split('-')]
                        # get first node
                        start = get_closest(node, xpath_query % labels[0])
                        last = get_closest(node, xpath_query % labels[1])
                        start_depth = depth(start)
                        tag = start.tag
                        tree_iter = tree.iter(tag=tag)
                        nodes.append(start)
                        current = None
                        while True:
                            current = next(tree_iter)
                            if current == start:
                                break
                        while True:
                            current = next(tree_iter)
                            nodes.append(current)
                            if current == last:
                                break
                        # find every tag that matches depth, until we match last
                    else:
                        matches = nodes.append(get_closest(node, xpath_query % label(add.strip())))
                node = nodes
            if i < len(keys) - 1:
                #get shallowist nodes
                node = sorted(map(lambda x: (x, depth(x)), node), key=itemgetter(1))[0][0]
            else:
                #if last part, get all equally shallow results (so far, good enough)
                #nodes = sorted(map(lambda x: (x, depth(x)), node), key=itemgetter(1))
                #node = [x[0] for x in nodes if x[1] == nodes[0][1] and x[0].tag == nodes[0][0].tag]
                node = nodes
        if not len(keys):
            node = [node]
        if not len(node):
            raise CustomException("Empty")
        return node
    except (IndexError, StopIteration, AttributeError), e:
        raise CustomException("Path not found")


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


