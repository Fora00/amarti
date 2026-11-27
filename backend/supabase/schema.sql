-- aMarti ceramics — database.
--
-- Run once in the Supabase SQL editor (Project → SQL editor → paste → Run).
-- Safe to re-run: every statement is idempotent.
--
-- SECURITY MODEL (read this before changing anything)
--   * Every table has row-level security ON and exactly one policy: the
--     signed-in user must be listed in `staff`. The public anon key can
--     therefore read and write NOTHING by itself — with ONE exception: it may
--     read the visible rows of `listino` (the shop's prices, public anyway)
--     and the free future slots of `disponibilita` (day + times, nothing else).
--   * The public website never touches these tables. Its forms POST to the
--     `request` edge function (an `inbox` row) and the `signup` edge function
--     (a `signups` row), which write with the service role.
--   * Turn OFF "Allow new users to sign up" (Authentication → Sign In / Up)
--     and add the owner's address to `staff`. Both layers matter: with sign-up
--     off nobody else can create an account, and `is_staff()` would still
--     refuse a stranger who somehow had one.
--
-- Add your own tables below the inbox, with the same one-policy rule: put the
-- name in the array in the RLS block.

create extension if not exists pgcrypto;

create table if not exists staff (
  email text primary key check (email = lower(email))
);

-- Lower-case compare, because magic-link emails are normalised by the provider.
create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff where email = lower(auth.jwt() ->> 'email')
  );
$$;

-- Written ONLY by edge functions (service role). `payload` is untrusted text:
-- the app renders it with textContent, never as HTML.
create table if not exists inbox (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('message')),
  payload    jsonb not null,
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists inbox_open_idx on inbox (handled, created_at desc);

-- Course sign-ups from the event pages (the `signup` edge function, service
-- role). Free: payment is a SumUp link the owner sends by hand once a course
-- reaches its minimum, and she moves `status` in the app. All text columns are
-- untrusted visitor input: render with textContent, never as HTML.
create table if not exists signups (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,          -- the site's event entry id (file name without .md), e.g. '2026-12-14-tazza-natale-day-1'
  nome text not null,
  cognome text not null,
  email text not null,
  telefono text not null,
  note text,
  privacy_at timestamptz not null, -- when the visitor ticked the privacy consent
  status text not null default 'iscritta'
    check (status in ('iscritta','confermata','pagato','attesa','annullata')),
  created_at timestamptz not null default now()
);
create index if not exists signups_event_idx on signups (event_id, created_at);
-- Which privacy text the visitor accepted (the version string on /privacy/).
-- Null for sign-ups taken before the column existed (text "bozza-2026-11-27").
alter table signups add column if not exists privacy_version text
  check (privacy_version is null or length(privacy_version) <= 40);

-- Optional, separate consent (unticked box on the sign-up form) to receive
-- course suggestions based on what the person likes (marketing + light
-- profiling: GDPR art. 6.1.a / 21-22; privacy text "consigli"). False = never
-- suggest anything to them.
alter table signups add column if not exists consenso_consigli boolean not null default false;

-- One row per person the owner has looked at, keyed by lower-case email (the
-- same person signs up many times). Only what SHE adds: interests (tags) and a
-- note; `consigli_revocati_at` = the person asked for no more suggestions
-- (wins over any older consent). Staff-only, never written by the site.
create table if not exists persone (
  email                text primary key check (email = lower(email)),
  interessi            text[] not null default '{}',
  note                 text check (note is null or length(note) <= 1000),
  consigli_revocati_at timestamptz,
  updated_at           timestamptz not null default now()
);

-- Which suggestion was sent to whom, so nobody gets the same course twice.
create table if not exists consigli_inviati (
  email    text not null check (email = lower(email)),
  event_id text not null,
  sent_at  timestamptz not null default now(),
  primary key (email, event_id)
);

