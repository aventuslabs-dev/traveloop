-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).
--
-- Safe to re-run: every statement is idempotent. Postgres has no
-- `create policy if not exists`, so each policy is dropped and recreated
-- rather than guarded — harmless, because RLS denies by default and the gap
-- between the two statements is inside the same transaction.

create table if not exists orders (
  id bigint generated always as identity primary key,
  session_id text not null unique,
  -- pass_key is the highest tier in the order (drives which experience
  -- discounts it unlocks) and pass_name becomes "<n> passes" when an order
  -- spans more than one tier — see pass_registrations for the itemised
  -- breakdown of exactly which tier each traveller bought.
  pass_key text not null,
  pass_name text not null,
  quantity integer not null default 1,
  amount_total integer not null,
  currency text not null,
  customer_email text,
  customer_name text,
  customer_phone text,
  payment_intent_id text,
  invoice_number text not null default '',
  created_at timestamptz not null default now()
);

-- RLS is enabled. The app talks to Supabase using the service_role key
-- (server-only — never in a NEXT_PUBLIC_ env var or client bundle), which
-- bypasses RLS by design, so server code is unaffected by the policy below.
alter table orders enable row level security;

-- Links an order to the Supabase Auth account auto-created for the buyer at
-- fulfilment time (see src/lib/customer-account.ts). Nullable: orders placed
-- before this column existed, or where account creation failed/raced, have
-- no link until backfillOrdersForEmail() catches them up.
alter table orders add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Lets a logged-in customer (anon key + session cookie) read their own
-- orders for the /account portal.
drop policy if exists "Customers can view their own orders" on orders;
create policy "Customers can view their own orders"
  on orders for select
  using (auth.uid() = user_id);

-- Trip dates are per-purchase, not per-person: a returning customer's second
-- pass has its own arrival/departure, so these live on the order rather than
-- on customer_profiles below.
alter table orders add column if not exists arrival_date date;
alter table orders add column if not exists departure_date date;

-- The tourist-registration details collected before checkout
-- (src/app/passes/register). One row per Supabase Auth account: a repeat
-- purchase updates the existing row rather than adding another.
--
-- "Other" free-text answers for nationality/relationship are stored directly
-- in those columns — there is deliberately no separate "other_*" column.
create table if not exists customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  nationality text,
  travel_document_type text,
  travel_document_number text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table customer_profiles enable row level security;

drop policy if exists "Customers can view their own profile" on customer_profiles;
create policy "Customers can view their own profile"
  on customer_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Customers can update their own profile" on customer_profiles;
create policy "Customers can update their own profile"
  on customer_profiles for update
  using (auth.uid() = user_id);

