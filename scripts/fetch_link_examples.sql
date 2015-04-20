WITH newest AS (
        SELECT i.govt_id, id, true as root FROM instruments i
        JOIN  (SELECT govt_id, max(version) as version FROM instruments GROUP BY govt_id) s ON s.govt_id = i.govt_id and i.version = s.version
)
select regexp_replace(link_text, E'[\\n\\r]+', ' ', 'g' ) from (select * from section_references  s where random() < 0.01 limit 1000) q


JOIN (select l.govt_id, parent_id as target_id  from id_lookup l join newest n on n.id = l.parent_id) qq on qq.govt_id = q.target_govt_id
WHERE
NOT EXISTS
        (
        SELECT  govt_id
        FROM    newest r
        WHERE   r.govt_id = q.target_govt_id
        )

GROUP BY link_text;