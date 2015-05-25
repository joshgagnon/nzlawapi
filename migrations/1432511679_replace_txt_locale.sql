
drop index if exists document_section_references_target_path_idx;

CREATE INDEX document_section_references_target_path_idx ON document_section_references (target_path varchar_pattern_ops);

drop index if exists x2_id_dxx;
drop index if exists instruments_title_idx;
CREATE INDEX instruments_title_idx ON instruments (title varchar_pattern_ops);
