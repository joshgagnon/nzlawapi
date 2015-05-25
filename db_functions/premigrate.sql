DROP MATERIALIZED VIEW IF EXISTS latest_instruments CASCADE;
DROP FUNCTION IF EXISTS parent_definitions(integer);
DROP FUNCTION IF EXISTS subordinate_depth();
DROP FUNCTION IF EXISTS child_count();

DROP FUNCTION IF EXISTS get_processed_instrument(integer);
DROP FUNCTION IF EXISTS get_unprocessed_instrument(integer);
DROP FUNCTION IF EXISTS get_references(integer);
DROP FUNCTION IF EXISTS get_section_references(integer, text[],text);
DROP FUNCTION IF EXISTS get_versions(integer);
DROP FUNCTION IF EXISTS replace_references(text, text, text[]);

DROP  VIEW IF EXISTS titles;

DROP INDEX  IF EXISTS mat_view_latest_instuments_idx;
DROP INDEX  IF EXISTS mat_view_latest_instuments_govt_idx;