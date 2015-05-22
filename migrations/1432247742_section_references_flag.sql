alter table section_references drop column target_path;
alter table section_references drop column target_document_id;
create sequence section_ref_seq;
alter table section_references add column link_id integer primary key default nextval('section_ref_seq');

create table document_section_references(
	link_id integer,
	target_path text,
	target_govt_id text,
	target_document_id integer
);

ALTER TABLE document_section_references  ADD CONSTRAINT document_section_refs_link_id_fk FOREIGN KEY(link_id) REFERENCES section_references  ON DELETE CASCADE;
ALTER TABLE document_section_references  ADD CONSTRAINT document_section_refs_target_doc_id_fk FOREIGN KEY(target_document_id) REFERENCES documents  ON DELETE CASCADE;
CREATE INDEX document_section_references_target_idx ON document_section_references (target_govt_id);