-- aMarti ceramics — database.
--
-- Run once in the Supabase SQL editor (Project → SQL editor → paste → Run).
-- Safe to re-run: every statement is idempotent.
--
-- SECURITY MODEL (read this before changing anything)
--   * Every table has row-level security ON and exactly one policy: the
--     signed-in user must be listed in `staff`. The public anon key can
--     therefore read and write NOTHING by itself.
--   * The public website never touches these tables. Its form POSTs to the
--     `request` edge function, which writes an `inbox` row with the service
--     role.
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

-- -- row-level security --------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['staff', 'inbox'] loop
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

-- -- one-time setup, run by hand after the first deploy -------------------------
--   insert into staff (email) values ('owner@example.com');   -- the real address
