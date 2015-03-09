CREATE TABLE user_settings (
	user_id integer,
	data json
);

ALTER TABLE user_settings ADD PRIMARY KEY (user_id);


CREATE TABLE error_submissions (
	user_id integer,
	details text,
	state text
);



ALTER TABLE error_submissions ADD CONSTRAINT error_submissions_fk FOREIGN KEY(user_id) REFERENCES user_settings;