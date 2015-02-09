ALTER TABLE instruments ADD COLUMN attributes json;


ALTER TABLE instruments ADD COLUMN in_amend boolean;
ALTER TABLE instruments ADD COLUMN pco_suffix text;
ALTER TABLE instruments ADD COLUMN raised_by text;
ALTER TABLE instruments ADD COLUMN offical text;
ALTER TABLE instruments ADD COLUMN subtype text;
ALTER TABLE instruments ADD COLUMN terminated text;
ALTER TABLE instruments ADD COLUMN stage text;
ALTER TABLE instruments ADD COLUMN date_signed date;
ALTER TABLE instruments ADD COLUMN imperial boolean;
ALTER TABLE instruments ADD COLUMN instrucing_office text;
