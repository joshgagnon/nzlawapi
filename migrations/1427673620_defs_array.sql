ALTER TABLE definitions DROP COLUMN word;
ALTER TABLE definitions ADD COLUMN words text[];
