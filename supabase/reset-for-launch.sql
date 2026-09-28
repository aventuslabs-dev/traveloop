-- ============================================================================
-- GO-LIVE RESET — destroys every customer record in this database.
--
-- Run once, when the test period is over and before the first real customer.
-- There is no undo. Take a backup first: Supabase Dashboard > Database >
-- Backups, and confirm it completed before running anything below.
--
-- What survives: one admin account, and the Urban Sprint event settings row.
-- What does not: every order, invoice, registration, passport number,
-- experience booking, checkout draft, and every other Auth account.
--
-- This does NOT touch Stripe. Stripe keeps live and test data in separate
-- ledgers already, so your test payments are not in the live dashboard and
-- there is nothing to clean up there.
--
-- HOW TO RUN: Supabase Dashboard > SQL Editor > New query. Paste STEP 0 first
-- and read what it tells you. Then, and only then, run STEP 1.
-- ============================================================================


-- ============================================================================
-- STEP 0 — PREVIEW. Read-only. Deletes nothing.
--
-- Run this on its own first. It shows exactly what STEP 1 would destroy, and
-- confirms the admin account it intends to keep actually exists.
-- ============================================================================

-- Your admin address appears twice in this file — once in the query at the end
-- of this step, once in the guard in STEP 1. Change BOTH to match
-- ADMIN_LOGIN_EMAIL in your Vercel Production env. They must match it exactly.

select 'orders'              as table_name, count(*) from orders
union all select 'pass_registrations',   count(*) from pass_registrations
union all select 'experience_bookings',  count(*) from experience_bookings
union all select 'checkout_drafts',      count(*) from checkout_drafts
union all select 'customer_profiles',    count(*) from customer_profiles
union all select 'auth.users (total)',   count(*) from auth.users
union all select 'urban sprint profiles', count(*) from us_profiles
union all select 'urban sprint bookings', count(*) from us_bookings
order by table_name;

-- The account that will be kept. Zero rows here means STEP 1 will abort.
select id, email, created_at, last_sign_in_at
from auth.users
where lower(email) = lower('traveloopmy@gmail.com');


-- ============================================================================
-- STEP 1 — THE RESET. Destructive. Run only after STEP 0 looked right.
--
-- Everything is one transaction: if any statement fails, nothing is deleted.
-- The guard at the top aborts before touching a row if the admin account is
-- missing, so a typo in the email cannot leave you with an empty database and
-- no way into /admin.
-- ============================================================================

begin;

do $$
declare
  -- Must match ADMIN_LOGIN_EMAIL in the Vercel Production env exactly. The
  -- guard below only checks that this account exists in Supabase — it cannot
  -- see Vercel, so a mismatch between the two still locks you out of /admin.
  admin_email constant text := 'traveloopmy@gmail.com';

  -- Second account kept as a lockout safety net, because ADMIN_LOGIN_EMAIL is
  -- a Sensitive var in Vercel and cannot be read back to prove which of the
  -- two it is. Whichever one /admin actually signs in as, it survives. Delete
  -- the leftover by hand once /admin has been confirmed working.
  spare_email constant text := 'admin@traveloop.internal';

  admin_id uuid;
  spare_id uuid;
  removed  bigint;
begin
  select id into admin_id
  from auth.users
  where lower(email) = lower(admin_email);

  if admin_id is null then
    raise exception
      'No Auth account exists for %. NOTHING HAS BEEN DELETED. Create it first (Authentication > Users > Add user) or correct the email in this script.',
      admin_email;
  end if;

  select id into spare_id
  from auth.users
  where lower(email) = lower(spare_email);

  raise notice 'Keeping admin % (%)', admin_email, admin_id;
  if spare_id is null then
    raise notice 'Spare % not present; nothing to keep for it.', spare_email;
  else
    raise notice 'Keeping spare % (%)', spare_email, spare_id;
  end if;

  -- --------------------------------------------------------------------
  -- Commerce data.
  --
  -- Most of this would cascade from `orders` or from `auth.users` below,
  -- but deleting each table by name states the intent plainly and means the
  -- row counts in STEP 2 are checking something real rather than trusting a
  -- cascade to have reached everywhere.
  --
  -- checkout_drafts holds passport numbers and addresses for carts that were
  -- never paid for. It is not referenced by anything, so it goes first and
  -- independently.
  -- --------------------------------------------------------------------
  delete from experience_bookings;
  delete from pass_registrations;
  delete from checkout_drafts;
  delete from orders;

  delete from customer_profiles
  where user_id is distinct from admin_id
    and (spare_id is null or user_id is distinct from spare_id);

  -- --------------------------------------------------------------------
  -- Every Auth account except the admin.
  --
  -- NOTE: us_profiles.user_id cascades from here, so this also removes every
  -- Urban Sprint player, gamemaster and organiser that is not the admin. That
  -- is intended for a full pre-launch reset — if it is not what you want,
  -- stop now and say so, because there is no partial version of this line.
  -- --------------------------------------------------------------------
  delete from auth.users
  where id <> admin_id
    and (spare_id is null or id <> spare_id);
  get diagnostics removed = row_count;
  raise notice 'Deleted % Auth account(s).', removed;
