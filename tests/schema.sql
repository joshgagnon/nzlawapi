
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
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner:
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;

--
-- Name: child_count(); Type: FUNCTION; Schema: public; Owner: catalex_browser
--

CREATE FUNCTION child_count() RETURNS TABLE(parent_id integer, children integer)
    LANGUAGE sql
    AS $$

    WITH RECURSIVE graph(parent_id, child_id)
        AS (
          SELECT n.id, child_id
          FROM subordinates s
          JOIN newest n on s.parent_id = n.govt_id
          UNION ALL
          SELECT n.id, t.child_id
          FROM graph p
          JOIN subordinates t ON p.parent_id = t.child_id
       JOIN newest n on t.parent_id = n.govt_id

        )
    select parent_id, count(distinct child_id)::integer as children from graph group by parent_id

$$;


ALTER FUNCTION public.child_count() OWNER TO catalex_browser;

--
-- Name: get_processed_instrument(integer); Type: FUNCTION; Schema: public; Owner: catalex_browser
--

CREATE FUNCTION get_processed_instrument(id integer) RETURNS TABLE(title text, latest boolean, id integer, govt_id text, version integer, type text, date_first_valid date, date_as_at date, stage text, date_assent date, date_gazetted date, date_terminated date, date_imprint date, year integer, repealed boolean, attributes json, in_amend boolean, pco_suffix text, raised_by text, sub_type text, terminated text, date_signed date, imperial boolean, official text, path text, instructing_office text, number text, processed_document text, skeleton text, heights json)
    LANGUAGE sql
    AS $_$
    SELECT title, exists(select 1 from newest i where i.id=$1) as newest, i.id, i.govt_id, i.version, i.type,  i.date_first_valid, i.date_as_at, i.stage,
    i.date_assent, i.date_gazetted, i.date_terminated, i.date_imprint, i.year , i.repealed,
    i.attributes, i.in_amend, i.pco_suffix, i.raised_by, i.subtype, i.terminated, i.date_signed, i.imperial, i.official, i.path,
    i.instructing_office, i.number,
    processed_document, skeleton, heights
    FROM instruments i
    JOIN documents d on i.id = d.id
    WHERE i.id = $1
$_$;


ALTER FUNCTION public.get_processed_instrument(id integer) OWNER TO catalex_browser;

--
-- Name: get_references(integer); Type: FUNCTION; Schema: public; Owner: catalex_browser
--

CREATE FUNCTION get_references(document_id integer) RETURNS TABLE(id integer, title text, count bigint, type text)
    LANGUAGE plpgsql
    AS $_$
    BEGIN
        RETURN QUERY  select i.id, i.title, r.count, i.type
            FROM reference_counts r
            JOIN instruments i on r.source_document_id = i.id
            JOIN newest n on n.id = i.id
            WHERE target_document_id =  $1 and i.id != $1 order by count desc;

        END
  $_$;


ALTER FUNCTION public.get_references(document_id integer) OWNER TO catalex_browser;

--
-- Name: get_section_references(integer, text[], text); Type: FUNCTION; Schema: public; Owner: catalex_browser
--

CREATE FUNCTION get_section_references(target_document_id integer, govt_ids text[], target_path text) RETURNS TABLE(source_document_id integer, repr text, url text)
    LANGUAGE plpgsql
    AS $_$
    BEGIN
        RETURN QUERY SELECT s.source_document_id, source_repr, source_url
            FROM section_references  s
            JOIN newest i on s.source_document_id = i.id
            JOIN document_section_references d on d.link_id = s.link_id
            WHERE d.target_document_id = $1 and
            (
            (array_length($2, 1)> 0 and d.target_govt_id = ANY($2))
            or
            (d.target_path like ($3||'%') and d.target_path ~ ($3||'(\(.*)?$')
            )
            )  GROUP BY s.source_document_id, source_repr, source_url ORDER by source_repr;
        END
  $_$;


