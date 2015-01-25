
CREATE INDEX govt_id_idx ON instruments (govt_id);

CREATE VIEW latest_instruments AS
	SELECT i.*, d.processed_document, document, definitions, contents FROM instruments  i
	JOIN  (SELECT govt_id, max(version) as version FROM instruments GROUP BY govt_id) s ON s.govt_id = i.govt_id and i.version = s.version
	JOIN documents d on d.id = i.id;
