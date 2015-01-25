ALTER TABLE documents ADD COLUMN mapper text;
UPDATE documents SET mapper = 'instrument';
DROP TABLE case_references;
DROP TABLE act_references;
DROP TABLE regulation_references;


ALTER TABLE cases DROP CONSTRAINT cases_pkey;
ALTER TABLE cases DROP COLUMN id;

ALTER TABLE cases DROP COLUMN document_id;
ALTER TABLE cases add COLUMN id integer;

ALTER TABLE cases ADD CONSTRAINT id_fk FOREIGN KEY(id) REFERENCES documents;