ALTER FUNCTION public.get_section_references(target_document_id integer, govt_ids text[], target_path text) OWNER TO catalex_browser;

--
-- Name: get_unprocessed_instrument(integer); Type: FUNCTION; Schema: public; Owner: catalex_browser
--

CREATE FUNCTION get_unprocessed_instrument(id integer) RETURNS TABLE(title text, latest boolean, id integer, govt_id text, version integer, type text, date_first_valid date, date_as_at date, stage text, date_assent date, date_gazetted date, date_terminated date, date_imprint date, year integer, repealed boolean, attributes json, in_amend boolean, pco_suffix text, raised_by text, sub_type text, terminated text, date_signed date, imperial boolean, official text, path text, instructing_office text, number text, document text)
    LANGUAGE sql
    AS $_$
    SELECT title, exists(select 1 from newest i where i.id=$1) as newest, i.id, i.govt_id, i.version, i.type,  i.date_first_valid, i.date_as_at, i.stage,
    i.date_assent, i.date_gazetted, i.date_terminated, i.date_imprint, i.year , i.repealed,
    i.attributes, i.in_amend, i.pco_suffix, i.raised_by, i.subtype, i.terminated, i.date_signed, i.imperial, i.official, i.path,
    i.instructing_office, i.number,
    document
    FROM instruments i
    JOIN documents d on i.id = d.id
    WHERE i.id = $1
$_$;


ALTER FUNCTION public.get_unprocessed_instrument(id integer) OWNER TO catalex_browser;

--
-- Name: get_versions(integer); Type: FUNCTION; Schema: public; Owner: catalex_browser
--

CREATE FUNCTION get_versions(id integer) RETURNS TABLE(id integer, title text, date_as_at date, version integer, number text)
    LANGUAGE sql
    AS $_$
    select i.id, i.title, i.date_as_at, i.version, i.number from
        (select id, govt_id from instruments) as s
        join instruments i on i.govt_id = s.govt_id
        where s.id = $1 order by i.date_as_at desc
$_$;


ALTER FUNCTION public.get_versions(id integer) OWNER TO catalex_browser;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: definitions; Type: TABLE; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE TABLE definitions (
    document_id integer NOT NULL,
    words text[],
    html text,
    full_word text,
    id text NOT NULL,
    expiry_tags text[],
    priority integer
);


ALTER TABLE public.definitions OWNER TO catalex_browser;

--
-- Name: parent_definitions(integer); Type: FUNCTION; Schema: public; Owner: catalex_browser
--

CREATE FUNCTION parent_definitions(id integer) RETURNS SETOF definitions
    LANGUAGE sql
    AS $_$
    WITH RECURSIVE graph(parent_id, child_id)
        AS (
          SELECT n.id, child_id
          FROM subordinates s
          JOIN newest n on s.parent_id = n.govt_id
          WHERE child_id = $1
          UNION ALL
          SELECT n.id, t.child_id
          FROM graph p
          JOIN subordinates t ON p.parent_id = t.child_id
          JOIN newest n on t.parent_id = n.govt_id
        )
        SELECT document_id, words, html,  full_word, id,  expiry_tags, priority
            FROM definitions d join graph g ON d.document_id = g.parent_id where document_id is not null
$_$;


ALTER FUNCTION public.parent_definitions(id integer) OWNER TO catalex_browser;

--
-- Name: section_references(text[]); Type: FUNCTION; Schema: public; Owner: catalex_browser
--

CREATE FUNCTION section_references(govt_ids text[]) RETURNS TABLE(source_document_id integer, repr text, url text)
    LANGUAGE sql
    AS $_$
          SELECT source_document_id, repr, url
            FROM section_references  d
            JOIN latest_instruments i on d.source_document_id = i.id
            WHERE target_govt_id = ANY($1) ORDER by repr
$_$;


ALTER FUNCTION public.section_references(govt_ids text[]) OWNER TO catalex_browser;

--
-- Name: subordinate_depth(); Type: FUNCTION; Schema: public; Owner: catalex_browser
--

