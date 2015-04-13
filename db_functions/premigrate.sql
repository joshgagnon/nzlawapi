DROP MATERIALIZED VIEW IF EXISTS latest_instruments CASCADE;
DROP FUNCTION IF EXISTS parent_definitions(integer);

DROP FUNCTION IF EXISTS get_unprocessed_instrument(integer);
DROP FUNCTION IF EXISTS get_references(integer);
DROP FUNCTION IF EXISTS get_section_references(text[]);
DROP FUNCTION IF EXISTS get_versions(integer);

DROP  VIEW IF EXISTS titles;