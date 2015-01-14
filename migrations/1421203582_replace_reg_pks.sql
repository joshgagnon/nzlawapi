ALTER TABLE regulations DROP CONSTRAINT regulation_pk;

ALTER TABLE regulations ADD CONSTRAINT regulations_uniq UNIQUE(id, version);

ALTER TABLE regulations RENAME COLUMN id TO source_id;

ALTER TABLE regulations ADD COLUMN id SERIAL;

ALTER TABLE regulations ADD PRIMARY KEY (id);