CREATE TABLE user_logins (
    user_id integer NOT NULL,
    access_hash character varying(255) NOT NULL,
    access_time timestamp(0) without time zone NOT NULL,
    PRIMARY KEY(user_id, access_hash)
);
