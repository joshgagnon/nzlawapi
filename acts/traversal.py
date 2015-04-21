from util import CustomException, levenshtein
from db import get_db
from operator import itemgetter
import re
from lxml import etree
from utils import text_to_num


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
    pattern = re.compile('(schedule|section|sch|clause|rule|part|subpart|ss|s|r|cl)[, ]{,2}(.*)')
    part_pattern = re.compile('([a-z\d]+),? ?(subpart|clause|rule|section|ss|s|cl|r)?')
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

    except IndexError, e:
        raise CustomException("Path not found")
    return find_sub_node(tree, keys)


def find_sub_node(tree, keys):
    """depth first down the tree matching labels in keys"""
    node = tree
    xpath_query = ".//*[not(self::part) and not(self::subpart) and not(ancestor::amend) and not(ancestor::end)][%s]"
    #xpath_query = "//*[self::prov or self::schedule or self::subprov][%s]"
    depth = lambda x: len(list(x.iterancestors('prov', 'subprov', 'schedule')))
    shallowest = lambda nodes: nodes[0] if len(node) == 1 else sorted(map(lambda x: (x, depth(x)), nodes), key=itemgetter(1))[0][0]

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
                        tag = start.tag
                        #tree_iter = next(start.iterancestors(tags=['part', 'schedule', 'body'])).iter(tag=tag)
                        tree_iter = tree.iter(tag)
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
                        nodes.append(get_closest(node, xpath_query % label(add.strip())))
                node = nodes
            if i < len(keys) - 1:
                #get shallowist nodes
                node = sorted(map(lambda x: (x, depth(x)), node), key=itemgetter(1))[0][0]
            else:
                #if last part, get all equally shallow results (so far, good enough)
                # nodes = sorted(map(lambda x: (x, depth(x)), node), key=itemgetter(1))
                # node = [x[0] for x in nodes if x[1] == nodes[0][1] and x[0].tag == nodes[0][0].tag]
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


def link_to_canonical(string, debug=False):
    tags = ['schedule','section','part','subpart','subsection']
    string = unicode(string, 'utf-8').replace(u"\u00A0", u' ')
    # remove newlines
    string = re.sub('\r?\n', ' ', string)
    # strip long brackets
    string = re.sub('\([^)]{5,}\)', '', string).strip()
    # replace of this act
    string = re.sub('of this Act ', '', string)
    clean_tail = lambda s: re.sub(r'(,|and|to|or)$', r'', s, flags=re.I).strip()
    # remove any 'of the blah blah'
    string = re.split(r'(to|of)\sthe', string, flags=re.I)[0]
    # replace words with numbers
    string = text_to_num.replace_number(string)
    # of this:  we can't know the specific location, must use other information
    string = re.sub('of this (schedule|section|part|subpart|subsection)', '', string).strip()
    # remove multi spaces
    string = re.sub(' +',' ', string)

    # reorder clause
    swap = re.compile('of\s(schedule|section|part|subpart|subsection)(.*)', flags=re.I)
    swap_match = swap.search(string)
    remainders = []
    while swap_match:
        remainders.insert(0, string[:swap_match.span()[0]])
        string = swap_match.group(1)+swap_match.group(2).rstrip()
        swap_match = swap.search(string)
    if len(remainders):
        rem = ''.join(remainders)
        string += rem if rem.startswith('(') and string not in tags else ' '+rem
    # if supposed to be part of next link, ie "blah or section"

    string = re.sub(r'or\s(section|part|schedule|subsection)$', r'', string, flags=re.I)

    # dont care about anythin after ' of ' or ' to the '
    of_pattern = re.compile('[A-Z0-9 ](of|to the) ')
    of_matches = of_pattern.search(string)
    if of_matches:
        string = string[:of_matches.span(1)[0]]
    while string != clean_tail(string):
        string = clean_tail(string)
    string = re.split(r'row\s[\d+]?', string, flags=re.I)[0]
    string = re.sub(r'^subsections?', r's', string, flags=re.I)
    string = re.sub(r'subsections?', r'', string, flags=re.I)
    string = re.sub(r'sections?', r's', string, flags=re.I)

    if re.compile('(schedule|sch) .*, (part|subpart|table).*', flags=re.I).match(string):
        string = re.sub(', ?', ' ', string)

    start = re.compile('^(schedule|section|sch|clause|rule|part|subpart|ss|s|r|cl)s?\s', flags=re.I)

    if not start.match(string):
        string = 's '+string
    else:
        string = re.sub(r'^ss?', r's', string, flags=re.I)
        string = re.sub(r'subparts?', r'subpart', string, flags=re.I)
        string = re.sub(r'parts?', r'part', string, flags=re.I)
        string = re.sub(r'sections?', r's', string, flags=re.I)
        string = re.sub(r'schedules?', r'sch', string, flags=re.I)
        string = re.sub(r'clauses?', r'cl', string, flags=re.I)
        string = re.sub(r'rules?', r'r', string, flags=re.I)
    string = re.sub(r' ?,? and ', r'+', string, flags=re.I)
    string = re.sub(r' to ', r'-', string, flags=re.I)
    string = re.sub(r' ?,? or ', r'+', string, flags=re.I)
    string = re.sub(r' ?, ?', r'+', string, flags=re.I)

    # collapse brackets
    string = re.sub('([A-Z\d)]) +\(', '\\1(', string)
    return string.strip()


def decide_govt_or_path(tree, govt_id, string, nodes_by_id=None):
    if not nodes_by_id:
        govt_node = tree.xpath('.//*[@id]')[0]
    else:
        govt_node = nodes_by_id[govt_id]

    path = link_to_canonical(string)
    # test if simple schedule, part or section string
    simple_match = re.compile('^(s|part|sch) [^a-z()+-]+')
    if simple_match.match(path):
        return [govt_node]

    start_location = govt_node.getparent()
    this_match = re.compile('of this (section|part|schedule|clause)')
    if this_match.search(string):
        start_location = govt_node


    print string
    print govt_node
    # first 'hack', if govt_id is part, and string starts with 's ', replace
    if nodes_by_id[govt_id].tag == 'part' and path.startswith('s '):
        path = re.sub('^s ', 'part ', path)
    print path
    try:
        nodes = nodes_from_path_string(start_location, path)
    except Exception, e:
        nodes = [govt_node]
        print 'error'
    print nodes


