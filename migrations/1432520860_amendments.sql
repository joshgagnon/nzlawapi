CREATE TABLE amendments (
	source_govt_id text,
	target_document_id integer,
	unknown_source_text text,
	note_id text,
	amendment_date date
);

ALTER TABLE amendments
  ADD CONSTRAINT amendments_target_id_fk FOREIGN KEY (target_document_id)
      REFERENCES documents (id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE CASCADE;

CREATE INDEX amendments_idx on amendments (target_document_id);
CREATE INDEX amendments_govt_idx on amendments (source_govt_id);