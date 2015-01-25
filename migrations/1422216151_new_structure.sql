ALTER TABLE documents ADD COLUMN contents TEXT;

CREATE TABLE instruments (
	id INTEGER,
	govt_id TEXT,
	version INTEGER,
	type TEXT,
	title text,
	path text,
	number INTEGER,
	date_first_valid date,
	date_as_at date,
	date_assent date,
	date_gazetted date,
	date_terminated date,
	date_imprint date,
	year integer,
	repealed boolean default false
);
ALTER TABLE instruments ADD CONSTRAINT instrument_fk FOREIGN KEY(id) REFERENCES documents;

INSERT INTO instruments (id, govt_id, version, type, title, path, number, date_first_valid, date_as_at, date_assent, year, repealed)
	SELECT document_id, source_id, version, 'act', title, path, number ,date_first_valid, date_as_at, date_assent, year, repealed from acts;

INSERT INTO instruments (id, govt_id, version, type, title, path, number, date_first_valid, date_as_at, date_gazetted, date_terminated, date_imprint, year, repealed)
	SELECT document_id, source_id, version, 'regulation', title, path, number ,date_first_valid, date_as_at, date_gazetted,
		date_terminated, date_imprint, year, repealed from regulations;

DROP TABLE id_lookup;

CREATE TABLE id_lookup (
	parent_id INTEGER,
	govt_id TEXT,
	repr TEXT
);


ALTER TABLE id_lookup ADD CONSTRAINT lookup_fk FOREIGN KEY(parent_id) REFERENCES documents;
ALTER TABLE id_lookup  ADD CONSTRAINT id_lookup_uniq UNIQUE(parent_id, govt_id);


CREATE TABLE resources (
	id TEXT,
	value BYTEA
);

CREATE TABLE document_references (
	source_id INTEGER,
	target_id INTEGER,
	count INTEGER DEFAULT 0
);
ALTER TABLE document_references ADD CONSTRAINT ref_src_fk FOREIGN KEY(source_id) REFERENCES documents;
ALTER TABLE document_references ADD CONSTRAINT ref_tar_fk FOREIGN KEY(target_id) REFERENCES documents;

