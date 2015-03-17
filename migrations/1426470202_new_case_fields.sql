ALTER TABLE cases ADD COLUMN judgment_date date;
ALTER TABLE cases ADD COLUMN location text;
ALTER TABLE cases ADD COLUMN jurisdiction text;
ALTER TABLE cases ADD COLUMN appearances text;
ALTER TABLE cases ADD COLUMN aliases text[];