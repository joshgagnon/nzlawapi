CREATE TABLE subordinates (
parent_id integer,
child_id integer
);


ALTER TABLE subordinates  ADD CONSTRAINT sub_par_fk FOREIGN KEY(parent_id) REFERENCES documents;
ALTER TABLE subordinates  ADD CONSTRAINT sub_chi_fk FOREIGN KEY(child_id) REFERENCES documents;

