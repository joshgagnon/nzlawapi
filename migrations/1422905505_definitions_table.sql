DROP VIEW latest_instruments CASCADE;


CREATE VIEW latest_instruments AS
	SELECT i.*, document, processed_document FROM instruments  i
	JOIN  (SELECT govt_id, max(version) as version FROM instruments GROUP BY govt_id) s ON s.govt_id = i.govt_id and i.version = s.version
	JOIN documents d on d.id = i.id;

ALTER TABLE documents DROP COLUMN definitions;

CREATE TABLE definitions (
document_id integer,
key text,
data json
);

ALTER TABLE definitions ADD CONSTRAINT def_FK FOREIGN KEY(document_id) REFERENCES documents;

ALTER TABLE definitions ADD PRIMARY KEY (document_id, key);

CREATE VIEW titles AS
	SELECT trim(title) as name, id, type  from latest_instruments
	UNION
	SELECT trim(full_citation) as name, id, 'case' as type from cases;