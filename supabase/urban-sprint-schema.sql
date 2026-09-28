-- Urban Sprint — schema for the Amazing Race-style campaign extension.
--
-- Run this in the Supabase SQL editor AFTER schema.sql (Project > SQL Editor >
-- New query). Safe to re-run: every statement is idempotent.
--
-- Everything here is prefixed `us_` and is deliberately disjoint from the
-- Traveloop tables. The only shared object is auth.users: an Urban Sprint
-- account is a Supabase Auth user *plus* a row in us_profiles, and it is that
-- row — not the auth session — which grants any Urban Sprint access. A
-- Traveloop customer with no us_profiles row has none, and an Urban Sprint
-- admin is not the Traveloop operator (that stays ADMIN_LOGIN_EMAIL), so
-- neither side inherits the other's permissions.
--
-- Like the Traveloop tables, RLS is enabled with no policies: the app reaches
-- these tables exclusively through the service-role client in server code
-- (src/lib/urban-sprint/*), so RLS denying by default is the intent, not an
-- oversight. Scores are never written from the browser.


-- ---------------------------------------------------------------------------
-- Settings — one row, id = 1.
-- ---------------------------------------------------------------------------
-- `revision` is the live-update cursor: every scoring-relevant write bumps it
-- (see us_bump_revision below) and /urban-sprint/api/pulse hands it to the
-- browser, which refreshes when the number moves. Keeping it in one row makes
-- the poll a single-row primary-key read.
create table if not exists us_settings (
  id smallint primary key default 1 check (id = 1),
  event_name text not null default 'Urban Sprint',
  event_tagline text not null default 'One city. Twelve teams. Three hours of chaos.',
  -- Drives the public landing page's status banner.
  event_status text not null default 'upcoming'
    check (event_status in ('upcoming', 'live', 'paused', 'ended')),
  event_starts_at timestamptz,
  event_location text not null default 'George Town, Penang',
  -- The base points a newly created Station starts with. Editable here rather
  -- than hardcoded in the form.
  default_base_points numeric(10, 2) not null default 30,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table us_settings enable row level security;

insert into us_settings (id) values (1) on conflict (id) do nothing;

create or replace function us_bump_revision() returns void as $$
  update us_settings set revision = revision + 1, updated_at = now() where id = 1;
$$ language sql;

-- Generic AFTER trigger for tables whose changes should wake up open clients.
create or replace function us_touch_revision() returns trigger as $$
begin
  perform us_bump_revision();
  return null;
end;
$$ language plpgsql;


-- ---------------------------------------------------------------------------
-- Profiles — the Urban Sprint role, and the gate for the whole extension.
-- ---------------------------------------------------------------------------
create table if not exists us_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'gamemaster', 'participant')),
  display_name text not null default '',
  phone text,
  -- Lets an admin suspend an account without deleting it (and losing the
  -- completion history that references it).
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table us_profiles enable row level security;

create index if not exists us_profiles_role_idx on us_profiles (role, created_at desc);


-- ---------------------------------------------------------------------------
-- Categories — shared vocabulary for Stations and Boosters.
-- ---------------------------------------------------------------------------
create table if not exists us_categories (
  id bigint generated always as identity primary key,
  name text not null,
  -- Stable machine name; the display `name` can be renamed without breaking
  -- anything that stored a reference.
  slug text not null unique,
  -- Hex accent used for the category chip on every surface.
  color text not null default '#7c5cff',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table us_categories enable row level security;

drop trigger if exists us_categories_revision on us_categories;
create trigger us_categories_revision
  after insert or update or delete on us_categories
  for each statement execute function us_touch_revision();


-- ---------------------------------------------------------------------------
-- Boosters — a category plus the bonus percentage awarded on a match.
-- ---------------------------------------------------------------------------
-- bonus_percent is per-booster data, never a constant in application code, so
-- an operator can run "+25%" one weekend and "+40%" the next without a deploy.
create table if not exists us_boosters (
  id bigint generated always as identity primary key,
  name text not null,
  category_id bigint not null references us_categories(id) on delete restrict,
  bonus_percent numeric(6, 2) not null default 25 check (bonus_percent >= 0),
  description text not null default '',
  -- Only active boosters are eligible for the draw. Deactivating one leaves
  -- teams that already drew it untouched.
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table us_boosters enable row level security;

create index if not exists us_boosters_active_idx on us_boosters (active);

drop trigger if exists us_boosters_revision on us_boosters;
create trigger us_boosters_revision
  after insert or update or delete on us_boosters
  for each statement execute function us_touch_revision();


-- ---------------------------------------------------------------------------
-- Teams.
-- ---------------------------------------------------------------------------
-- cached_points / cached_completions are a *derived* cache, rebuilt from
-- us_completions by trigger — never incremented in application code. The
-- completion rows remain the source of truth, so voiding one recomputes the
-- total correctly instead of leaving a drifted counter behind.
create table if not exists us_teams (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null unique,
  color text not null default '#ff5c38',
  -- A team is claimed by exactly one gamemaster, and a gamemaster runs
  -- exactly one team — enforced by the unique index below, so two phones
  -- racing to claim the same team cannot both win.
  --
  -- These people columns reference us_profiles rather than auth.users: it
  -- makes "only an Urban Sprint account can hold this role" a database rule,
  -- and it gives PostgREST a relationship to embed the person's name through.
  -- us_profiles cascades from auth.users, so deleting the auth account still
  -- propagates.
  gamemaster_id uuid references us_profiles(user_id) on delete set null,
  claimed_at timestamptz,
  booster_id bigint references us_boosters(id) on delete set null,
  booster_drawn_at timestamptz,
  cached_points numeric(12, 2) not null default 0,
  cached_completions integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table us_teams enable row level security;

-- One team per gamemaster. Partial so the many unclaimed teams (NULL) don't
-- collide with each other.
create unique index if not exists us_teams_one_team_per_gamemaster
  on us_teams (gamemaster_id)
  where gamemaster_id is not null;

create index if not exists us_teams_leaderboard_idx
  on us_teams (cached_points desc, cached_completions desc, created_at asc);

drop trigger if exists us_teams_revision on us_teams;
create trigger us_teams_revision
  after insert or update or delete on us_teams
  for each statement execute function us_touch_revision();


-- ---------------------------------------------------------------------------
-- Team membership — participants.
-- ---------------------------------------------------------------------------
-- user_id is the primary key, not (team_id, user_id): a participant belongs
-- to at most one team, so reassigning is an upsert rather than a
-- delete-then-insert that could momentarily leave them on two.
create table if not exists us_team_members (
  user_id uuid primary key references us_profiles(user_id) on delete cascade,
  team_id bigint not null references us_teams(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table us_team_members enable row level security;

create index if not exists us_team_members_team_idx on us_team_members (team_id);

drop trigger if exists us_team_members_revision on us_team_members;
create trigger us_team_members_revision
  after insert or update or delete on us_team_members
  for each statement execute function us_touch_revision();


-- ---------------------------------------------------------------------------
-- Stations — the participating shops.
-- ---------------------------------------------------------------------------
create table if not exists us_stations (
  id bigint generated always as identity primary key,
  name text not null,
  business_name text not null default '',
  category_id bigint not null references us_categories(id) on delete restrict,
  address text not null default '',
  instructions text not null default '',
  -- Seeded from us_settings.default_base_points at creation time, then
  -- editable per station.
  base_points numeric(10, 2) not null default 30 check (base_points >= 0),
  active boolean not null default true,
  -- Gamemasters may add a station they find in the field; this records who.
  created_by uuid references us_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table us_stations enable row level security;

create index if not exists us_stations_active_idx on us_stations (active, name);
create index if not exists us_stations_category_idx on us_stations (category_id);

drop trigger if exists us_stations_revision on us_stations;
create trigger us_stations_revision
  after insert or update or delete on us_stations
  for each statement execute function us_touch_revision();


-- ---------------------------------------------------------------------------
-- Completions — the auditable score ledger.
-- ---------------------------------------------------------------------------
-- One row per station a team completed. Every number that went into the award
-- is snapshotted here, so re-pricing a station or retiring a booster later
-- cannot rewrite what a team was already given, and an admin can reconstruct
-- any score from the ledger alone.
--
-- Voiding sets status = 'void' rather than deleting: history is preserved and
-- the team total is recomputed by trigger.
create table if not exists us_completions (
  id bigint generated always as identity primary key,
  team_id bigint not null references us_teams(id) on delete cascade,
  station_id bigint not null references us_stations(id) on delete restrict,
  -- Who confirmed it. Nullable only so removing a gamemaster's account
  -- doesn't erase the score record.
  gamemaster_id uuid references us_profiles(user_id) on delete set null,
  station_name text not null,
  category_id bigint references us_categories(id) on delete set null,
  category_name text not null default '',
  base_points numeric(10, 2) not null,
  booster_id bigint references us_boosters(id) on delete set null,
  booster_name text not null default '',
  -- 0 when the booster didn't match the station's category, so the row always
  -- shows the full arithmetic.
  bonus_percent numeric(6, 2) not null default 0,
  bonus_points numeric(10, 2) not null default 0,
  booster_applied boolean not null default false,
  total_points numeric(10, 2) not null,
  status text not null default 'valid' check (status in ('valid', 'void')),
  voided_at timestamptz,
  voided_by uuid references us_profiles(user_id) on delete set null,
  void_reason text,
  created_at timestamptz not null default now()
);

alter table us_completions enable row level security;

-- The duplicate-completion guard, and the double-tap guard: a second insert
-- for the same team + station loses with a unique violation, which the action
-- layer turns into "already completed" rather than a second award. Partial on
-- status so a voided completion can legitimately be re-done later.
create unique index if not exists us_completions_one_valid_per_team_station
  on us_completions (team_id, station_id)
  where status = 'valid';

create index if not exists us_completions_team_idx on us_completions (team_id, created_at desc);
create index if not exists us_completions_feed_idx on us_completions (created_at desc);

-- Rebuilds the cached team totals from the ledger. Runs for every insert,
-- update (a void) and delete, so the cache cannot drift from the records it
-- summarises.
create or replace function us_refresh_team_totals() returns trigger as $$
declare
  target_team bigint := coalesce(new.team_id, old.team_id);
begin
  update us_teams t
  set cached_points = coalesce(
        (select sum(c.total_points) from us_completions c
          where c.team_id = t.id and c.status = 'valid'), 0),
      cached_completions = coalesce(
        (select count(*) from us_completions c
          where c.team_id = t.id and c.status = 'valid'), 0),
      updated_at = now()
  where t.id = target_team;

  perform us_bump_revision();
  return null;
end;
$$ language plpgsql;

drop trigger if exists us_completions_totals on us_completions;
create trigger us_completions_totals
  after insert or update or delete on us_completions
  for each row execute function us_refresh_team_totals();


-- ---------------------------------------------------------------------------
-- Leaderboard view.
-- ---------------------------------------------------------------------------
-- Ranking is decided here rather than in TypeScript so the public board, the
-- gamemaster's "you're 3rd" and the admin table can never disagree. rank()
-- (not row_number) so teams level on score genuinely tie; ties break on more
-- stations first, then on who was created first.
create or replace view us_leaderboard as
select
  t.id,
  t.name,
  t.slug,
  t.color,
  t.cached_points as points,
  t.cached_completions as stations_completed,
  t.booster_id,
  b.name as booster_name,
  b.bonus_percent,
  cat.name as booster_category,
  cat.color as booster_category_color,
  t.gamemaster_id,
  rank() over (
    order by t.cached_points desc, t.cached_completions desc, t.created_at asc
  ) as rank
from us_teams t
left join us_boosters b on b.id = t.booster_id
left join us_categories cat on cat.id = b.category_id
where t.active;


-- ---------------------------------------------------------------------------
-- Team bookings — how a team buys its way into a race.
-- ---------------------------------------------------------------------------
-- A booking is one team in one daily time slot, paid for once (RM450 per team
-- at launch — the price, slot times, team sizes and the five-team capacity all
-- live in src/lib/urban-sprint/booking-config.ts). Participants are recorded
-- per person because their details feed the Traveloop Card and the insurance
-- cover, which are issued per person.
--
-- The row is written *before* payment, as a hold: that's what reserves the
-- team's place while the buyer is on Stripe's page, so a slot can't sell six
-- places to six people who all started paying for the last one. What counts
-- toward a slot's capacity:
--
--   pending     — a hold, until hold_expires_at. Stripe's session expires just
--                 before it does, so a hold never outlives its checkout.
--   processing  — checkout completed but the money hasn't settled yet (FPX).
--                 Counts with no expiry: the buyer has done everything asked.
--   paid        — a confirmed team.
--
-- and what doesn't: expired (the checkout was abandoned or cancelled), failed
-- (a delayed payment never settled) and cancelled (reserved for organisers).
create extension if not exists pgcrypto with schema extensions;

-- The reference a team quotes: "US-" and eight characters from the same
-- misread-proof alphabet as pass numbers (see generate_pass_number in
-- schema.sql). It also authorises releasing an unpaid checkout, so it is
-- random rather than sequential.
create or replace function public.us_generate_booking_reference()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  result text := 'US-';
begin
  for i in 0..7 loop
    result := result || substr(alphabet, get_byte(bytes, i) % 32 + 1, 1);
  end loop;
  return result;
end;
$$;

create table if not exists us_bookings (
  id bigint generated always as identity primary key,
  reference text not null unique default public.us_generate_booking_reference(),
  -- Malaysian wall-clock date and start time, like experience_bookings: a
  -- 9 AM race is at 9 AM in George Town wherever the viewer is.
  session_date date not null,
  start_time time not null,
  team_name text not null,
  team_size integer not null check (team_size > 0),
  -- What was charged, fixed at booking time so a later price change can't
  -- rewrite what a team paid.
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'myr',
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'paid', 'expired', 'failed', 'cancelled')),
  hold_expires_at timestamptz,
  stripe_session_id text unique,
  payment_intent_id text,
  -- Whoever paid, as Stripe captured them. Not necessarily a participant:
  -- there is no team leader, so the payer is just the person with the card.
  payer_email text,
  payer_name text,
  payer_phone text,
  -- Which wording of the "I have read and understand" declaration was ticked.
  -- The final text is still to come from Traveloop; recording the version
  -- keeps it clear what each team agreed to once it changes.
  terms_version text not null,
  terms_accepted_at timestamptz not null,
  paid_at timestamptz,
  -- Same shape as orders.confirmation_*: null sent_at on a paid booking means
  -- the email hasn't reached anyone yet, and the error says why.
  confirmation_sent_at timestamptz,
  confirmation_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table us_bookings enable row level security;

create index if not exists us_bookings_slot_idx
  on us_bookings (session_date, start_time)
  where status in ('pending', 'processing', 'paid');

-- One row per person on the team, in the order they were entered.
create table if not exists us_booking_participants (
  id bigint generated always as identity primary key,
  booking_id bigint not null references us_bookings(id) on delete cascade,
  position smallint not null,
  -- As printed on the MyKad or passport: the Traveloop Card and the insurer
  -- both match on it.
  full_name text not null,
  document_type text not null check (document_type in ('mykad', 'passport')),
  -- MyKad numbers are stored normalised as YYMMDD-PB-####; passports upper-case.
  document_number text not null,
  nationality text not null,
  sex text not null check (sex in ('male', 'female')),
  age smallint not null check (age between 1 and 120),
  email text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  unique (booking_id, position)
);

alter table us_booking_participants enable row level security;

-- Five teams a slot, enforced here rather than trusted to the app: the app's
-- own check only reads a count, and two buyers reading "one place left" at the
-- same moment would both be told yes. The advisory lock makes every booking
-- for one slot take turns, so the second one counts the first.
--
-- Only a *new* claim on a slot is checked. A payment is never refused, even
-- one arriving for a hold that had already lapsed — by then the money has
-- moved, and turning a paying team away at the webhook would be worse than one
-- slot running a team over. Fulfilment logs loudly when that happens.
--
-- Keep slot_capacity in sync with SLOT_CAPACITY in booking-config.ts.
create or replace function us_check_slot_capacity()
returns trigger as $$
declare
  slot_capacity constant integer := 5;
  taken integer;
begin
  if new.status not in ('pending', 'processing', 'paid') then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.session_date = new.session_date
    and old.start_time = new.start_time
    and (
      -- Already holding its place.
      old.status in ('pending', 'processing', 'paid')
      -- Or money arriving for a hold that had lapsed: take it regardless.
      or new.status in ('processing', 'paid')
    ) then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('us_slot:' || new.session_date::text || ' ' || new.start_time::text, 0)
  );

  select count(*) into taken
  from us_bookings
  where session_date = new.session_date
    and start_time = new.start_time
    and id is distinct from new.id
    and (
      status in ('processing', 'paid')
      or (status = 'pending' and hold_expires_at > now())
    );

  if taken >= slot_capacity then
    raise exception 'us_slot_full' using errcode = 'P0001';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists us_bookings_capacity_check on us_bookings;
create trigger us_bookings_capacity_check
  before insert or update on us_bookings
  for each row execute function us_check_slot_capacity();

-- Places taken per slot, by the same rule the trigger counts with. The booking
-- page reads this rather than the rows, which carry personal details it has no
-- business fetching. security_invoker so the view doesn't hand the anon key
-- what the tables' RLS denies it.
create or replace view us_slot_bookings
with (security_invoker = true) as
select session_date, start_time, count(*)::integer as teams
from us_bookings
where status in ('processing', 'paid')
   or (status = 'pending' and hold_expires_at > now())
group by session_date, start_time;


-- ---------------------------------------------------------------------------
-- Campaign wording Traveloop is still finalising.
-- ---------------------------------------------------------------------------
-- Editable in the console (Overview > Booking wording) so a change of wording
-- is not a deploy. consent_text may carry [label](/path) links, which the
-- booking form renders as links and nothing else — it is never treated as
-- HTML. consent_version is bumped by the app whenever the wording changes, and
-- every booking records both the version and the exact text it accepted.
alter table us_settings add column if not exists rules_text text not null
  default 'Rules & Regulations will be confirmed by Traveloop before your race.';
alter table us_settings add column if not exists consent_text text not null
  default 'I have read and understand the [Terms & Conditions](/terms) and [Privacy Notice](/privacy), and I consent to Traveloop using the information submitted for marketing purposes, where applicable.';
alter table us_settings add column if not exists consent_version text not null
  default 'draft-2026-09';
-- How many teams the public results board may show; 0 means every team.
alter table us_settings add column if not exists leaderboard_limit integer not null
  default 200 check (leaderboard_limit >= 0);

alter table us_bookings add column if not exists terms_text text;


-- ---------------------------------------------------------------------------
-- Platinum Passes — every racer gets one.
-- ---------------------------------------------------------------------------
-- A paid booking becomes a Traveloop order too (orders.product =
-- 'urban_sprint', session_id = us_bookings.stripe_session_id), with a
-- Platinum Pass issued to each participant exactly as a pass purchase issues
-- them. The pass's travel-insurance registration needs a little more than
-- the race does: the trip it covers, a home address and, optionally, an
-- emergency contact. Nullable only for participants booked before this.
alter table us_booking_participants add column if not exists arrival_date date;
alter table us_booking_participants add column if not exists departure_date date;
alter table us_booking_participants add column if not exists address text;
alter table us_booking_participants add column if not exists emergency_contact_name text;
alter table us_booking_participants add column if not exists emergency_contact_phone text;
alter table us_booking_participants add column if not exists emergency_contact_relationship text;


-- ---------------------------------------------------------------------------
-- Race results — entered by staff against the Booking ID after each race.
-- ---------------------------------------------------------------------------
-- A result lives on the booking itself: the Booking ID is what links booking,
-- participants, score, timing and photos, so there is no second record to
-- keep in step. Both numbers are required before a team is ranked.
alter table us_bookings add column if not exists result_points numeric(10, 2)
  check (result_points >= 0);
alter table us_bookings add column if not exists result_seconds integer
  check (result_seconds > 0);
alter table us_bookings add column if not exists result_entered_at timestamptz;
alter table us_bookings add column if not exists result_entered_by uuid
  references us_profiles(user_id) on delete set null;

-- Wakes open leaderboards only when a result changes — not on every hold,
-- expiry and payment that also update this table.
drop trigger if exists us_bookings_results_revision on us_bookings;
create trigger us_bookings_results_revision
  after update of result_points, result_seconds on us_bookings
  for each statement execute function us_touch_revision();

-- The ranking, decided once here so the public board, "Check my ranking" and
-- the console can never disagree: more points first, then the faster time.
-- rank() rather than row_number(), so teams level on both genuinely tie.
create or replace view us_results_board
with (security_invoker = true) as
select
  b.id,
  b.reference,
  b.team_name,
  b.team_size,
  b.session_date,
  b.start_time,
  b.result_points as points,
  b.result_seconds as seconds,
  b.result_entered_at,
  rank() over (order by b.result_points desc, b.result_seconds asc) as rank
from us_bookings b
where b.status = 'paid'
  and b.result_points is not null
  and b.result_seconds is not null;


-- ---------------------------------------------------------------------------
-- The race clock — started and stopped by the team's gamemaster.
-- ---------------------------------------------------------------------------
-- A race is 180 minutes (RACE_MINUTES in lib/urban-sprint/race-clock.ts). The
-- gamemaster starts the clock after drawing the booster and stops it with
-- Finish; a race nobody finishes ends itself at 180 minutes. Points come from
-- the stations confirmed in between, and on finishing, the points and time
-- are written to the booking's result, so every team, whatever day it raced,
-- is ranked on the one board: more points first, then the shorter time.
alter table us_teams add column if not exists race_started_at timestamptz;
alter table us_teams add column if not exists race_finished_at timestamptz;
