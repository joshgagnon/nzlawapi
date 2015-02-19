
DROP VIEW latest_instruments CASCADE;
CREATE OR REPLACE VIEW latest_instruments AS
	SELECT title, i.id, i.govt_id, i.version, i.type,  i.date_first_valid, i.date_as_at,
	i.date_assent, i.date_gazetted, i.date_terminated, i.date_imprint, i.year, i.repealed,
	i.attributes, i.in_amend, i.pco_suffix, i.raised_by, i.subtype, i.terminated, i.date_signed, i.imperial, i.official,
	i.instructing_office, i.number, document, processed_document FROM instruments  i
	JOIN  (SELECT govt_id, max(version) as version FROM instruments GROUP BY govt_id) s ON s.govt_id = i.govt_id and i.version = s.version
	JOIN documents d on d.id = i.id;


CREATE OR REPLACE VIEW titles AS
	SELECT trim(title) as name, id, type, 'full' as find, null as query  from latest_instruments
	UNION
	SELECT trim(full_citation) as name, id, 'case' as type, 'full' as find, null as query from cases
	UNION
	SELECT trim(title) as name, document_id, type, find, query  from shortcuts;