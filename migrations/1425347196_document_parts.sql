ALTER TABLE documents ADD COLUMN skeleton JSON;

CREATE TABLE document_parts (
	document_id integer,
	num integer,
	data text,
	widths json
);

ALTER TABLE document_parts ADD CONSTRAINT document_parts_fk FOREIGN KEY (document_id)
  REFERENCES documents (id) MATCH SIMPLE
  ON UPDATE NO ACTION ON DELETE CASCADE;

CREATE INDEX document_parts_id_idx ON document_parts (document_id);
CREATE INDEX document_parts_num_idx ON document_parts (num);
