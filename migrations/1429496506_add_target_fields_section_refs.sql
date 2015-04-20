alter table section_references rename column repr TO source_repr;
alter table section_references rename column url TO source_url;

alter table section_references add column target_path text;
alter table section_references add column link_text text;
