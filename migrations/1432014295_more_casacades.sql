
ALTER TABLE section_references DROP  CONSTRAINT section_references_fk ;
ALTER TABLE section_references ADD CONSTRAINT section_references_fk  FOREIGN KEY(source_document_id) REFERENCES documents (id) ON DELETE CASCADE;


ALTER TABLE subordinates DROP  CONSTRAINT sub_chi_fk  ;
ALTER TABLE subordinates ADD CONSTRAINT sub_chi_fk  FOREIGN KEY(child_id) REFERENCES documents (id) ON DELETE CASCADE;

ALTER TABLE subordinates DROP  CONSTRAINT sub_par_fk  ;
ALTER TABLE subordinates ADD CONSTRAINT sub_par_fk  FOREIGN KEY(parent_id) REFERENCES documents (id) ON DELETE CASCADE;
