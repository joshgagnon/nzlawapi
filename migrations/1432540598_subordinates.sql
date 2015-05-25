alter table subordinates drop column parent_id;
alter table subordinates add column parent_id text;
create index subordinate_parent_idx on subordinates(parent_id);