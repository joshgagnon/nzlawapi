--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: cases; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE cases (
    source_id text NOT NULL,
    neutral_citation text,
    court text[],
    parties json,
    counsel text[],
    full_citation text,
    judgment text,
    hearing text,
    matter json,
    received text,
    charge text,
    plea text,
    waistband text,
    appeal_result json,
    bench text,
    validated boolean DEFAULT false,
    reporter text,
    id integer,
    judgment_date date,
    location text,
    jurisdiction text,
    appearances text,
    aliases text[],
    file_number text
);


--
-- Name: definitions; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE definitions (
    document_id integer NOT NULL,
    key text NOT NULL,
    data json,
    word text
);


--
-- Name: document_parts; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE document_parts (
    document_id integer,
    num integer,
    data text
);


--
-- Name: document_references; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE document_references (
    source_id integer,
    target_id integer,
    count integer DEFAULT 0
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE documents (
    id integer NOT NULL,
    type text,
    document text,
    processed_document text,
    contents text,
    mapper text,
    heights json,
    skeleton text
);


--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE documents_id_seq OWNED BY documents.id;


--
-- Name: error_reports; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE error_reports (
    id text,
    reporter text,
    fields text[],
    details text,
    mapper text NOT NULL
);


--
-- Name: error_submissions; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE error_submissions (
    user_id integer,
    details text,
    state text
);


--
-- Name: id_lookup; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE id_lookup (
    parent_id integer,
    govt_id text,
    repr text
);


--
-- Name: instruments; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE instruments (
    id integer,
    govt_id text,
    version integer,
    type text,
    title text,
    path text,
    date_first_valid date,
    date_as_at date,
    date_assent date,
    date_gazetted date,
    date_terminated date,
    date_imprint date,
    year integer,
    repealed boolean DEFAULT false,
    attributes json,
    in_amend boolean,
    pco_suffix text,
    raised_by text,
    subtype text,
    terminated text,
    stage text,
    date_signed date,
    imperial boolean,
    official text,
    instructing_office text,
    number text
);


--
-- Name: latest_instruments; Type: MATERIALIZED VIEW; Schema: public; Owner: -; Tablespace: 
--

CREATE MATERIALIZED VIEW latest_instruments AS
 SELECT i.title,
    i.id,
    i.govt_id,
    i.version,
    i.type,
    i.date_first_valid,
    i.date_as_at,
    i.stage,
    i.date_assent,
    i.date_gazetted,
    i.date_terminated,
    i.date_imprint,
    i.year,
    i.repealed,
    i.attributes,
    i.in_amend,
    i.pco_suffix,
    i.raised_by,
    i.subtype,
    i.terminated,
    i.date_signed,
    i.imperial,
    i.official,
    i.path,
    i.instructing_office,
    i.number,
    d.document,
    d.processed_document,
    d.skeleton,
    d.heights,
    d.contents
   FROM ((instruments i
     JOIN ( SELECT instruments.govt_id,
            max(instruments.version) AS version
           FROM instruments
          GROUP BY instruments.govt_id) s ON (((s.govt_id = i.govt_id) AND (i.version = s.version))))
     JOIN documents d ON ((d.id = i.id)))
  WITH NO DATA;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE migrations (
    name text
);


--
-- Name: resources; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE resources (
    id text,
    value bytea
);


--
-- Name: section_references; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE section_references (
    source_document_id integer,
    target_govt_id text,
    repr text,
    url text
);


--
-- Name: shortcuts; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE shortcuts (
    document_id integer,
    title text,
    query text,
    find text,
    type text
);


--
-- Name: titles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW titles AS
 SELECT latest_instruments.title AS name,
    latest_instruments.id,
    latest_instruments.type,
    'full'::text AS find,
    NULL::text AS query,
    latest_instruments.year
   FROM latest_instruments
UNION
 SELECT cases.full_citation AS name,
    cases.id,
    'case'::text AS type,
    'full'::text AS find,
    NULL::text AS query,
    NULL::integer AS year
   FROM cases
UNION
 SELECT shortcuts.title AS name,
    shortcuts.document_id AS id,
    shortcuts.type,
    shortcuts.find,
    shortcuts.query,
    10000 AS year
   FROM shortcuts;


--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE user_settings (
    user_id integer NOT NULL,
    data json
);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY documents ALTER COLUMN id SET DEFAULT nextval('documents_id_seq'::regclass);


--
-- Name: definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY definitions
    ADD CONSTRAINT definitions_pkey PRIMARY KEY (document_id, key);


--
-- Name: documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: id_lookup_uniq; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY id_lookup
    ADD CONSTRAINT id_lookup_uniq UNIQUE (parent_id, govt_id);


--
-- Name: user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (user_id);


--
-- Name: case_name_gin; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX case_name_gin ON cases USING gin (full_citation gin_trgm_ops);


--
-- Name: cases_id_dx; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX cases_id_dx ON cases USING btree (id);


--
-- Name: def_id_dx; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX def_id_dx ON definitions USING btree (document_id);


--
-- Name: docrefs_id_dx; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX docrefs_id_dx ON document_references USING btree (source_id);


--
-- Name: docreft_id_dx; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX docreft_id_dx ON document_references USING btree (target_id);


--
-- Name: document_parts_id_idx; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX document_parts_id_idx ON document_parts USING btree (document_id);


--
-- Name: document_parts_num_idx; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX document_parts_num_idx ON document_parts USING btree (num);


--
-- Name: error_id_index; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX error_id_index ON error_reports USING btree (id);


--
-- Name: govt_id_idx; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX govt_id_idx ON instruments USING btree (govt_id);


--
-- Name: idlookup_id_dx; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX idlookup_id_dx ON id_lookup USING btree (parent_id);


--
-- Name: instr_id_dx; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX instr_id_dx ON instruments USING btree (id);


--
-- Name: instrument_name_gin; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX instrument_name_gin ON instruments USING gin (title gin_trgm_ops);


--
-- Name: section_references_doc_id; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX section_references_doc_id ON section_references USING btree (source_document_id);


--
-- Name: section_references_govt_id; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX section_references_govt_id ON section_references USING btree (target_govt_id);


--
-- Name: shortcut_name_gin; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX shortcut_name_gin ON shortcuts USING gin (title gin_trgm_ops);


--
-- Name: def_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY definitions
    ADD CONSTRAINT def_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: document_parts_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY document_parts
    ADD CONSTRAINT document_parts_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY cases
    ADD CONSTRAINT id_fk FOREIGN KEY (id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: instrument_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY instruments
    ADD CONSTRAINT instrument_fk FOREIGN KEY (id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: lookup_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY id_lookup
    ADD CONSTRAINT lookup_fk FOREIGN KEY (parent_id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: ref_src_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY document_references
    ADD CONSTRAINT ref_src_fk FOREIGN KEY (source_id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: ref_tar_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY document_references
    ADD CONSTRAINT ref_tar_fk FOREIGN KEY (target_id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: section_references_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY section_references
    ADD CONSTRAINT section_references_fk FOREIGN KEY (source_document_id) REFERENCES documents(id);


--
-- Name: shortcut_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY shortcuts
    ADD CONSTRAINT shortcut_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: public; Type: ACL; Schema: -; Owner: -
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO migrations (name) VALUES
('1421202246_replace_act_pks.sql'),
('1421203582_replace_reg_pks.sql'),
('1421203670_replace_case_pks.sql'),
('1421204269_reference_tables.sql'),
('1421205103_pop_act_references.py'),
('1421207367_add_latest_version.sql'),
('1421208260_pop_act_references.py'),
('1421210905_pop_reg_references.py'),
('1421354219_add_processed_doc_col.sql'),
('1421359478_add_definitions_doc.sql'),
('1421371307_remove_def_from_acts.sql'),
('1422216151_new_structure.sql'),
('1422218066_latest_instrument.sql'),
('1422220566_pop_instrument_references.py'),
('1422219781_pop_lookups.py'),
('1422222222_add_case_cols.sql'),
('1422222645_case_to_db.py'),
('1422225756_titles.sql'),
('1422227623_drop_old.sql'),
('1422905505_definitions_table.sql'),
('1423434682_instrument_cols.sql'),
('1423436943_fix_official.sql'),
('1423437033_fix_instructing.sql'),
('1423442325_cascades.sql'),
('1423442902_number.sql'),
('1422219781_pop_lookups.py'),
('1422220566_pop_instrument_references.py'),
('1422219781_pop_lookups.py'),
('1422220566_pop_instrument_references.py'),
('1423610528_shortcuts.sql'),
('1424303144_clean_titles.sql'),
('1424755278_add_indices.sql'),
('1424757351_text_indices.sql'),
('1424761644_materialized.sql'),
('1424833799_section_references.sql'),
('1424835202_section_ref_repr.sql'),
('1424836836_add_section_ref_url.sql'),
('1425347196_document_parts.sql'),
('1425353152_move_widths.sql'),
('1425355246_widths_to_heights.sql'),
('1425415849_skeleton_back_to_html.sql'),
('1425933940_user_settings_and_errors.sql'),
('1425956565_remove_fk_from_errors.sql'),
('1426470202_new_case_fields.sql'),
('1426470223_add_definition_strings.sql'),
('1426542202_add_file_number.sql')
;


--
-- PostgreSQL database dump complete
--