CREATE FUNCTION subordinate_depth() RETURNS TABLE(child_id integer, count integer)
    LANGUAGE sql
    AS $$
    WITH RECURSIVE graph(parent_id, child_id, count)
        AS (
          SELECT null::integer, child_id, 0 as count
          FROM subordinates s where parent_id is null
          UNION ALL
          SELECT n.id, t.child_id ,count+1
          FROM graph p
          JOIN newest n on p.child_id = n.id
          JOIN subordinates t on n.govt_id = t.parent_id
        )
        SELECT child_id, max(count) as count from graph g group by (child_id);
$$;


ALTER FUNCTION public.subordinate_depth() OWNER TO catalex_browser;

--
-- Name: update_views(); Type: FUNCTION; Schema: public; Owner: catalex_browser
--

CREATE FUNCTION update_views() RETURNS void
    LANGUAGE sql
    AS $$
  REFRESH MATERIALIZED VIEW newest;
  REFRESH MATERIALIZED VIEW reference_counts;
  REFRESH MATERIALIZED VIEW scores;
$$;


ALTER FUNCTION public.update_views() OWNER TO catalex_browser;

--
-- Name: amendments; Type: TABLE; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE TABLE amendments (
    target_document_id integer,
    unknown_source_text text,
    note_id text,
    amendment_date date,
    source_govt_id text
);


ALTER TABLE public.amendments OWNER TO catalex_browser;

--
-- Name: cases; Type: TABLE; Schema: public; Owner: catalex_browser; Tablespace:
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


ALTER TABLE public.cases OWNER TO catalex_browser;

--
-- Name: document_parts; Type: TABLE; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE TABLE document_parts (
    document_id integer,
    num integer,
    data text,
    title text
);


ALTER TABLE public.document_parts OWNER TO catalex_browser;

--
-- Name: document_references; Type: TABLE; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE TABLE document_references (
    source_id integer,
    target_id integer,
    count integer DEFAULT 0
);


ALTER TABLE public.document_references OWNER TO catalex_browser;

--
-- Name: document_section_references; Type: TABLE; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE TABLE document_section_references (
    link_id integer,
    target_path text,
    target_govt_id text,
    target_document_id integer
);


ALTER TABLE public.document_section_references OWNER TO catalex_browser;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE TABLE documents (
    id integer NOT NULL,
    type text,
    document text,
    processed_document text,
    contents text,
    mapper text,
    heights json,
    skeleton text,
    updated timestamp with time zone
);


ALTER TABLE public.documents OWNER TO catalex_browser;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: catalex_browser
--

CREATE SEQUENCE documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.documents_id_seq OWNER TO catalex_browser;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: catalex_browser
--

ALTER SEQUENCE documents_id_seq OWNED BY documents.id;


--
-- Name: error_reports; Type: TABLE; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE TABLE error_reports (
    id text,
    reporter text,
    fields text[],
    details text,
    mapper text NOT NULL
);


ALTER TABLE public.error_reports OWNER TO catalex_browser;

--
-- Name: error_submissions; Type: TABLE; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE TABLE error_submissions (
    user_id integer,
    details text,
    state text
);


ALTER TABLE public.error_submissions OWNER TO catalex_browser;

--
-- Name: id_lookup; Type: TABLE; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE TABLE id_lookup (
    parent_id integer,
    govt_id text,
    repr text
);


ALTER TABLE public.id_lookup OWNER TO catalex_browser;

--
-- Name: instruments; Type: TABLE; Schema: public; Owner: catalex_browser; Tablespace:
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


ALTER TABLE public.instruments OWNER TO catalex_browser;

--
-- Name: newest; Type: MATERIALIZED VIEW; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE MATERIALIZED VIEW newest AS
 SELECT i.id,
    s.govt_id
   FROM (instruments i
     JOIN ( SELECT instruments.govt_id,
            max(instruments.version) AS version
           FROM instruments
          GROUP BY instruments.govt_id) s ON (((s.govt_id = i.govt_id) AND (i.version = s.version))))
  WITH NO DATA;


ALTER TABLE public.newest OWNER TO catalex_browser;

--
-- Name: section_ref_seq; Type: SEQUENCE; Schema: public; Owner: catalex_browser
--

CREATE SEQUENCE section_ref_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.section_ref_seq OWNER TO catalex_browser;

--
-- Name: section_references; Type: TABLE; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE TABLE section_references (
    source_document_id integer,
    target_govt_id text,
    source_repr text,
    source_url text,
    link_text text,
    link_id integer DEFAULT nextval('section_ref_seq'::regclass) NOT NULL
);


ALTER TABLE public.section_references OWNER TO catalex_browser;

--
-- Name: reference_counts; Type: MATERIALIZED VIEW; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE MATERIALIZED VIEW reference_counts AS
 SELECT s.source_document_id,
    d.target_document_id,
    count(d.link_id) AS count
   FROM (document_section_references d
     JOIN section_references s ON ((d.link_id = s.link_id)))
  GROUP BY d.target_document_id, s.source_document_id
  WITH NO DATA;


ALTER TABLE public.reference_counts OWNER TO catalex_browser;

--
-- Name: scores; Type: MATERIALIZED VIEW; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE MATERIALIZED VIEW scores AS
 SELECT i.id,
    COALESCE(r.count, (0)::bigint) AS refs,
    COALESCE(g.count, 0) AS base_score,
    ((i.type = 'bill'::text) AND sub.bill_enacted) AS bill_enacted
   FROM (((instruments i
     LEFT JOIN subordinate_depth() g(child_id, count) ON ((g.child_id = i.id)))
     LEFT JOIN ( SELECT l.govt_id,
            true AS bill_enacted
           FROM instruments l
          WHERE ((l.type = 'act'::text) OR (l.type = 'regulation'::text))
          GROUP BY l.govt_id) sub ON ((i.govt_id = sub.govt_id)))
     LEFT JOIN ( SELECT count(r_1.count) AS count,
            r_1.target_document_id
           FROM (reference_counts r_1
             JOIN newest n ON ((r_1.source_document_id = n.id)))
          GROUP BY r_1.target_document_id) r ON ((r.target_document_id = i.id)))
  WITH NO DATA;


ALTER TABLE public.scores OWNER TO catalex_browser;

--
-- Name: latest_instruments; Type: VIEW; Schema: public; Owner: catalex_browser
--

CREATE VIEW latest_instruments AS
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
    d.contents,
    s.refs,
    s.base_score,
    s.bill_enacted
   FROM (((instruments i
     JOIN newest n ON ((n.id = i.id)))
     JOIN documents d ON ((d.id = i.id)))
     JOIN scores s ON ((n.id = s.id)));


ALTER TABLE public.latest_instruments OWNER TO catalex_browser;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE TABLE migrations (
    name text
);


ALTER TABLE public.migrations OWNER TO catalex_browser;

--
-- Name: published_views; Type: TABLE; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE TABLE published_views (
    publish_id integer NOT NULL,
    user_id integer,
    state text,
    html text,
    "time" timestamp with time zone
);


ALTER TABLE public.published_views OWNER TO catalex_browser;

--
-- Name: published_views_publish_id_seq; Type: SEQUENCE; Schema: public; Owner: catalex_browser
--

CREATE SEQUENCE published_views_publish_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.published_views_publish_id_seq OWNER TO catalex_browser;

--
-- Name: published_views_publish_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: catalex_browser
--

ALTER SEQUENCE published_views_publish_id_seq OWNED BY published_views.publish_id;


--
-- Name: resources; Type: TABLE; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE TABLE resources (
    id text,
    value bytea
);


ALTER TABLE public.resources OWNER TO catalex_browser;

--
-- Name: shortcuts; Type: TABLE; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE TABLE shortcuts (
    document_id integer,
    title text,
    query text,
    find text,
    type text
);


ALTER TABLE public.shortcuts OWNER TO catalex_browser;

--
-- Name: subordinates; Type: TABLE; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE TABLE subordinates (
    child_id integer,
    parent_id text
);


ALTER TABLE public.subordinates OWNER TO catalex_browser;

--
-- Name: titles; Type: VIEW; Schema: public; Owner: catalex_browser
--

CREATE VIEW titles AS
 SELECT i.title AS name,
    i.id,
    i.type,
    'full'::text AS find,
    NULL::text AS query,
    i.year,
    i.refs,
    i.base_score
   FROM latest_instruments i
  WHERE ((i.terminated IS NULL) OR (i.terminated = ''::text))
UNION
 SELECT cases.full_citation AS name,
    cases.id,
    'case'::text AS type,
    'full'::text AS find,
    NULL::text AS query,
    NULL::integer AS year,
    0 AS refs,
    0 AS base_score
   FROM cases
UNION
 SELECT shortcuts.title AS name,
    shortcuts.document_id AS id,
    shortcuts.type,
    shortcuts.find,
    shortcuts.query,
    10000 AS year,
    10000 AS refs,
    10000 AS base_score
   FROM shortcuts;


ALTER TABLE public.titles OWNER TO catalex_browser;

--
-- Name: user_logins; Type: TABLE; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE TABLE user_logins (
    user_id integer NOT NULL,
    access_hash character varying(255) NOT NULL,
    access_time timestamp(0) without time zone NOT NULL
);


ALTER TABLE public.user_logins OWNER TO catalex_browser;

--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE TABLE user_settings (
    user_id integer NOT NULL,
    data json
);


ALTER TABLE public.user_settings OWNER TO catalex_browser;

--
-- Name: id; Type: DEFAULT; Schema: public; Owner: catalex_browser
--

ALTER TABLE ONLY documents ALTER COLUMN id SET DEFAULT nextval('documents_id_seq'::regclass);


--
-- Name: publish_id; Type: DEFAULT; Schema: public; Owner: catalex_browser
--

ALTER TABLE ONLY published_views ALTER COLUMN publish_id SET DEFAULT nextval('published_views_publish_id_seq'::regclass);


--
-- Name: definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: catalex_browser; Tablespace:
--

ALTER TABLE ONLY definitions
    ADD CONSTRAINT definitions_pkey PRIMARY KEY (id);


--
-- Name: documents_pkey; Type: CONSTRAINT; Schema: public; Owner: catalex_browser; Tablespace:
--

ALTER TABLE ONLY documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: id_lookup_uniq; Type: CONSTRAINT; Schema: public; Owner: catalex_browser; Tablespace:
--

ALTER TABLE ONLY id_lookup
    ADD CONSTRAINT id_lookup_uniq UNIQUE (parent_id, govt_id);


--
-- Name: published_views_pkey; Type: CONSTRAINT; Schema: public; Owner: catalex_browser; Tablespace:
--

ALTER TABLE ONLY published_views
    ADD CONSTRAINT published_views_pkey PRIMARY KEY (publish_id);


--
-- Name: section_references_pkey; Type: CONSTRAINT; Schema: public; Owner: catalex_browser; Tablespace:
--

ALTER TABLE ONLY section_references
    ADD CONSTRAINT section_references_pkey PRIMARY KEY (link_id);


--
-- Name: user_logins_pkey; Type: CONSTRAINT; Schema: public; Owner: catalex_browser; Tablespace:
--

ALTER TABLE ONLY user_logins
    ADD CONSTRAINT user_logins_pkey PRIMARY KEY (user_id, access_hash);


--
-- Name: user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: catalex_browser; Tablespace:
--

ALTER TABLE ONLY user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (user_id);


--
-- Name: amendments_govt_idx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX amendments_govt_idx ON amendments USING btree (source_govt_id);


--
-- Name: amendments_idx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX amendments_idx ON amendments USING btree (target_document_id);


