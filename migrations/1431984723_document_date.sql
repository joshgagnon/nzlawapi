alter table documents add column updated timestamp with time zone;
update documents set updated = TIMESTAMP WITH TIME ZONE '2015-05-10 00:00:00 +12:00';