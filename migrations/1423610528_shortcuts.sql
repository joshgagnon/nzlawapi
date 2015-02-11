CREATE TABLE shortcuts (
	document_id integer,
	title text,
	query text,
	find text,
	type text
);

ALTER TABLE shortcuts ADD CONSTRAINT shortcut_fk  FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE;