from db import get_db
import psycopg2


# TODO: Track this somewhere else, app config maybe?
#       Or concreate classes with methods ie get_table, get_title_field etc.
__article_types = [('act', 'title', 'year'), ('regulation', 'title', 'year'), ('case', 'full_citation', 'judgment')]


# TODO: Use a library that does this properly
def pluralise(word):
    return word + 's'


def get_connected(type, id):
    """Return all articles that have in inbound or outbound reference to the source article.

    Args:
        type: A singular string giving the type of the source article, ie 'act', 'case',
            'regulation' etc.
        id: The id of the source article

    Returns:
        A dict of all articles referring to or referred by the source article
    """
    global __article_types

    with get_db().cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # First get the source article
        query = """
            SELECT id, title, CAST(year AS text), %(type)s AS type FROM {0}
            WHERE id = %(source_id)s
        """.format(pluralise(type))

        parameters = {
            'type': type,
            'source_id': id,
        }

        # Get all articles referred to by outbound links
        # TODO: per above, better way of getting table/fieldnames
        for article_type, title_field, date_field in __article_types:
            query += """
                UNION ALL
                SELECT id, {0}, CAST({1} AS text), mapper AS type FROM {2} o
                JOIN {3} r ON (r.target_id = o.id AND r.mapper = %({4}_type)s)
                WHERE r.source_id = %(source_id)s
            """.format(title_field, date_field, pluralise(article_type), type + '_references', article_type)
            parameters[article_type + '_type'] = article_type

        # Get all articles that refer to the source (inbound links)
        for article_type, title_field, date_field in __article_types:
            query += """
                UNION ALL
                SELECT id, {0}, CAST({1} AS text), %({4}_type)s AS type FROM {2} o
                JOIN {3} r ON (r.source_id = o.id AND r.mapper = %(type)s)
                WHERE r.target_id = %(source_id)s
            """.format(title_field, date_field, pluralise(article_type), article_type + '_references', article_type)

        # Filter any duplicates
        query = 'SELECT * FROM (' + query + ') AS results GROUP BY id, type, title, year'

        cur.execute(query, parameters)
        return cur.fetchall()


# TODO: Merge this and get_all_links properly
def get_links(collection, touching=None):
    # Prep collection with extra keys required to build graph
    for result in collection:
        result['name'] = '{}_{}'.format(result['type'], result['id'])
        result['inbound'] = 0

    if touching is None:
        return get_all_links(collection)

    central = filter(lambda r: r['type'] == touching['type'] and int(r['id']) == int(touching['id']), collection)[0]

    # Outbound links
    query = """
        SELECT CONCAT(%(central_type)s, '_', source_id) AS source_name, CONCAT(mapper, '_', target_id) AS target_name, count
        FROM {0}_references
        WHERE source_id = %(central_id)s
    """.format(central['type'])

    parameters = {
        'central_type': central['type'],
        'central_id': central['id'],
    }

    # Inbound links
    for article_type, _, _ in __article_types:
        query += """
            UNION ALL
            SELECT CONCAT(%({0}_type)s, '_', source_id) AS source_name, CONCAT(%(central_type)s, '_', target_id) AS target_name, count
            FROM {0}_references
            WHERE mapper = %(central_type)s
            AND target_id = %(central_id)s
        """.format(article_type)
        parameters[article_type + '_type'] = article_type

    with get_db().cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(query, parameters)
        links = cur.fetchall()
        for link in links:
            try:
                target_idx = [target['name'] for target in collection].index(link['target_name'])
                for source in collection:
                    if source['name'] == link['source_name']:
                        target_link = dict(index=target_idx, weight=link['count'])
                        collection[target_idx]['inbound'] = link['count']
                        try:
                            source['references'].append(target_link)
                        except KeyError:
                            source['references'] = [target_link]
                        break
            except ValueError:
                # Some targets might not be in our result set due to id collisions between acts/regulations/etc. - ignore them
                pass

    # Ensure there's a references key even if it's empty
    for result in collection:
        if 'references' not in result:
            result['references'] = []

    return collection


def get_all_links(collection):
    with get_db().cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        query = """
            SELECT CONCAT('act_', source_id) AS source_name, CONCAT(mapper, '_', target_id) AS target_name, count FROM act_references
            WHERE source_id IN %(source_acts)s
            AND target_id IN %(targets)s
            UNION ALL
            SELECT CONCAT('regulation_', source_id) AS source_name, CONCAT(mapper, '_', target_id) AS target_name, count FROM regulation_references
            WHERE source_id IN %(source_regulations)s
            AND target_id IN %(targets)s
        """
        cur.execute(query, {
            'source_acts': tuple([result['id'] for result in collection if result['type'] == 'act']),
            'source_regulations': tuple([result['id'] for result in collection if result['type'] == 'regulation']),
            'targets': tuple([result['id'] for result in collection])
        })
        links = cur.fetchall()
        for link in links:
            try:
                target_idx = [target['name'] for target in collection].index(link['target_name'])
                for source in collection:
                    if source['name'] == link['source_name']:
                        target_link = dict(index=target_idx, weight=link['count'])
                        collection[target_idx]['inbound'] += link['count']
                        try:
                            source['references'].append(target_link)
                        except KeyError:
                            source['references'] = [target_link]
                        break
            except ValueError:
                # Some targets might not be in our result set due to id collisions between acts/regulations/etc. - ignore them
                pass

        # Ensure there's a references key even if it's empty
        for result in collection:
            if 'references' not in result:
                result['references'] = []

        return collection
