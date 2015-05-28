create table published_views(
	publish_id SERIAL primary key,
	user_id integer,
	state text,
	html text,
	time timestamp with time zone
);

SELECT pg_catalog.setval(pg_get_serial_sequence('published_views', 'publish_id'), 10000) FROM published_views;