--
-- Name: cases_id_dx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX cases_id_dx ON cases USING btree (id);


--
-- Name: def_document_id_dx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX def_document_id_dx ON definitions USING btree (document_id);


--
-- Name: def_id_dx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX def_id_dx ON definitions USING btree (id);


--
-- Name: defintition_word_idx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX defintition_word_idx ON definitions USING btree (full_word);


--
-- Name: docrefs_id_dx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX docrefs_id_dx ON document_references USING btree (source_id);


--
-- Name: docreft_id_dx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX docreft_id_dx ON document_references USING btree (target_id);


--
-- Name: document_parts_id_idx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX document_parts_id_idx ON document_parts USING btree (document_id);


--
-- Name: document_parts_num_idx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX document_parts_num_idx ON document_parts USING btree (num);


--
-- Name: document_sec_ref_id; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX document_sec_ref_id ON document_section_references USING btree (link_id);


--
-- Name: document_section_references_target_id_idx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX document_section_references_target_id_idx ON document_section_references USING btree (target_document_id);


--
-- Name: document_section_references_target_idx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX document_section_references_target_idx ON document_section_references USING btree (target_govt_id);


--
-- Name: document_section_references_target_path_idx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX document_section_references_target_path_idx ON document_section_references USING btree (target_path varchar_pattern_ops);


--
-- Name: error_id_index; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX error_id_index ON error_reports USING btree (id);


--
-- Name: govt_id_idx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX govt_id_idx ON instruments USING btree (govt_id);


--
-- Name: id_lookup_govt_id_idx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX id_lookup_govt_id_idx ON id_lookup USING btree (govt_id);


--
-- Name: idlookup_id_dx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX idlookup_id_dx ON id_lookup USING btree (parent_id);


--
-- Name: instr_id_dx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX instr_id_dx ON instruments USING btree (id);


--
-- Name: instruments_terminated_idx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX instruments_terminated_idx ON instruments USING btree (terminated);


--
-- Name: instruments_title_idx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX instruments_title_idx ON instruments USING btree (title varchar_pattern_ops);


--
-- Name: newest_view_govt_idx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX newest_view_govt_idx ON newest USING btree (govt_id);


--
-- Name: newest_view_idx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE UNIQUE INDEX newest_view_idx ON newest USING btree (id);


--
-- Name: reference_counts_idx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX reference_counts_idx ON reference_counts USING btree (target_document_id);


--
-- Name: scores_idx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE UNIQUE INDEX scores_idx ON scores USING btree (id);


--
-- Name: section_references_doc_id; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX section_references_doc_id ON section_references USING btree (source_document_id);


--
-- Name: section_references_govt_id; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX section_references_govt_id ON section_references USING btree (target_govt_id);


--
-- Name: subordinate_parent_idx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX subordinate_parent_idx ON subordinates USING btree (parent_id);


--
-- Name: x2_id_dx; Type: INDEX; Schema: public; Owner: catalex_browser; Tablespace:
--

CREATE INDEX x2_id_dx ON instruments USING btree (year);


--
-- Name: amendments_target_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: catalex_browser
--

