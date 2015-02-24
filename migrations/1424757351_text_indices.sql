create extension pg_trgm;
create index instrument_name_gin on instruments using gin (title gin_trgm_ops);
create index case_name_gin on cases using gin (full_citation gin_trgm_ops);
create index shortcut_name_gin on shortcuts using gin (title gin_trgm_ops);