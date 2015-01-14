CREATE TABLE act_references (
	source_id integer,
	target_id integer,
	mapper text,
	count integer
);
alter table act_references add constraint act_ref_pk primary key (source_id, target_id, mapper);
alter table act_references add constraint act_ref_fk foreign key (source_id) references acts(id);

CREATE TABLE regulation_references (
	source_id integer,
	target_id integer,
	mapper text,
	count integer
);
alter table regulation_references add constraint reg_ref_pk primary key (source_id, target_id, mapper);
alter table regulation_references add constraint reg_ref_fk foreign key (source_id) references regulations(id);

CREATE TABLE case_references (
	source_id integer,
	target_id integer,
	mapper text,
	count integer
);

alter table case_references add constraint case_ref_pk primary key (source_id, target_id, mapper);
alter table case_references add constraint case_ref_fk foreign key (source_id) references cases(id);