ALTER TABLE ONLY amendments
    ADD CONSTRAINT amendments_target_id_fk FOREIGN KEY (target_document_id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: def_fk; Type: FK CONSTRAINT; Schema: public; Owner: catalex_browser
--

ALTER TABLE ONLY definitions
    ADD CONSTRAINT def_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: document_parts_fk; Type: FK CONSTRAINT; Schema: public; Owner: catalex_browser
--

ALTER TABLE ONLY document_parts
    ADD CONSTRAINT document_parts_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: document_section_refs_link_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: catalex_browser
--

ALTER TABLE ONLY document_section_references
    ADD CONSTRAINT document_section_refs_link_id_fk FOREIGN KEY (link_id) REFERENCES section_references(link_id) ON DELETE CASCADE;


--
-- Name: document_section_refs_target_doc_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: catalex_browser
--

ALTER TABLE ONLY document_section_references
    ADD CONSTRAINT document_section_refs_target_doc_id_fk FOREIGN KEY (target_document_id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: id_fk; Type: FK CONSTRAINT; Schema: public; Owner: catalex_browser
--

ALTER TABLE ONLY cases
    ADD CONSTRAINT id_fk FOREIGN KEY (id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: instrument_fk; Type: FK CONSTRAINT; Schema: public; Owner: catalex_browser
--

ALTER TABLE ONLY instruments
    ADD CONSTRAINT instrument_fk FOREIGN KEY (id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: lookup_fk; Type: FK CONSTRAINT; Schema: public; Owner: catalex_browser
--

ALTER TABLE ONLY id_lookup
    ADD CONSTRAINT lookup_fk FOREIGN KEY (parent_id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: ref_src_fk; Type: FK CONSTRAINT; Schema: public; Owner: catalex_browser
--

ALTER TABLE ONLY document_references
    ADD CONSTRAINT ref_src_fk FOREIGN KEY (source_id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: ref_tar_fk; Type: FK CONSTRAINT; Schema: public; Owner: catalex_browser
--

ALTER TABLE ONLY document_references
    ADD CONSTRAINT ref_tar_fk FOREIGN KEY (target_id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: section_references_fk; Type: FK CONSTRAINT; Schema: public; Owner: catalex_browser
--

ALTER TABLE ONLY section_references
    ADD CONSTRAINT section_references_fk FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: shortcut_fk; Type: FK CONSTRAINT; Schema: public; Owner: catalex_browser
--

ALTER TABLE ONLY shortcuts
    ADD CONSTRAINT shortcut_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: sub_chi_fk; Type: FK CONSTRAINT; Schema: public; Owner: catalex_browser
--

ALTER TABLE ONLY subordinates
    ADD CONSTRAINT sub_chi_fk FOREIGN KEY (child_id) REFERENCES documents(id) ON DELETE CASCADE;


--
-- Name: public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;

INSERT INTO migrations (name) VALUES ('1421202246_replace_act_pks.sql');
INSERT INTO migrations (name) VALUES ('1421203582_replace_reg_pks.sql');
INSERT INTO migrations (name) VALUES ('1421203670_replace_case_pks.sql');
INSERT INTO migrations (name) VALUES ('1421204269_reference_tables.sql');
INSERT INTO migrations (name) VALUES ('1421207367_add_latest_version.sql');
INSERT INTO migrations (name) VALUES ('1421208260_pop_act_references.py');
INSERT INTO migrations (name) VALUES ('1421210905_pop_reg_references.py');
INSERT INTO migrations (name) VALUES ('1421354219_add_processed_doc_col.sql');
INSERT INTO migrations (name) VALUES ('1421359478_add_definitions_doc.sql');
INSERT INTO migrations (name) VALUES ('1421371307_remove_def_from_acts.sql');
INSERT INTO migrations (name) VALUES ('1422216151_new_structure.sql');
INSERT INTO migrations (name) VALUES ('1422218066_latest_instrument.sql');
INSERT INTO migrations (name) VALUES ('1422219781_pop_lookups.py');
INSERT INTO migrations (name) VALUES ('1422220566_pop_instrument_references.py');
INSERT INTO migrations (name) VALUES ('1422222222_add_case_cols.sql');
INSERT INTO migrations (name) VALUES ('1422222645_case_to_db.py');
INSERT INTO migrations (name) VALUES ('1422225756_titles.sql');
INSERT INTO migrations (name) VALUES ('1422227623_drop_old.sql');
INSERT INTO migrations (name) VALUES ('1422905505_definitions_table.sql');
INSERT INTO migrations (name) VALUES ('1423434682_instrument_cols.sql');
INSERT INTO migrations (name) VALUES ('1423436943_fix_official.sql');
INSERT INTO migrations (name) VALUES ('1423437033_fix_instructing.sql');
INSERT INTO migrations (name) VALUES ('1423442325_cascades.sql');
INSERT INTO migrations (name) VALUES ('1423442902_number.sql');
INSERT INTO migrations (name) VALUES ('1423610528_shortcuts.sql');
INSERT INTO migrations (name) VALUES ('1424303144_clean_titles.sql');
INSERT INTO migrations (name) VALUES ('1424755278_add_indices.sql');
INSERT INTO migrations (name) VALUES ('1424757351_text_indices.sql');
INSERT INTO migrations (name) VALUES ('1424761644_materialized.sql');
INSERT INTO migrations (name) VALUES ('1424833799_section_references.sql');
INSERT INTO migrations (name) VALUES ('1424835202_section_ref_repr.sql');
INSERT INTO migrations (name) VALUES ('1424836836_add_section_ref_url.sql');
INSERT INTO migrations (name) VALUES ('1425347196_document_parts.sql');
INSERT INTO migrations (name) VALUES ('1425353152_move_widths.sql');
INSERT INTO migrations (name) VALUES ('1425355246_widths_to_heights.sql');
INSERT INTO migrations (name) VALUES ('1425415849_skeleton_back_to_html.sql');
INSERT INTO migrations (name) VALUES ('1425933940_user_settings_and_errors.sql');
INSERT INTO migrations (name) VALUES ('1425956565_remove_fk_from_errors.sql');
INSERT INTO migrations (name) VALUES ('1426470202_new_case_fields.sql');
INSERT INTO migrations (name) VALUES ('1426470223_add_definition_strings.sql');
INSERT INTO migrations (name) VALUES ('1426542202_add_file_number.sql');
INSERT INTO migrations (name) VALUES ('1427317190_add_assent_date.py');
INSERT INTO migrations (name) VALUES ('1427673620_defs_array.sql');
INSERT INTO migrations (name) VALUES ('1427752332_subordinate.sql');
INSERT INTO migrations (name) VALUES ('1427766238_defs_to_docs.sql');
INSERT INTO migrations (name) VALUES ('1427933267_new_defs.sql');
INSERT INTO migrations (name) VALUES ('1428289067_def_index.sql');
INSERT INTO migrations (name) VALUES ('1429404924_add_titles_to_parts.sql');
INSERT INTO migrations (name) VALUES ('1429496506_add_target_fields_section_refs.sql');
INSERT INTO migrations (name) VALUES ('1429506260_add_govt_id_index.sql');
INSERT INTO migrations (name) VALUES ('1429654222_target_id_to_section_refs.sql');
INSERT INTO migrations (name) VALUES ('1429666095_add_target_path_index.sql');
INSERT INTO migrations (name) VALUES ('1429743162_drop_func.sql');
INSERT INTO migrations (name) VALUES ('1430359652_add_user_logins.sql');
INSERT INTO migrations (name) VALUES ('1431574013_expiry_tags.sql');
INSERT INTO migrations (name) VALUES ('1431581767_def_priority.sql');
INSERT INTO migrations (name) VALUES ('1431984723_document_date.sql');
INSERT INTO migrations (name) VALUES ('1432014295_more_casacades.sql');
INSERT INTO migrations (name) VALUES ('1432247742_section_references_flag.sql');
INSERT INTO migrations (name) VALUES ('1432504683_sect_refs_target_doc_id.sql');
INSERT INTO migrations (name) VALUES ('1432508280_target_path_idx.sql');
INSERT INTO migrations (name) VALUES ('1432511679_replace_txt_locale.sql');
INSERT INTO migrations (name) VALUES ('1432518078_def_id.sql');
INSERT INTO migrations (name) VALUES ('1432520860_amendments.sql');
INSERT INTO migrations (name) VALUES ('1432540598_subordinates.sql');
INSERT INTO migrations (name) VALUES ('1432596561_terminated_idx.sql');
INSERT INTO migrations (name) VALUES ('1432766593_published_views.sql');
--
-- PostgreSQL database dump complete
--