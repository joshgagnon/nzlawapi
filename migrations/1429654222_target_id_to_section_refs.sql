alter table section_references add column target_document_id integer;

ALTER TABLE section_references  ADD CONSTRAINT section_references_target_fk FOREIGN KEY (target_document_id)
  REFERENCES documents (id) MATCH SIMPLE
  ON UPDATE NO ACTION ON DELETE CASCADE;
CREATE INDEX target_document_id_idx ON section_references  (target_document_id);