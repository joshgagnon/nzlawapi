CREATE INDEX instr_id_dx ON instruments  (id);
CREATE INDEX cases_id_dx ON cases  (id);
CREATE INDEX def_id_dx ON definitions  (document_id);
CREATE INDEX docrefs_id_dx ON document_references (source_id);
CREATE INDEX docreft_id_dx ON document_references (target_id);
CREATE INDEX idlookup_id_dx ON id_lookup (parent_id);