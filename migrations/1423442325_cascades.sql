ALTER TABLE cases DROP CONSTRAINT id_fk;
ALTER TABLE cases ADD CONSTRAINT id_fk FOREIGN KEY(id) REFERENCES documents ON DELETE CASCADE;


ALTER TABLE id_lookup  DROP CONSTRAINT lookup_fk;
ALTER TABLE id_lookup ADD CONSTRAINT lookup_fk  FOREIGN KEY (parent_id) REFERENCES documents (id) ON DELETE CASCADE;

ALTER TABLE document_references DROP CONSTRAINT ref_src_fk;
ALTER TABLE document_references ADD CONSTRAINT ref_src_fk  FOREIGN KEY (source_id) REFERENCES documents (id) ON DELETE CASCADE;

ALTER TABLE document_references DROP CONSTRAINT ref_tar_fk;
ALTER TABLE document_references ADD CONSTRAINT ref_tar_fk  FOREIGN KEY (target_id) REFERENCES documents (id) ON DELETE CASCADE;

ALTER TABLE instruments DROP  CONSTRAINT instrument_fk;
ALTER TABLE instruments ADD CONSTRAINT instrument_fk FOREIGN KEY(id) REFERENCES documents ON DELETE CASCADE;

ALTER TABLE definitions DROP  CONSTRAINT def_fk;
ALTER TABLE definitions ADD CONSTRAINT def_fk FOREIGN KEY(document_id) REFERENCES documents (id) ON DELETE CASCADE;