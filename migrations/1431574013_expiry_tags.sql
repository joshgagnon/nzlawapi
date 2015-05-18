alter table definitions add column expiry_tags text[];
update definitions set expiry_tags = ARRAY[expiry_tag];
alter table definitions drop column expiry_tag;