-- What the owner sets per course in the dashboard. Keyed by the course id =
-- the site's day-1 event id (same as `signups.event_id` for day 1). No row =
-- nothing set yet. Written only by staff through the app.
create table if not exists corsi (
  event_id   text primary key,
  -- The SumUp payment link she sends to the confirmed attendees of this course.
  sumup_link text check (sumup_link is null or sumup_link ~ '^https://[^[:space:]]{4,300}$'),
  -- Preference tags ("ceramica", "candele", "bambini"…): match courses to people.
  tags       text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table corsi add column if not exists tags text[] not null default '{}';

-- The shop's price list (pieces with a fixed price), edited in the dashboard.
-- The ONLY table the public may read: the site fetches the visible rows at
-- build time with the anon key (policy `public_read` below). Nothing here is
-- personal data.
create table if not exists listino (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (length(nome) between 1 and 120),
  descrizione text check (descrizione is null or length(descrizione) <= 500),
  -- Euro cents; null = "prezzo su richiesta".
  prezzo_cents integer check (prezzo_cents is null or prezzo_cents between 0 and 10000000),
  ordine      integer not null default 0,
  visibile    boolean not null default true,
  updated_at  timestamptz not null default now()
);
create index if not exists listino_order_idx on listino (ordine, nome);

-- Room booking, "Calendly style" (user, 2026-11-27): the owner opens slots in the
-- dashboard (Sala → Disponibilità); the site shows the free future ones (read at
-- build time with the anon key, policy `public_read` below: only id + day +
-- times + state); a visitor picks one and sends a request (`room-request` edge
-- function, service role), which turns the slot `richiesto` so nobody else can
-- take it; she then contacts the person. Day and times are wall-clock Rovereto.
create table if not exists disponibilita (
  id         uuid primary key default gen_random_uuid(),
  giorno     date not null,
  inizio     time not null,
  fine       time not null check (fine > inizio),
  stato      text not null default 'libero' check (stato in ('libero','richiesto','confermato')),
  created_at timestamptz not null default now(),
  unique (giorno, inizio)
);
create index if not exists disponibilita_day_idx on disponibilita (giorno, inizio);

-- A visitor's request for one slot. Untrusted text: render with textContent.
create table if not exists richieste_sala (
  id              uuid primary key default gen_random_uuid(),
  slot_id         uuid references disponibilita(id) on delete set null,
  -- Copied from the slot at request time, so the request still reads right if the slot is deleted.
  giorno          date not null,
  inizio          time not null,
  fine            time not null,
  tipo            text not null check (tipo in ('compleanno','attivita','altro')),
  persone         integer check (persone is null or persone between 1 and 500),
  nome            text not null,
  cognome         text not null,
  email           text not null,
  telefono        text not null,
  note            text,
  privacy_at      timestamptz not null,
  privacy_version text check (privacy_version is null or length(privacy_version) <= 40),
  stato           text not null default 'nuova' check (stato in ('nuova','contattata','confermata','annullata')),
  created_at      timestamptz not null default now()
);
create index if not exists richieste_sala_idx on richieste_sala (stato, created_at desc);

-- -- row-level security --------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['staff', 'inbox', 'signups', 'corsi', 'listino', 'disponibilita', 'richieste_sala', 'persone', 'consigli_inviati'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists staff_only on %I', t);
    if t = 'staff' then
      -- Nobody edits the allow-list through the API; do it in the SQL editor.
      execute 'create policy staff_only on staff for select using (is_staff())';
    else
      execute format(
        'create policy staff_only on %I for all using (is_staff()) with check (is_staff())', t);
    end if;
  end loop;
end $$;

-- The anon role gets no table privileges at all, as a second wall behind RLS.
revoke all on all tables in schema public from anon;

-- The one exception: the visible rows of the price list, read-only, so the site
-- build can show prices. Must come AFTER the revoke above.
grant select on listino to anon;
drop policy if exists public_read on listino;
create policy public_read on listino for select to anon using (visibile);

-- …and the FREE, FUTURE room slots, with only the columns the booking page needs.
grant select (id, giorno, inizio, fine, stato) on disponibilita to anon;
drop policy if exists public_read on disponibilita;
create policy public_read on disponibilita for select to anon
  using (stato = 'libero' and giorno >= current_date);

-- -- one-time setup, run by hand after the first deploy -------------------------
--   insert into staff (email) values ('owner@example.com');   -- the real address
