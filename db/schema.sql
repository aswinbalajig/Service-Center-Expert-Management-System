--
-- PostgreSQL database dump
--

-- Dumped from database version 17.3
-- Dumped by pg_dump version 17.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: main; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA main;


--
-- Name: security; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA security;


--
-- Name: manage_issues(character varying, integer, integer, integer, integer, character varying, character varying, character varying); Type: FUNCTION; Schema: main; Owner: -
--

CREATE FUNCTION main.manage_issues(p_action character varying DEFAULT NULL::character varying, p_edit_id integer DEFAULT NULL::integer, p_delete_id integer DEFAULT NULL::integer, p_created_by integer DEFAULT NULL::integer, p_service_center_id integer DEFAULT NULL::integer, p_description character varying DEFAULT NULL::character varying, p_priority character varying DEFAULT NULL::character varying, p_status character varying DEFAULT NULL::character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $$

DECLARE
    res_issue_id INTEGER;

BEGIN

    --------------------------------------------------
    -- DELETE
    --------------------------------------------------

    IF p_delete_id>0 THEN
        DELETE FROM main.issues
        WHERE issue_id = p_delete_id
        RETURNING issue_id INTO res_issue_id;

        RETURN res_issue_id;

    END IF;

   

    IF p_action = 'status_update' AND p_edit_id > 0 THEN

        UPDATE main.issues
        SET status = p_status
        WHERE issue_id = p_edit_id AND service_center_id=p_service_center_id
        RETURNING issue_id INTO res_issue_id;

        RETURN res_issue_id;

    END IF;

    IF p_action = 'priority_update' AND p_edit_id > 0 THEN

        UPDATE main.issues
        SET priority = p_priority
        WHERE issue_id = p_edit_id AND service_center_id=p_service_center_id
        RETURNING issue_id INTO res_issue_id;

        RETURN res_issue_id;

    END IF;

    --------------------------------------------------
    -- DEFAULT UPDATE
    --------------------------------------------------

    IF p_edit_id > 0 THEN

        UPDATE main.issues
        SET
            created_by = COALESCE(p_created_by, created_by),
            service_center_id = COALESCE(p_service_center_id, service_center_id),
            description = COALESCE(p_description, description),
            priority = COALESCE(p_priority, priority),
            status = COALESCE(p_status, status)
        WHERE issue_id = p_edit_id AND service_center_id=p_service_center_id
        RETURNING issue_id INTO res_issue_id;

        RETURN res_issue_id;

    END IF;

    --------------------------------------------------
    -- INSERT
    --------------------------------------------------

    INSERT INTO main.issues
    (
        created_by,
        service_center_id,
        description,
        priority,
        status,
        created_at
    )
    VALUES
    (
        p_created_by,
        p_service_center_id,
        p_description,
        p_priority,
        COALESCE(p_status,'OPEN'),
        CURRENT_DATE
    )
    RETURNING issue_id INTO res_issue_id;

    RETURN res_issue_id;

END;

$$;


--
-- Name: manage_invites(integer, integer, character varying, integer, integer, integer, text, boolean, timestamp with time zone); Type: FUNCTION; Schema: security; Owner: -
--

CREATE FUNCTION security.manage_invites(p_edit_id integer, p_delete_id integer, p_invitee_email character varying DEFAULT NULL::character varying, p_role_id integer DEFAULT NULL::integer, p_service_center_id integer DEFAULT NULL::integer, p_invited_by_user_id integer DEFAULT NULL::integer, p_token text DEFAULT NULL::text, p_is_used boolean DEFAULT NULL::boolean, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_invite_id INTEGER;
BEGIN

    ------------------------------------------------------------------
    -- SAFETY CHECK
    ------------------------------------------------------------------
    IF p_edit_id > 0 AND p_delete_id > 0 THEN
        RAISE EXCEPTION 'Edit and Delete cannot be performed together';
    END IF;

    ------------------------------------------------------------------
    -- DELETE OPERATION
    ------------------------------------------------------------------
    IF p_delete_id > 0 THEN
        DELETE FROM security.invites
        WHERE invite_id = p_delete_id
        RETURNING invite_id INTO v_invite_id;

        RETURN v_invite_id;
    END IF;

    ------------------------------------------------------------------
    -- UPDATE OPERATION (Used during Signup phase)
    ------------------------------------------------------------------
    IF p_edit_id > 0 THEN
        UPDATE security.invites
        SET
            invitee_email        = COALESCE(p_invitee_email, invitee_email),
            role_id              = COALESCE(p_role_id, role_id),
            service_center_id    = COALESCE(p_service_center_id, service_center_id),
            invited_by_user_id   = COALESCE(p_invited_by_user_id, invited_by_user_id),
            token                = COALESCE(p_token, token),
            is_used              = COALESCE(p_is_used, is_used),
            expires_at           = COALESCE(p_expires_at, expires_at)
        WHERE invite_id = p_edit_id
        RETURNING invite_id INTO v_invite_id;

        RETURN v_invite_id;
    END IF;

    ------------------------------------------------------------------
    -- INSERT OR UPSERT OPERATION (Used when sending invites)
    ------------------------------------------------------------------
    INSERT INTO security.invites
    (
        invitee_email,
        role_id,
        service_center_id,
        invited_by_user_id,
        token,
        is_used,
        expires_at
    )
    VALUES
    (
        p_invitee_email,
        p_role_id,
        p_service_center_id,
        p_invited_by_user_id,
        p_token,
        COALESCE(p_is_used, FALSE),
        p_expires_at
    )
    ON CONFLICT (invitee_email, role_id, service_center_id) WHERE is_used = FALSE
    DO UPDATE SET
        token = EXCLUDED.token,
        invited_by_user_id = EXCLUDED.invited_by_user_id,
        expires_at = EXCLUDED.expires_at
    RETURNING invite_id INTO v_invite_id;

    RETURN v_invite_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'ERROR: %', SQLERRM;
END;
$$;


--
-- Name: manage_service_center_profile(integer, integer, character varying, character varying, integer); Type: FUNCTION; Schema: security; Owner: -
--

CREATE FUNCTION security.manage_service_center_profile(p_edit_id integer, p_delete_id integer, p_service_center_name character varying DEFAULT NULL::character varying, p_service_center_address character varying DEFAULT NULL::character varying, p_user_id integer DEFAULT NULL::integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_service_center_id INTEGER;
BEGIN

    ------------------------------------------------------------------
    -- SAFETY CHECK
    ------------------------------------------------------------------
    IF p_edit_id > 0 AND p_delete_id > 0 THEN
        RAISE EXCEPTION 'Edit and Delete cannot be performed together';
    END IF;

    ------------------------------------------------------------------
    -- DELETE OPERATION
    ------------------------------------------------------------------
    IF p_delete_id > 0 THEN

        DELETE FROM security.service_center_profile
        WHERE service_center_id = p_delete_id
        RETURNING service_center_id INTO v_service_center_id;

        RETURN v_service_center_id;
    END IF;

    ------------------------------------------------------------------
    -- UPDATE OPERATION
    ------------------------------------------------------------------
    IF p_edit_id > 0 THEN

        UPDATE security.service_center_profile
        SET
            service_center_name    = COALESCE(p_service_center_name, service_center_name),
            service_center_address = COALESCE(p_service_center_address, service_center_address),
            user_id                = COALESCE(p_user_id, user_id)
        WHERE service_center_id = p_edit_id
        RETURNING service_center_id INTO v_service_center_id;

        RETURN v_service_center_id;
    END IF;

    ------------------------------------------------------------------
    -- INSERT OPERATION
    ------------------------------------------------------------------
    INSERT INTO security.service_center_profile
    (
        service_center_name,
        service_center_address,
        user_id
    )
    VALUES
    (
        p_service_center_name,
        p_service_center_address,
        p_user_id
    )
    RETURNING service_center_id INTO v_service_center_id;

    RETURN v_service_center_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'ERROR: %', SQLERRM;
END;
$$;


--
-- Name: manage_user_profile(integer, integer, integer, date, character varying, character varying, character varying, integer); Type: FUNCTION; Schema: security; Owner: -
--

CREATE FUNCTION security.manage_user_profile(p_edit_id integer, p_delete_id integer, p_user_id integer DEFAULT NULL::integer, p_date_of_joining date DEFAULT NULL::date, p_first_name character varying DEFAULT NULL::character varying, p_last_name character varying DEFAULT NULL::character varying, p_phone_number character varying DEFAULT NULL::character varying, p_service_center_id integer DEFAULT NULL::integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_profile_id INTEGER;
BEGIN

    ------------------------------------------------------------------
    -- SAFETY CHECK
    ------------------------------------------------------------------
    IF p_edit_id > 0 AND p_delete_id > 0 THEN
        RAISE EXCEPTION 'Edit and Delete cannot be performed together';
    END IF;

    ------------------------------------------------------------------
    -- DELETE OPERATION
    ------------------------------------------------------------------
    IF p_delete_id > 0 THEN

        DELETE FROM security.user_profile
        WHERE profile_id = p_delete_id
        RETURNING profile_id INTO v_profile_id;

        RETURN v_profile_id;
    END IF;

    ------------------------------------------------------------------
    -- UPDATE OPERATION
    ------------------------------------------------------------------
    IF p_edit_id > 0 THEN

        UPDATE security.user_profile
        SET
            user_id            = COALESCE(p_user_id, user_id),
            date_of_joining   = COALESCE(p_date_of_joining, date_of_joining),
            first_name        = COALESCE(p_first_name, first_name),
            last_name         = COALESCE(p_last_name, last_name),
            phone_number      = COALESCE(p_phone_number, phone_number),
            service_center_id = COALESCE(p_service_center_id, service_center_id),
            update_at         = CURRENT_TIMESTAMP
        WHERE profile_id = p_edit_id
        RETURNING profile_id INTO v_profile_id;

        RETURN v_profile_id;
    END IF;

    ------------------------------------------------------------------
    -- INSERT OPERATION
    ------------------------------------------------------------------
    INSERT INTO security.user_profile
    (
        user_id,
        date_of_joining,
        first_name,
        last_name,
        phone_number,
        service_center_id,
        created_at,
        update_at
    )
    VALUES
    (
        p_user_id,
        p_date_of_joining,
        p_first_name,
        p_last_name,
        p_phone_number,
        p_service_center_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
    RETURNING profile_id INTO v_profile_id;

    RETURN v_profile_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'ERROR: %', SQLERRM;
END;
$$;


--
-- Name: manage_users(integer, integer, integer, character varying, character varying); Type: FUNCTION; Schema: security; Owner: -
--

CREATE FUNCTION security.manage_users(p_edit_id integer, p_delete_id integer, p_role_id integer DEFAULT NULL::integer, p_email_id character varying DEFAULT NULL::character varying, p_password character varying DEFAULT NULL::character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_user_id INTEGER;
BEGIN

    ------------------------------------------------------------------
    -- SAFETY CHECK
    ------------------------------------------------------------------
    IF p_edit_id > 0 AND p_delete_id > 0 THEN
        RAISE EXCEPTION 'Edit and Delete cannot be performed together';
    END IF;

    ------------------------------------------------------------------
    -- DELETE OPERATION
    ------------------------------------------------------------------
    IF p_delete_id > 0 THEN

        DELETE FROM security.users
        WHERE user_id = p_delete_id
        RETURNING user_id INTO v_user_id;

        RETURN v_user_id;
    END IF;

    ------------------------------------------------------------------
    -- UPDATE OPERATION
    ------------------------------------------------------------------
    IF p_edit_id > 0 THEN

        UPDATE security.users
        SET
            email_id  = COALESCE(p_email_id, email_id),
            password  = COALESCE(p_password, password),
            role_id	  = COALESCE(p_role_id,role_id),
			update_at = CURRENT_TIMESTAMP
        WHERE user_id = p_edit_id
        RETURNING user_id INTO v_user_id;

        RETURN v_user_id;
    END IF;

    ------------------------------------------------------------------
    -- INSERT OPERATION
    ------------------------------------------------------------------
    INSERT INTO security.users
    (
        email_id,
		role_id,
        password,
        created_at,
        update_at
    )
    VALUES
    (
        p_email_id,
        p_role_id,
		p_password,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
    RETURNING user_id INTO v_user_id;

    RETURN v_user_id;

EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'EMAIL_ALREADY_EXISTS';
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: status_history; Type: TABLE; Schema: main; Owner: -
--

CREATE TABLE main.status_history (
    "history_id " integer NOT NULL,
    "work_order_id " integer,
    status character varying,
    changed_by integer,
    changed_at date,
    remarks character varying,
    created_date date
);


--
-- Name:          status_history_history_id _seq; Type: SEQUENCE; Schema: main; Owner: -
--

CREATE SEQUENCE main."         status_history_history_id _seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name:          status_history_history_id _seq; Type: SEQUENCE OWNED BY; Schema: main; Owner: -
--

ALTER SEQUENCE main."         status_history_history_id _seq" OWNED BY main.status_history."history_id ";


--
-- Name: expert_types; Type: TABLE; Schema: main; Owner: -
--

CREATE TABLE main.expert_types (
    expert_type_id integer NOT NULL,
    expert_type_name character varying,
    created_date date
);


--
-- Name:  expert_types_expert_type_id_seq; Type: SEQUENCE; Schema: main; Owner: -
--

CREATE SEQUENCE main." expert_types_expert_type_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name:  expert_types_expert_type_id_seq; Type: SEQUENCE OWNED BY; Schema: main; Owner: -
--

ALTER SEQUENCE main." expert_types_expert_type_id_seq" OWNED BY main.expert_types.expert_type_id;


--
-- Name: experts; Type: TABLE; Schema: main; Owner: -
--

CREATE TABLE main.experts (
    user_id integer,
    service_center_id integer,
    expert_type_id integer
);


--
-- Name: invites; Type: TABLE; Schema: main; Owner: -
--

CREATE TABLE main.invites (
    invite_id integer NOT NULL,
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    role_id integer NOT NULL,
    service_center_id integer NOT NULL,
    invited_by integer NOT NULL,
    is_used boolean DEFAULT false,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: invites_invite_id_seq; Type: SEQUENCE; Schema: main; Owner: -
--

CREATE SEQUENCE main.invites_invite_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invites_invite_id_seq; Type: SEQUENCE OWNED BY; Schema: main; Owner: -
--

ALTER SEQUENCE main.invites_invite_id_seq OWNED BY main.invites.invite_id;


--
-- Name: issues; Type: TABLE; Schema: main; Owner: -
--

CREATE TABLE main.issues (
    issue_id integer NOT NULL,
    service_center_id integer,
    description character varying,
    priority character varying,
    status character varying,
    created_at date,
    created_by integer
);


--
-- Name: issues_issue_id_seq; Type: SEQUENCE; Schema: main; Owner: -
--

CREATE SEQUENCE main.issues_issue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: issues_issue_id_seq; Type: SEQUENCE OWNED BY; Schema: main; Owner: -
--

ALTER SEQUENCE main.issues_issue_id_seq OWNED BY main.issues.issue_id;


--
-- Name: work_orders; Type: TABLE; Schema: main; Owner: -
--

CREATE TABLE main.work_orders (
    work_order_id integer NOT NULL,
    issued_id integer,
    assigned_expert_id integer,
    status character varying,
    assigned_at date,
    due_date date,
    created_date date
);


--
-- Name: work_orders_work_order_id_seq; Type: SEQUENCE; Schema: main; Owner: -
--

CREATE SEQUENCE main.work_orders_work_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: work_orders_work_order_id_seq; Type: SEQUENCE OWNED BY; Schema: main; Owner: -
--

ALTER SEQUENCE main.work_orders_work_order_id_seq OWNED BY main.work_orders.work_order_id;


--
-- Name: users; Type: TABLE; Schema: security; Owner: -
--

CREATE TABLE security.users (
    user_id integer NOT NULL,
    email_id character varying,
    password character varying,
    created_at timestamp without time zone,
    update_at timestamp without time zone,
    role_id integer,
    CONSTRAINT users_email_lowercase CHECK (((email_id)::text = lower(TRIM(BOTH FROM email_id))))
);


--
-- Name:   users_user_id_seq; Type: SEQUENCE; Schema: security; Owner: -
--

CREATE SEQUENCE security."  users_user_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name:   users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: security; Owner: -
--

ALTER SEQUENCE security."  users_user_id_seq" OWNED BY security.users.user_id;


--
-- Name: invites; Type: TABLE; Schema: security; Owner: -
--

CREATE TABLE security.invites (
    invite_id integer NOT NULL,
    invitee_email character varying(255) NOT NULL,
    role_id integer NOT NULL,
    service_center_id integer NOT NULL,
    invited_by_user_id integer NOT NULL,
    token text NOT NULL,
    is_used boolean DEFAULT false,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT invites_email_lowercase CHECK (((invitee_email)::text = lower(TRIM(BOTH FROM invitee_email))))
);


--
-- Name: invites_invite_id_seq; Type: SEQUENCE; Schema: security; Owner: -
--

CREATE SEQUENCE security.invites_invite_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invites_invite_id_seq; Type: SEQUENCE OWNED BY; Schema: security; Owner: -
--

ALTER SEQUENCE security.invites_invite_id_seq OWNED BY security.invites.invite_id;


--
-- Name: user_profile; Type: TABLE; Schema: security; Owner: -
--

CREATE TABLE security.user_profile (
    profile_id integer NOT NULL,
    user_id integer,
    date_of_joining date,
    first_name character varying,
    last_name character varying,
    created_at timestamp without time zone,
    update_at timestamp without time zone,
    phone_number character varying,
    service_center_id integer
);


--
-- Name: profile_profile_id_seq; Type: SEQUENCE; Schema: security; Owner: -
--

CREATE SEQUENCE security.profile_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: profile_profile_id_seq; Type: SEQUENCE OWNED BY; Schema: security; Owner: -
--

ALTER SEQUENCE security.profile_profile_id_seq OWNED BY security.user_profile.profile_id;


--
-- Name: roles; Type: TABLE; Schema: security; Owner: -
--

CREATE TABLE security.roles (
    role_id integer NOT NULL,
    role_name character varying
);


--
-- Name: roles_role_id_seq; Type: SEQUENCE; Schema: security; Owner: -
--

CREATE SEQUENCE security.roles_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_role_id_seq; Type: SEQUENCE OWNED BY; Schema: security; Owner: -
--

ALTER SEQUENCE security.roles_role_id_seq OWNED BY security.roles.role_id;


--
-- Name: service_center_profile; Type: TABLE; Schema: security; Owner: -
--

CREATE TABLE security.service_center_profile (
    service_center_name character varying,
    service_center_address character varying,
    user_id integer,
    service_center_id integer NOT NULL
);


--
-- Name: service_center_profile_service_center_id_seq; Type: SEQUENCE; Schema: security; Owner: -
--

CREATE SEQUENCE security.service_center_profile_service_center_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_center_profile_service_center_id_seq; Type: SEQUENCE OWNED BY; Schema: security; Owner: -
--

ALTER SEQUENCE security.service_center_profile_service_center_id_seq OWNED BY security.service_center_profile.service_center_id;


--
-- Name: expert_types expert_type_id; Type: DEFAULT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.expert_types ALTER COLUMN expert_type_id SET DEFAULT nextval('main." expert_types_expert_type_id_seq"'::regclass);


--
-- Name: invites invite_id; Type: DEFAULT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.invites ALTER COLUMN invite_id SET DEFAULT nextval('main.invites_invite_id_seq'::regclass);


--
-- Name: issues issue_id; Type: DEFAULT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.issues ALTER COLUMN issue_id SET DEFAULT nextval('main.issues_issue_id_seq'::regclass);


--
-- Name: status_history history_id ; Type: DEFAULT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.status_history ALTER COLUMN "history_id " SET DEFAULT nextval('main."         status_history_history_id _seq"'::regclass);


--
-- Name: work_orders work_order_id; Type: DEFAULT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.work_orders ALTER COLUMN work_order_id SET DEFAULT nextval('main.work_orders_work_order_id_seq'::regclass);


--
-- Name: invites invite_id; Type: DEFAULT; Schema: security; Owner: -
--

ALTER TABLE ONLY security.invites ALTER COLUMN invite_id SET DEFAULT nextval('security.invites_invite_id_seq'::regclass);


--
-- Name: roles role_id; Type: DEFAULT; Schema: security; Owner: -
--

ALTER TABLE ONLY security.roles ALTER COLUMN role_id SET DEFAULT nextval('security.roles_role_id_seq'::regclass);


--
-- Name: service_center_profile service_center_id; Type: DEFAULT; Schema: security; Owner: -
--

ALTER TABLE ONLY security.service_center_profile ALTER COLUMN service_center_id SET DEFAULT nextval('security.service_center_profile_service_center_id_seq'::regclass);


--
-- Name: user_profile profile_id; Type: DEFAULT; Schema: security; Owner: -
--

ALTER TABLE ONLY security.user_profile ALTER COLUMN profile_id SET DEFAULT nextval('security.profile_profile_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: security; Owner: -
--

ALTER TABLE ONLY security.users ALTER COLUMN user_id SET DEFAULT nextval('security."  users_user_id_seq"'::regclass);


--
-- Name: status_history          status_history_pkey; Type: CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.status_history
    ADD CONSTRAINT "         status_history_pkey" PRIMARY KEY ("history_id ");


--
-- Name: expert_types  expert_types_pkey; Type: CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.expert_types
    ADD CONSTRAINT " expert_types_pkey" PRIMARY KEY (expert_type_id);


--
-- Name: invites invites_pkey; Type: CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.invites
    ADD CONSTRAINT invites_pkey PRIMARY KEY (invite_id);


--
-- Name: invites invites_token_key; Type: CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.invites
    ADD CONSTRAINT invites_token_key UNIQUE (token);


--
-- Name: issues issues_pkey; Type: CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.issues
    ADD CONSTRAINT issues_pkey PRIMARY KEY (issue_id);


--
-- Name: work_orders work_orders_pkey; Type: CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.work_orders
    ADD CONSTRAINT work_orders_pkey PRIMARY KEY (work_order_id);


--
-- Name: users   users_pkey; Type: CONSTRAINT; Schema: security; Owner: -
--

ALTER TABLE ONLY security.users
    ADD CONSTRAINT "  users_pkey" PRIMARY KEY (user_id);


--
-- Name: users email_id unique key; Type: CONSTRAINT; Schema: security; Owner: -
--

ALTER TABLE ONLY security.users
    ADD CONSTRAINT "email_id unique key" UNIQUE (email_id);


--
-- Name: invites invites_pkey; Type: CONSTRAINT; Schema: security; Owner: -
--

ALTER TABLE ONLY security.invites
    ADD CONSTRAINT invites_pkey PRIMARY KEY (invite_id);


--
-- Name: invites invites_token_key; Type: CONSTRAINT; Schema: security; Owner: -
--

ALTER TABLE ONLY security.invites
    ADD CONSTRAINT invites_token_key UNIQUE (token);


--
-- Name: user_profile profile_pkey; Type: CONSTRAINT; Schema: security; Owner: -
--

ALTER TABLE ONLY security.user_profile
    ADD CONSTRAINT profile_pkey PRIMARY KEY (profile_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: security; Owner: -
--

ALTER TABLE ONLY security.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);


--
-- Name: service_center_profile serice_center_pk; Type: CONSTRAINT; Schema: security; Owner: -
--

ALTER TABLE ONLY security.service_center_profile
    ADD CONSTRAINT serice_center_pk PRIMARY KEY (service_center_id);


--
-- Name: idx_issues_service_center_issue_id; Type: INDEX; Schema: main; Owner: -
--

CREATE INDEX idx_issues_service_center_issue_id ON main.issues USING btree (service_center_id, issue_id DESC);


--
-- Name: idx_service_center_profile_user_id; Type: INDEX; Schema: security; Owner: -
--

CREATE INDEX idx_service_center_profile_user_id ON security.service_center_profile USING btree (user_id);


--
-- Name: idx_user_profile_user_id; Type: INDEX; Schema: security; Owner: -
--

CREATE INDEX idx_user_profile_user_id ON security.user_profile USING btree (user_id);


--
-- Name: unique_active_invite; Type: INDEX; Schema: security; Owner: -
--

CREATE UNIQUE INDEX unique_active_invite ON security.invites USING btree (invitee_email, role_id, service_center_id) WHERE (is_used = false);


--
-- Name: status_history fk(changed_by); Type: FK CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.status_history
    ADD CONSTRAINT "fk(changed_by)" FOREIGN KEY (changed_by) REFERENCES security.users(user_id) ON UPDATE CASCADE NOT VALID;


--
-- Name: issues fk(created_by); Type: FK CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.issues
    ADD CONSTRAINT "fk(created_by)" FOREIGN KEY (created_by) REFERENCES security.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- Name: invites fk(invite_by); Type: FK CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.invites
    ADD CONSTRAINT "fk(invite_by)" FOREIGN KEY (invited_by) REFERENCES security.users(user_id) ON UPDATE CASCADE NOT VALID;


--
-- Name: invites fk(role_id); Type: FK CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.invites
    ADD CONSTRAINT "fk(role_id)" FOREIGN KEY (role_id) REFERENCES security.roles(role_id) ON UPDATE CASCADE NOT VALID;


--
-- Name: experts fk(service_center); Type: FK CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.experts
    ADD CONSTRAINT "fk(service_center)" FOREIGN KEY (service_center_id) REFERENCES security.service_center_profile(service_center_id) NOT VALID;


--
-- Name: invites fk(service_center_id); Type: FK CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.invites
    ADD CONSTRAINT "fk(service_center_id)" FOREIGN KEY (service_center_id) REFERENCES security.service_center_profile(service_center_id) ON UPDATE CASCADE NOT VALID;


--
-- Name: issues fk(service_center_id); Type: FK CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.issues
    ADD CONSTRAINT "fk(service_center_id)" FOREIGN KEY (service_center_id) REFERENCES security.service_center_profile(service_center_id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- Name: experts fk(user_id); Type: FK CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.experts
    ADD CONSTRAINT "fk(user_id)" FOREIGN KEY (user_id) REFERENCES security.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- Name: status_history fk(work_order); Type: FK CONSTRAINT; Schema: main; Owner: -
--

ALTER TABLE ONLY main.status_history
    ADD CONSTRAINT "fk(work_order)" FOREIGN KEY ("work_order_id ") REFERENCES main.work_orders(work_order_id) ON UPDATE CASCADE NOT VALID;


--
-- Name: invites fk(invited_by_user_id); Type: FK CONSTRAINT; Schema: security; Owner: -
--

ALTER TABLE ONLY security.invites
    ADD CONSTRAINT "fk(invited_by_user_id)" FOREIGN KEY (invited_by_user_id) REFERENCES security.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- Name: invites fk(role_id); Type: FK CONSTRAINT; Schema: security; Owner: -
--

ALTER TABLE ONLY security.invites
    ADD CONSTRAINT "fk(role_id)" FOREIGN KEY (role_id) REFERENCES security.roles(role_id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- Name: users fk(role_id); Type: FK CONSTRAINT; Schema: security; Owner: -
--

ALTER TABLE ONLY security.users
    ADD CONSTRAINT "fk(role_id)" FOREIGN KEY (role_id) REFERENCES security.roles(role_id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- Name: invites fk(service_center_id); Type: FK CONSTRAINT; Schema: security; Owner: -
--

ALTER TABLE ONLY security.invites
    ADD CONSTRAINT "fk(service_center_id)" FOREIGN KEY (service_center_id) REFERENCES security.service_center_profile(service_center_id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- Name: user_profile fk(user_id); Type: FK CONSTRAINT; Schema: security; Owner: -
--

ALTER TABLE ONLY security.user_profile
    ADD CONSTRAINT "fk(user_id)" FOREIGN KEY (user_id) REFERENCES security.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- Name: service_center_profile fk(user_id); Type: FK CONSTRAINT; Schema: security; Owner: -
--

ALTER TABLE ONLY security.service_center_profile
    ADD CONSTRAINT "fk(user_id)" FOREIGN KEY (user_id) REFERENCES security.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- PostgreSQL database dump complete
--

