CREATE MATERIALIZED VIEW newest as
    SELECT id, s.govt_id FROM instruments i
        JOIN  (SELECT govt_id, max(version) as version FROM instruments GROUP BY govt_id) s ON s.govt_id = i.govt_id and i.version = s.version;

CREATE UNIQUE INDEX newest_view_idx ON newest (id);
CREATE INDEX newest_view_govt_idx ON newest (govt_id);

CREATE MATERIALIZED VIEW reference_counts as
 select s.source_document_id, d.target_document_id as target_document_id, count(d.link_id) as count
 from document_section_references d
 join section_references s on d.link_id = s.link_id
 group by d.target_document_id, s.source_document_id;

CREATE INDEX reference_counts_idx ON reference_counts (target_document_id);


CREATE OR REPLACE FUNCTION subordinate_depth()
    RETURNS TABLE (child_id integer, count integer)
    AS $$
    WITH RECURSIVE graph(parent_id, child_id, count)
        AS (
          SELECT null::integer, child_id, 0 as count
          FROM subordinates s where parent_id is null
          UNION ALL
          SELECT n.id, t.child_id ,count+1
          FROM graph p
          JOIN newest n on p.child_id = n.id
          JOIN subordinates t on n.govt_id = t.parent_id
        )
        SELECT child_id, max(count) as count from graph g group by (child_id);
$$ LANGUAGE SQL;


CREATE OR REPLACE FUNCTION child_count()
    RETURNS TABLE (parent_id integer, children integer)
    AS $$

    WITH RECURSIVE graph(parent_id, child_id)
        AS (
          SELECT n.id, child_id
          FROM subordinates s
          JOIN newest n on s.parent_id = n.govt_id
          UNION ALL
          SELECT n.id, t.child_id
          FROM graph p
          JOIN subordinates t ON p.parent_id = t.child_id
       JOIN newest n on t.parent_id = n.govt_id

        )
    select parent_id, count(distinct child_id)::integer as children from graph group by parent_id

$$ LANGUAGE SQL;

CREATE MATERIALIZED VIEW scores as
    SELECT id,
    coalesce(r.count, 0) as refs,
    coalesce(g.count, 0) as base_score,
    (i.type = 'bill' and bill_enacted) as bill_enacted
    from instruments i
    LEFT OUTER JOIN subordinate_depth() g on g.child_id = i.id
    LEFT OUTER JOIN (select govt_id, true as bill_enacted from instruments l where l.type = 'act' or  l.type = 'regulation' group by govt_id) sub on i.govt_id = sub.govt_id
    LEFT OUTER JOIN ( select count(count), r.target_document_id from reference_counts r join newest n on r.source_document_id = n.id group by r.target_document_id ) r on r.target_document_id = i.id;


CREATE UNIQUE INDEX scores_idx ON scores (id);


CREATE VIEW latest_instruments AS
    SELECT title, i.id, i.govt_id, i.version, i.type,  i.date_first_valid, i.date_as_at, i.stage,
    i.date_assent, i.date_gazetted, i.date_terminated, i.date_imprint, i.year , i.repealed,
    i.attributes, i.in_amend, i.pco_suffix, i.raised_by, i.subtype, i.terminated, i.date_signed, i.imperial, i.official, i.path,
    i.instructing_office, i.number, document, processed_document, skeleton, heights, contents,
    refs,
    base_score,
    bill_enacted
    FROM instruments i
    JOIN newest n on n.id = i.id
    JOIN documents d on d.id = i.id
    JOIN scores s on n.id = s.id;




CREATE OR REPLACE FUNCTION get_processed_instrument(id integer)
    RETURNS TABLE(title text, latest boolean, id integer, govt_id text, version integer, type text, date_first_valid date, date_as_at date, stage text,
                date_assent date, date_gazetted date, date_terminated date, date_imprint date, year integer, repealed boolean, attributes json, in_amend boolean,
                pco_suffix text, raised_by text, sub_type text, terminated text, date_signed date, imperial boolean, official text, path text, instructing_office text, number text,
                processed_document text,
                skeleton text,
                heights json
                )
    AS $$
    SELECT title, exists(select 1 from newest i where i.id=$1), i.id, i.govt_id, i.version, i.type,  i.date_first_valid, i.date_as_at, i.stage,
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
    SELECT title, exists(select 1 from newest i where i.id=$1), i.id, i.govt_id, i.version, i.type,  i.date_first_valid, i.date_as_at, i.stage,
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
    WITH RECURSIVE graph(parent_id, child_id)
        AS (
          SELECT n.id, child_id
          FROM subordinates s
          JOIN newest n on s.parent_id = n.govt_id
          WHERE child_id = $1
          UNION ALL
          SELECT n.id, t.child_id
          FROM graph p
          JOIN subordinates t ON p.parent_id = t.child_id
          JOIN newest n on t.parent_id = n.govt_id
        )
        SELECT document_id, words, html,  full_word, id,  expiry_tags, priority
            FROM definitions d join graph g ON d.document_id = g.parent_id where document_id is not null
$$ LANGUAGE SQL;


CREATE OR REPLACE FUNCTION get_references(document_id integer)
    RETURNS TABLE (id integer, title text, count bigint, type text)
    AS $$
    BEGIN
        RETURN QUERY  select i.id, i.title, r.count, i.type
            FROM reference_counts r
            JOIN instruments i on r.source_document_id = i.id
            JOIN newest n on n.id = i.id
            WHERE target_document_id =  $1 and i.id != $1 order by count desc;

        END
  $$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_section_references(target_document_id integer, govt_ids text[], target_path text)
    RETURNS TABLE (source_document_id integer, repr text, url text)
    AS $$
    BEGIN
        RETURN QUERY SELECT s.source_document_id, source_repr, source_url
            FROM section_references  s
            JOIN newest i on s.source_document_id = i.id
            JOIN document_section_references d on d.link_id = s.link_id
            WHERE d.target_document_id = $1 and
            (
            (array_length($2, 1)> 0 and d.target_govt_id = ANY($2))
            or
            (d.target_path like ($3||'%') and d.target_path ~ ($3||'(\(.*)?$')
            )
            )  GROUP BY s.source_document_id, source_repr, source_url ORDER by source_repr;
        END
  $$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_versions(id integer)
    RETURNS TABLE (id integer, title text, date_as_at date, version integer, number text )
    AS $$
    select i.id, i.title, i.date_as_at, i.version, i.number from
        (select id, govt_id from instruments) as s
        join instruments i on i.govt_id = s.govt_id
        where s.id = $1 order by i.date_as_at desc
$$ LANGUAGE SQL;


CREATE OR REPLACE VIEW titles AS
    SELECT title as name, i.id, type, 'full' as find, null as query, year, refs, base_score
      from latest_instruments i where (i.terminated is null or i.terminated = '')
    UNION
    SELECT full_citation as name, id, 'case' as type, 'full' as find, null as query, null as year, 0 as refs, 0 as base_score  from cases
    UNION
    SELECT title as name, document_id, type, find, query, 10000 as year,   10000 as refs, 10000 as base_score  from shortcuts;


CREATE OR REPLACE FUNCTION update_views()
  RETURNS void
  AS $$
  REFRESH MATERIALIZED VIEW newest;
  REFRESH MATERIALIZED VIEW reference_counts;
  REFRESH MATERIALIZED VIEW scores;
$$ LANGUAGE SQL;
