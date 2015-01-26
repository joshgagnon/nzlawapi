CREATE VIEW titles AS
	SELECT trim(title) as name, id, type  from latest_instruments
	UNION
	SELECT trim(full_citation) as name, id, 'case' as type from cases;

