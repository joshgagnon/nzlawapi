CREATE TABLE section_references(
	source_document_id integer,
	target_govt_id text
);

ALTER TABLE section_references ADD CONSTRAINT section_references_fk FOREIGN KEY(source_document_id) REFERENCES documents;
CREATE INDEX section_references_doc_id ON section_references (source_document_id);
CREATE INDEX section_references_govt_id ON section_references (target_govt_id);