DROP INDEX def_id_dx;


CREATE INDEX def_document_id_dx
  ON definitions
  USING btree
  (document_id);

 CREATE INDEX def_id_dx
  ON definitions
  USING btree
  (id);