

CREATE OR REPLACE FUNCTION subordinate_depth()
    RETURNS TABLE (child_id integer, count integer)
    AS $$
    WITH RECURSIVE graph(parent_id, child_id, count)
        AS (
            SELECT parent_id, child_id, 0 as count
            FROM subordinates where parent_id is null
            UNION ALL
            SELECT t.parent_id, t.child_id ,count+1
            FROM graph p
            JOIN subordinates t
            ON p.child_id = t.parent_id
        )
        SELECT child_id, max(count) as count from graph g group by (child_id);
$$ LANGUAGE SQL;


CREATE OR REPLACE FUNCTION child_count()
    RETURNS TABLE (parent_id integer, children integer)
    AS $$

    WITH RECURSIVE graph(parent_id, child_id)

        AS (
            SELECT parent_id, child_id
            FROM subordinates
            UNION ALL
            SELECT s.parent_id, s.child_id
            FROM graph p
            JOIN subordinates as s ON s.parent_id = p.child_id
        )
    select parent_id, count(distinct child_id)::integer as children from graph group by parent_id

$$ LANGUAGE SQL;

CREATE MATERIALIZED VIEW latest_instruments AS

    WITH newest AS (
            SELECT id FROM instruments i
            JOIN  (SELECT govt_id, max(version) as version FROM instruments GROUP BY govt_id) s ON s.govt_id = i.govt_id and i.version = s.version
    )

    SELECT title, i.id, i.govt_id, i.version, i.type,  i.date_first_valid, i.date_as_at, i.stage,
    i.date_assent, i.date_gazetted, i.date_terminated, i.date_imprint, i.year , i.repealed,
    i.attributes, i.in_amend, i.pco_suffix, i.raised_by, i.subtype, i.terminated, i.date_signed, i.imperial, i.official, i.path,
    i.instructing_office, i.number, document, processed_document, skeleton, heights, contents, coalesce(g.count, 0)+1 as  generation,
    coalesce(c.children, 0) as children,
    coalesce(r.count, 0) as refs,

    ((case when (i.title like '%Amendment%' or i.title like '%Order%') and g.count = 1 then 1 else 0 END) +
    (case when i.type = 'sop' then 1 else 0 END) +


    coalesce(g.count, 0))

    as base_score -- total hack while we fixed missing links


    FROM instruments i
    JOIN newest n on n.id = i.id
    JOIN documents d on d.id = i.id
    LEFT OUTER JOIN subordinate_depth() g on g.child_id = i.id
    LEFT OUTER JOIN child_count() c  on c.parent_id = i.id
    LEFT OUTER JOIN ( select count(*), target_id from document_references join newest i on i.id = source_id group by target_id) r on r.target_id = i.id
    WHERE (i.terminated is null or i.terminated = '');


CREATE OR REPLACE VIEW titles AS
    SELECT title as name, id, type, 'full' as find, null as query, year, generation, children, refs, base_score from latest_instruments
    UNION
    SELECT full_citation as name, id, 'case' as type, 'full' as find, null as query, null as year, 1 as generation, 0 as children, 0 as refs, 0 as base_score  from cases
    UNION
    SELECT title as name, document_id, type, find, query, 10000 as year, 1 as generation, 10000 as children,  10000 as refs, 10000 as base_score  from shortcuts;