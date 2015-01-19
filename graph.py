from db import get_db
import psycopg2


def get_links(centre_id):
    with get_db().cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # TODO: Move this result set builder to a different function
        # This makes a result set including act X and every act or regulation it points to
        query = """
            SELECT id, title, year, 'act' AS type, CONCAT('act_', id) AS name, 0 AS inbound FROM acts
            WHERE id = %(id)s
            UNION ALL
            SELECT id, title, year, 'act' AS type, CONCAT('act_', id) AS name, 0 AS inbound FROM acts a
            JOIN act_references f ON (f.target_id = a.id AND f.mapper = 'act')
            WHERE f.source_id = %(id)s
            UNION ALL
            SELECT id, title, year, 'regulation' AS type, CONCAT('regulation_', id) AS name, 0 AS inbound FROM regulations r
            JOIN act_references f ON (f.target_id = r.id AND f.mapper = 'regulation')
            WHERE f.source_id = %(id)s;
        """
        cur.execute(query, {'id': centre_id})
        collection = cur.fetchall()

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
