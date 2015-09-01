create table comlaw_info(
	id text primary key,
	series text,
	superseded boolean,
	prepared_date  date,
	published_date  date,
	start_date date,
	end_date  date,
	links text[]
);