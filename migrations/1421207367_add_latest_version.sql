ALTER TABLE acts ADD COLUMN latest_version BOOLEAN;
ALTER TABLE acts ADD CONSTRAINT lt_act_uniq UNIQUE(source_id, latest_version);

ALTER TABLE regulations ADD COLUMN latest_version BOOLEAN;
ALTER TABLE regulations ADD CONSTRAINT lt_reg_uniq UNIQUE(source_id, latest_version);


UPDATE acts a SET latest_version = TRUE
FROM (select source_id, max(version) as v from acts group by source_id) j
WHERE j.source_id = a.source_id and j.v = a.version;

UPDATE regulations a SET latest_version = TRUE
FROM (select source_id, max(version) as v from regulations group by source_id) j
WHERE j.source_id = a.source_id and j.v = a.version;