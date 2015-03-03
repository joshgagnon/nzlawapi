ALTER TABLE documents ADD COLUMN widths JSON;
ALTER TABLE document_parts DROP COLUMN widths;