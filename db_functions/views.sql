

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
    i.instructing_office, i.number, document, processed_document, skeleton, heights, contents, coalesce(g.count, 0)+1 as generation,
    coalesce(c.children, 0) as children,
    coalesce(r.count, 0) as refs,
    ((case when (i.title like '%Amendment%' or i.title like '%Order%' or i.title like '%Notice%') and g.count = 1 then 1 else 0 END) +
    (case when i.type = 'sop' then 1 else 0 END) +

    coalesce(g.count, 0))

    as base_score, -- total hack while we fixed missing links

    (i.type = 'bill' and bill_enacted) as bill_enacted
    FROM instruments i
    JOIN newest n on n.id = i.id
    JOIN documents d on d.id = i.id
    LEFT OUTER JOIN subordinate_depth() g on g.child_id = i.id
    LEFT OUTER JOIN child_count() c  on c.parent_id = i.id
    LEFT OUTER JOIN (select govt_id, true as bill_enacted from instruments l where l.type = 'act' or  l.type = 'regulation' group by govt_id) sub on i.govt_id = sub.govt_id
    LEFT OUTER JOIN ( select count(*), target_id from document_references join newest i on i.id = source_id group by target_id) r on r.target_id = i.id;



CREATE OR REPLACE FUNCTION get_processed_instrument(id integer)
    RETURNS TABLE(title text, latest boolean, id integer, govt_id text, version integer, type text, date_first_valid date, date_as_at date, stage text,
                date_assent date, date_gazetted date, date_terminated date, date_imprint date, year integer, repealed boolean, attributes json, in_amend boolean,
                pco_suffix text, raised_by text, sub_type text, terminated text, date_signed date, imperial boolean, official text, path text, instructing_office text, number text,
                processed_document text,
                skeleton text,
                heights json
                )
    AS $$
    SELECT title, exists(select 1 from latest_instruments i where i.id=$1), i.id, i.govt_id, i.version, i.type,  i.date_first_valid, i.date_as_at, i.stage,
    i.date_assent, i.date_gazetted, i.date_terminated, i.date_imprint, i.year , i.repealed,
    i.attributes, i.in_amend, i.pco_suffix, i.raised_by, i.subtype, i.terminated, i.date_signed, i.imperial, i.official, i.path,
    i.instructing_office, i.number,
    processed_document, skeleton, heights
    FROM instruments i
    JOIN documents d on i.id = d.id
    WHERE i.id = $1
$$ LANGUAGE SQL;


CREATE OR REPLACE FUNCTION get_unprocessed_instrument(id integer)
    RETURNS TABLE(title text, latest boolean, id integer, govt_id text, version integer, type text, date_first_valid date, date_as_at date, stage text,
                date_assent date, date_gazetted date, date_terminated date, date_imprint date, year integer, repealed boolean, attributes json, in_amend boolean,
                pco_suffix text, raised_by text, sub_type text,terminated text,  date_signed date, imperial boolean, official text, path text, instructing_office text, number text,
                document text
                )
    AS $$
    SELECT title, exists(select 1 from latest_instruments i where i.id=$1), i.id, i.govt_id, i.version, i.type,  i.date_first_valid, i.date_as_at, i.stage,
    i.date_assent, i.date_gazetted, i.date_terminated, i.date_imprint, i.year , i.repealed,
    i.attributes, i.in_amend, i.pco_suffix, i.raised_by, i.subtype, i.terminated, i.date_signed, i.imperial, i.official, i.path,
    i.instructing_office, i.number,
    document
    FROM instruments i
    JOIN documents d on i.id = d.id
    WHERE i.id = $1
$$ LANGUAGE SQL;


CREATE OR REPLACE FUNCTION parent_definitions(id integer)
    RETURNS setof definitions
    AS $$
    WITH RECURSIVE graph(parent_id, child_id )
        AS (
          SELECT parent_id, child_id
          FROM subordinates
          WHERE child_id = $1
          UNION ALL
          SELECT t.parent_id, t.child_id
          FROM graph p
          JOIN subordinates t
          ON p.parent_id = t.child_id
        )
        SELECT document_id, words, html, priority, full_word, expiry_tag, id
            FROM definitions d join graph g ON d.document_id = g.parent_id where document_id is not null
$$ LANGUAGE SQL;


CREATE OR REPLACE FUNCTION get_references(id integer)
    RETURNS TABLE (id integer, title text, count integer, type text)
    AS $$
    SELECT d.source_id as id, title, count, type FROM document_references d
    JOIN latest_instruments i on i.id = d.source_id
    WHERE target_id = $1
    ORDER BY count DESC
$$ LANGUAGE SQL;


CREATE OR REPLACE FUNCTION get_section_references(govt_ids text[])
    RETURNS TABLE (source_document_id integer, repr text, url text)
    AS $$
          SELECT source_document_id, source_repr, source_url
            FROM section_references  d
            JOIN latest_instruments i on d.source_document_id = i.id
            WHERE target_govt_id = ANY($1) ORDER by source_repr
$$ LANGUAGE SQL;


CREATE OR REPLACE FUNCTION get_versions(id integer)
    RETURNS TABLE (id integer, title text, date_as_at date, version integer, number text )
    AS $$
    select i.id, i.title, i.date_as_at, i.version, i.number from
        (select id, govt_id from instruments) as s
        join instruments i on i.govt_id = s.govt_id
        where s.id = $1 order by i.date_as_at desc
$$ LANGUAGE SQL;


CREATE OR REPLACE VIEW titles AS
    SELECT title as name, id, type, 'full' as find, null as query, year, generation, children, refs, base_score from latest_instruments i where (i.terminated is null or i.terminated = '')
    UNION
    SELECT full_citation as name, id, 'case' as type, 'full' as find, null as query, null as year, 1 as generation, 0 as children, 0 as refs, 0 as base_score  from cases
    UNION
    SELECT title as name, document_id, type, find, query, 10000 as year, 1 as generation, 10000 as children,  10000 as refs, 10000 as base_score  from shortcuts;


-- this function is used to replace link placeholders
-- ie, a link may exist, 'section 2(b)-(c)', that need to be split into s 2(b) and s 2(c), but ranges can only be calculated
-- by processing the target doc, thus the 2 steps
CREATE OR REPLACE FUNCTION replace_references(govt_id text, link_text text, target_paths text[])
    RETURNS void
    AS $$

        INSERT INTO section_references (source_document_id, target_govt_id, source_repr, source_url, link_text, target_path)
    (SELECT r.source_document_id, r.target_govt_id, r.source_repr, r.source_url, r.link_text,  unnest($3) as target_path
        from section_references r where r.target_govt_id=$1 and r.link_text=$2)  ;
        DELETE FROM section_references s where  s.target_govt_id = $1 and s.link_text = $2  and s.target_path is null;
$$ LANGUAGE SQL;