end $$;

-- --------------------------------------------------------------------------
-- Restart the identity sequences.
--
-- This is the part that is easy to forget and impossible to fix tidily later.
-- Invoice numbers and booking references are derived from the row id, not
-- stored counters: `INV-2026-0001` is orders.id, `TLX-2026-0004` is
-- experience_bookings.id (see invoiceNumberFor / referenceFor in src/lib).
-- Deleting rows leaves the sequence where it was, so without this your first
-- real customer receives an invoice numbered in the forties and your books
-- open with a gap you cannot explain to an auditor.
--
-- Safe only because every row in these tables was just deleted — restarting a
-- sequence on a populated table would hand out ids that already exist.
-- --------------------------------------------------------------------------
alter table orders              alter column id restart with 1;
alter table experience_bookings alter column id restart with 1;
alter table pass_registrations  alter column id restart with 1;

commit;


-- ============================================================================
-- STEP 2 — VERIFY. Read-only. Every count should be 0, except auth.users = 1.
-- ============================================================================

select 'orders'               as table_name, count(*) from orders
union all select 'pass_registrations',    count(*) from pass_registrations
union all select 'experience_bookings',   count(*) from experience_bookings
union all select 'checkout_drafts',       count(*) from checkout_drafts
union all select 'customer_profiles',     count(*) from customer_profiles
union all select 'auth.users (expect 1)', count(*) from auth.users
order by table_name;

-- Confirms the sequences were restarted, without consuming an id to find out.
-- A freshly restarted sequence reads back as last_value 1 with is_called false
-- (some versions show last_value null) — either means the next order is id 1,
-- and therefore invoice INV-<year>-0001.
-- pg_sequences has no is_called column, so read the live value with
-- pg_sequence_last_value(): it returns null for a sequence that has not handed
-- out an id since the restart, which is exactly the state we want to see.
select sequencename,
       pg_sequence_last_value(('public.' || sequencename)::regclass) as live_last_value,
       pg_sequence_last_value(('public.' || sequencename)::regclass) is null as is_fresh
from pg_sequences
where schemaname = 'public'
  and sequencename in (
    'orders_id_seq',
    'experience_bookings_id_seq',
    'pass_registrations_id_seq'
  )
order by sequencename;

-- And that the admin can still sign in.
select id, email from auth.users;


-- ============================================================================
-- STEP 3 — Urban Sprint game data. Destructive. Run after STEP 2.
--
-- The block above removed Urban Sprint *accounts* (via the cascade) but left
-- the game itself: teams, stations, boosters, categories and the completion
-- ledger. Teams survive with a null gamemaster, which is a valid state.
--
-- Uncomment and run this only if you also want the event reset to empty.
-- Deletion order matters here: us_completions references stations and
-- categories with `on delete restrict`, so it has to go first — Postgres will
-- refuse the whole thing otherwise rather than leave it half done.
--
-- us_settings is deliberately untouched: row id=1 is event configuration
-- (name, tagline, status, default points), not data from a test run.
--
-- There is also `node supabase/reset-urban-sprint.mjs`, which resets scores and
-- releases teams while KEEPING the seeded stations and accounts. That is the
-- gentler option, and probably the one you want between two real events.
-- ============================================================================

begin;

-- Team bookings made while testing. Participants cascade with them.
delete from us_bookings;
delete from us_completions;
delete from us_team_members;
delete from us_teams;
delete from us_stations;
delete from us_boosters;
delete from us_categories;

commit;

-- Verify: all zero, and us_settings still holding its single config row.
select 'us_completions'  as table_name, count(*) from us_completions
union all select 'us_team_members',     count(*) from us_team_members
union all select 'us_teams',            count(*) from us_teams
union all select 'us_stations',         count(*) from us_stations
union all select 'us_boosters',         count(*) from us_boosters
union all select 'us_categories',       count(*) from us_categories
union all select 'us_profiles',         count(*) from us_profiles
union all select 'us_bookings',         count(*) from us_bookings
union all select 'us_settings (keep 1)', count(*) from us_settings
order by table_name;