-- Cultural-experience bookings made from the customer portal
-- (src/app/account/experiences). Each row is booked *against a specific
-- order*, because the pass tier on that order is what decides both access to
-- the experience and the price — see src/app/data/experiences.ts.
--
-- Nothing is charged online: `quoted_amount_cents` is what the customer was
-- quoted at booking time and settles at the venue. It is stored rather than
-- recomputed so a later price change can't silently rewrite what someone was
-- already promised.
create table if not exists experience_bookings (
  id bigint generated always as identity primary key,
  reference text not null default '',
  user_id uuid not null references auth.users(id) on delete cascade,
  order_session_id text not null references orders(session_id) on delete cascade,
  pass_key text not null,
  experience_key text not null,
  experience_name text not null,
  -- Session date/time in Malaysian local time. Stored as plain date + time
  -- rather than a timestamptz because these are wall-clock session times at a
  -- fixed venue, not instants that should shift with a viewer's timezone.
  session_date date not null,
  start_time time not null,
  end_time time not null,
  participants integer not null default 1,
  children_count integer not null default 0,
  package_key text,
  location text,
  quoted_amount_cents integer not null,
  currency text not null default 'MYR',
  -- numeric, not integer: the Lion Dance platinum tier discounts at 83.75%.
  discount_percent numeric not null default 0,
  -- pending: awaiting the team's confirmation of venue/photographer.
  -- confirmed: locked in. cancelled / completed are end states.
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  customer_notes text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create unique index if not exists experience_bookings_reference_key
  on experience_bookings (reference)
  where reference <> '';

create index if not exists experience_bookings_user_idx
  on experience_bookings (user_id, session_date desc);

create index if not exists experience_bookings_session_idx
  on experience_bookings (session_date, start_time);

-- A customer may hold only one active (non-cancelled) booking per experience
-- at a time — not just per exact session. Booking a different time for the
-- same experience requires cancelling the first. Cancelled rows are excluded
-- so a customer who cancels can book again.
create unique index if not exists experience_bookings_one_active_per_experience
  on experience_bookings (user_id, experience_key)
  where status <> 'cancelled';

-- Every experience caps a session at 20 participants total across all
-- customers (kept in sync with `participants.max` in
-- src/app/data/experiences.ts). This runs server-side so two customers
-- racing to book the last spots can't both succeed — the app-level check in
-- booking-actions.ts only gives a friendlier error first; this is what
-- actually prevents the overbook.
create or replace function check_experience_booking_capacity()
returns trigger as $$
declare
  session_capacity constant integer := 20;
  already_booked integer;
begin
  if new.status = 'cancelled' then
    return new;
  end if;

  select coalesce(sum(participants), 0) into already_booked
  from experience_bookings
  where experience_key = new.experience_key
    and session_date = new.session_date
    and start_time = new.start_time
    and status <> 'cancelled'
    and id is distinct from new.id;

  if already_booked + new.participants > session_capacity then
    raise exception 'That session is fully booked.' using errcode = 'P0001';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists experience_bookings_capacity_check on experience_bookings;
create trigger experience_bookings_capacity_check
  before insert or update on experience_bookings
  for each row execute function check_experience_booking_capacity();

alter table experience_bookings enable row level security;

drop policy if exists "Customers can view their own bookings" on experience_bookings;
create policy "Customers can view their own bookings"
  on experience_bookings for select
  using (auth.uid() = user_id);

-- Holds a cart's items between "buyer submitted registrations" and "Stripe
-- confirmed payment" (src/app/api/checkout/route.ts). Stripe metadata is too
-- small to carry N full registrations, so the draft rides in the checkout
-- session as just an id and is deleted once fulfilment reads it back.
create table if not exists checkout_drafts (
  id uuid primary key default gen_random_uuid(),
  items jsonb not null,
  created_at timestamptz not null default now()
);

-- Service-role only (no policies): the checkout route and webhook are the
-- only things that ever touch this table, and RLS denies by default.
alter table checkout_drafts enable row level security;

-- One row per pass in an order — the tourist-registration/insurance details
-- for a single traveller. An order with quantity > 1 has one row per pass
-- here, unlike customer_profiles (one row per account) which only ever
-- reflects the buyer's own (first) registration for portal autofill.
create table if not exists pass_registrations (
  id bigint generated always as identity primary key,
  order_session_id text not null references orders(session_id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  pass_key text not null,
  pass_name text not null,
  unit_amount_cents integer not null,
  full_name text not null,
  nationality text not null,
  arrival_date date not null,
  departure_date date not null,
  travel_document_type text not null,
  travel_document_number text not null,
  address text not null,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  terms_accepted_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table pass_registrations enable row level security;

drop policy if exists "Customers can view their own pass registrations" on pass_registrations;
create policy "Customers can view their own pass registrations"
  on pass_registrations for select
  using (auth.uid() = user_id);

create index if not exists pass_registrations_order_idx on pass_registrations (order_session_id);
create index if not exists pass_registrations_user_idx on pass_registrations (user_id, created_at desc);

-- Checkouts that never became orders: a declined card, an FPX payment that
-- failed to settle, or a session the buyer walked away from
-- (src/app/api/webhooks/stripe/route.ts). The orders table only ever holds
-- successes, so without this the only record of a lost sale is the Stripe
-- dashboard.
--
-- One row per Stripe *event*, not per buyer: someone who retries a declined
-- card three times leaves three rows, which is what an operator wants to see.
-- `event_id` is unique so Stripe's at-least-once delivery can't duplicate a row.
--
-- Nothing vacuums this table. Unlike checkout_drafts it holds no passport
-- numbers or addresses — name, email and phone as Stripe captured them — but it
-- is still personal data about people who never bought anything, so prune it on
-- whatever retention period the business settles on.
create table if not exists payment_attempts (
  id bigint generated always as identity primary key,
  event_id text not null unique,
  -- 'failed'  — the payment was attempted and declined or did not settle.
  -- 'expired' — the session timed out with no payment attempted (~24h).
  status text not null check (status in ('failed', 'expired')),
  session_id text,
  payment_intent_id text,
  -- The checkout_drafts row this attempt came from, if it still exists.
  draft_id text,
  amount_total integer,
  currency text,
  customer_email text,
  customer_name text,
  customer_phone text,
  -- Human-readable cart ("2 × Gold Pass"), resolved from the Stripe line items.
  pass_summary text,
  quantity integer,
  -- Stripe's decline_code where there is one ("insufficient_funds"), else code.
  failure_code text,
  failure_message text,
  -- When Stripe raised the event, not when we wrote the row: a webhook retried
  -- for an hour would otherwise date the failure to the retry.
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Service-role only (no policies): the webhook writes it and the admin console
-- reads it. A customer has no business reading anyone's failed payments,
-- including their own, and RLS denies by default.
alter table payment_attempts enable row level security;

create index if not exists payment_attempts_occurred_at_idx on payment_attempts (occurred_at desc);

-- Looks up the Auth account for an email address.
--
-- Fulfilment has to answer "does this buyer already have an account?" before it
-- tries to create one. It used to ask the orders table, which only knows about
-- people who have *bought* something: an Urban Sprint player, the operator, or
-- anyone whose first purchase half-failed came back "no account", createUser
-- then failed on the duplicate email, and the order was stored with no user_id
-- at all — invisible in the customer's portal, with no welcome email.
--
-- auth.users is the authoritative answer and is not reachable over PostgREST,
-- hence this function. security definer is what lets it read that schema;
-- search_path is pinned so the body cannot be redirected by a caller's own
-- search_path, and execute is granted to nobody, leaving service_role (which
-- bypasses grants) as the only caller.
--
-- Emails are compared case-insensitively: Supabase Auth stores them lowercased,
-- but Stripe hands back whatever the buyer typed.
create or replace function public.auth_user_id_for_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id
  from auth.users
  where lower(email) = lower(p_email)
  order by created_at
  limit 1;
$$;

revoke all on function public.auth_user_id_for_email(text) from public;
revoke all on function public.auth_user_id_for_email(text) from anon, authenticated;
