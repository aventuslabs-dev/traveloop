# Urban Sprint

An Amazing Race-style campaign that runs alongside Traveloop. Teams sprint
between participating shops ("Stations"), a Gamemaster confirms each stop, and
the leaderboard moves live.

It is a **separate extension**, not a mode of the Traveloop app: its own routes
under `/urban-sprint`, its own login, its own roles, its own stylesheet. It
*looks* like Traveloop on purpose — the campaign exists to introduce the pass —
but shares no code with the Traveloop site's styles. The only thing the two share is Supabase Auth plumbing — and sharing that grants
nothing, because Urban Sprint access requires a `us_profiles` row and Traveloop's
console requires being `ADMIN_LOGIN_EMAIL`. Neither condition implies the other.

## Setup

Two steps, both against the Supabase project already configured in `.env.local`.

**1. Create the schema.** Open the Supabase dashboard → SQL Editor → New query,
paste [`supabase/urban-sprint-schema.sql`](supabase/urban-sprint-schema.sql) and
run it. It is idempotent, additive, and touches nothing the Traveloop tables use.

**2. Seed a runnable campaign** (optional, but it's how you see the thing work):

```bash
node supabase/seed-urban-sprint.mjs
```

That creates four categories, four boosters, six teams, twelve Penang stations
and demo gamemasters. Sign in at `/urban-sprint/login`:

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin` — the Traveloop admin login | the Traveloop admin password |
| Gamemaster | `gm1@urbansprint.test` (also gm2, gm3) | `sprint2026` |

Override the password with `URBAN_SPRINT_SEED_PASSWORD`. These are demo
credentials — delete the accounts before running a real event.

No new environment variables are needed.

**One admin login for both consoles.** The Traveloop admin account
(`ADMIN_LOGIN_EMAIL`, signed in with the ID `admin` on either login page) is
always an Urban Sprint admin — `getUrbanSprintSession()` grants it without
checking its profile, and gives it a `us_profiles` row on first visit so the
results and stations it records have an author. Both console rails carry a
Traveloop / Urban Sprint switch for it. The grant is one-way: other Urban
Sprint admins never reach the Traveloop console, and the Urban Sprint Users
page can't edit, re-password or delete the Traveloop admin login.

## Routes

| Path | Who |
| --- | --- |
| `/urban-sprint` | Public — the whole campaign on one page: hero, sign-up, "Already booked?" (Booking ID → team page) and the leaderboard (`#leaderboard`, Top 25 / 200 / All via `?show=`). The old `/urban-sprint/leaderboard` redirects here (`next.config.ts`) |
| `/urban-sprint/book` | Public — book and pay for a team |
| `/urban-sprint/book/success` | Public — where Stripe returns the buyer |
| `/urban-sprint/login` | Everyone |
| `/urban-sprint/admin` | Administrator — overview: booking tiles, the week's slots, what needs attention |
| `/urban-sprint/admin/bookings` | Administrator — upcoming / past / one day; a typed Booking ID jumps to the booking |
| `/urban-sprint/admin/bookings/[reference]` | Administrator — one booking: payment, result, every racer and their Platinum Pass |
| `/urban-sprint/admin/results` | Administrator — enter results by Booking ID, see who's still to be scored, the ranking |
| `/urban-sprint/admin/teams` | Administrator — every team (one per paid booking, plus any added by hand), by race day |
| `/urban-sprint/admin/settings` | Administrator — event settings and the booking wording |
| `/api/urban-sprint/export?kind=bookings|results` | Administrator — CSV download |
| `/urban-sprint/gamemaster` | Gamemaster — claim a team, draw, start the clock, stations |
| `/urban-sprint/gamemaster/leaderboard` | Gamemaster — the leaderboard, in-shell |
| `/urban-sprint/t/[token]` | A booked team's private page, no sign-in — race, score, booster, stations |
| `/urban-sprint/t/[token]/shops` | …where to go |
| `/urban-sprint/t/[token]/leaderboard` | …the leaderboard |
| `/urban-sprint/api/pulse` | The live-update heartbeat |

`proxy.ts` checks only that a session exists; the role decision is made by
`requireRole()` in the layout or action that serves the data, per the Next.js
guidance that proxy is for optimistic checks rather than authorisation. Every
Server Action re-checks independently, because Server Actions accept direct
POSTs.

## Team bookings

Booking is the campaign's main call to action: a team picks a date and one of
five daily start times, names itself, registers every member, and pays RM450
per team through Stripe Checkout. The rules — price, team size (3–6), start
times, five teams per slot, the 60-day window and the one-hour cutoff — are
constants in `src/lib/urban-sprint/booking-config.ts`.

**A place is held from the moment the form is submitted.** The booking row is
written as `pending` with a 35-minute hold *before* the buyer reaches Stripe,
and Stripe's session is set to expire at 31 minutes, so a checkout is always
closed before its hold lapses. Pending (unexpired), `processing` (paid by a
method still settling, e.g. FPX) and `paid` bookings all count toward a slot.
A buyer who presses Back on Stripe's page gets the place released straight
away, and their form restored from session storage.

**Five teams per slot is enforced by the database.** `us_check_slot_capacity`
serialises bookings for one slot with an advisory lock and refuses the sixth,
so two buyers racing for the last place can't both get it. It never refuses a
*payment* — money that arrives for a lapsed hold is taken and logged as a
possible over-booking, because refusing it at the webhook helps nobody.

**Webhook routing.** Bookings share the Stripe account and webhook endpoint
with Traveloop passes. Sessions carry `kind: urban_sprint_booking` in their
metadata, and `api/webhooks/stripe` hands those to
`lib/urban-sprint/booking-fulfillment.ts`, which marks the booking paid and
then fulfils it as a Traveloop order (below). No new Stripe events are needed.

**Every racer gets a Traveloop Platinum Pass.** A team of four is, to
Traveloop, an order for four Platinum Passes, and the RM450 team price is its
only charge. Once paid, `completeTeamBooking` builds a `PassOrder` from the
booking and runs it through `fulfillPassOrder`, the same path as a pass sold
on /passes:

- the payer's email gets a Traveloop customer account (created on their first
  purchase, with the generated password in the email);
- an `orders` row with `product = 'urban_sprint'`, the Booking ID in
  `product_reference` and the same Stripe session id as the booking — that
  shared session id is the link between the two records;
- one `pass_registrations` row per racer, Platinum, at 0 each, so every racer
  gets a pass number to collect at the airport, like any pass buyer;
- one email: the order receipt, which for an Urban Sprint order also carries
  the Booking ID, arrival and challenge times and the Rules & Regulations. The
  booking mirrors whether it went out (`us_bookings.confirmation_*`). Resends
  are done from the Traveloop order in /admin.

The invoice charges the team entry and lists each racer's pass as included.
In /admin, the orders list has a Product column (Premier Pass or Urban
Sprint), and each Urban Sprint order links to its booking in this console.
Here, each booking's participant list shows that racer's pass number.

**Participant details** mirror the Traveloop Card / insurance registration:
name as on the document, MyKad or passport (nationality asked only for
passports), sex, age, email and mobile. MyKad numbers are checked and stored
as `YYMMDD-PB-####`. For the Platinum Pass, each racer also gives what
/passes/register asks a pass buyer: their trip dates in Penang (which must
include race day, and default to it), a home address and an optional
emergency contact. The buyer accepts the pass's insurance terms, word for word
as on /passes/register, alongside the Urban Sprint declaration.

**The Booking ID** is the booking's `reference` (`US-` plus eight characters
from an alphabet with no 0/O or 1/I). It links the booking, its participants,
its result and its photos — gamemasters file photos under
`US-ABCD2345-Team Name` (`photoFolderName()`, shown on each booking). Anywhere
a person types one, case, spaces and a missing `US-` are forgiven
(`normalizeBookingId()`).

**Arrival is 30 minutes before the challenge time** (`ARRIVAL_LEAD_MINUTES`).
The booking form, success page and confirmation email all show both.

**Wording Traveloop is still finalising is edited in the console**, not in code:
Settings > Booking wording holds the Rules & Regulations (booking page and every
confirmation email), the "I have read and understand" declaration, and the
public leaderboard's display limit. Both texts are plain text with one piece of
markup — `[label](/path)` makes a link (`lib/urban-sprint/linked-text.ts`);
nothing is ever treated as HTML. Changing the declaration starts a new version,
and each booking stores the version *and the exact text* its buyer ticked. If
the wording changes while someone is mid-form, the API refuses their booking
(`terms_changed`) and the form reloads the new text for them to tick afresh.

**Every paid booking is a team in the live station game.** Fulfilment's last
step (`ensureTeamForBooking`) adds a `us_teams` row whose slug is the Booking
ID lower-cased (`us-abcd2345`) — that is the link, and the unique slug is
what makes repeating it harmless. It runs after the order, passes and receipt,
so the money never waits on the game; if it fails, the webhook fails and
Stripe's retry adds the team. The team is created once and never overwritten,
so an organiser's later edits to its name or colour stick. Results are still
entered against the booking (below).

**Racers don't sign in.** Only gamemasters and organisers have accounts. Each
paid team has a private page link, `/urban-sprint/t/US-ABCD2345-<signature>`
(`lib/urban-sprint/team-link.ts`): the Booking ID plus an HMAC of it, so the
link is checked without storing anything, and knowing a Booking ID alone
doesn't open it. It's on the success page (with Copy and Share on WhatsApp),
in the confirmation email, and on the console's booking page. The page is
read-only and shows nothing personal: before race day the race details; on
the day the race clock, live score, booster, stations and the board; afterwards the
result. The key is `URBAN_SPRINT_LINK_SECRET` if set, otherwise derived from
the Supabase service-role key; setting or changing that variable retires
every link already sent. There is no per-team revoke — that would need a
stored token column.

A gamemaster picks from every team still to race — soonest first, with a
Racing today tab — and a team whose race has finished can't be claimed again.
The console's Teams page lists
them all — Upcoming, Racing today, Past, All — each linking to its booking and
to the page its racers see, and the booking page shows its team's gamemaster,
booster, race clock and points.

Setup: the pass columns need both SQL files re-run — `schema.sql` (the
`orders.product*` columns) and `urban-sprint-schema.sql` (the participants'
trip, address and emergency-contact columns). Both are idempotent.

Testing locally: with `PAYMENTS_TEST_MODE=true` (or no Stripe key) the booking
is confirmed without Stripe, and its order, passes and receipt are created the
same way. With Stripe test keys, run `stripe listen
--forward-to localhost:3000/api/webhooks/stripe` or bookings stay pending.

## The race and the leaderboard

**Every race is 180 minutes** (`RACE_MINUTES` in `lib/urban-sprint/race-clock.ts`).
After drawing the booster, the gamemaster taps **Start race** and the clock
runs (`us_teams.race_started_at`). Stations can only be confirmed while it's
running — before Start and after the finish the confirm button is locked, and
the server action refuses too. **Finish race** stops it; a race nobody
finishes ends itself at 3:00:00 (`race-db.settleExpiredRaces`, run whenever the
board is read, and the ticking clock refreshes the page at 3:00:00 so that read
happens on time).

**Points come from the game** — the stations the gamemaster confirmed,
booster included. When a race finishes, its points and time are written to the
booking's result (`us_bookings.result_*`, `race-db.recordRaceResult`). Voiding
a station afterwards rewrites that result. Staff can still enter or correct a
result by Booking ID at `/urban-sprint/admin/results`; times are typed as they
read off a stopwatch (`58:12`, `1:02:05`).

**There is one leaderboard** (`results-db.getBoard`): every team, whatever day
it raced — **more points first, then the shorter time**, and teams level on
both share a place. Finished teams come from the `us_results_board` view;
teams racing right now join it live with their points and time so far, marked
Racing, their time ticking. The public board, the landing page, "Check my
ranking", the team pages, the gamemaster's board and the console all read
`getBoard`, so none of them can disagree. (The older `us_leaderboard` view is
no longer read.)

The public board offers Top 25 / Top 200 / All teams, capped by the console's
display limit. "Check my ranking" takes a Booking ID and shows only what the
board would anyway — team name, rank, points, time.

**Exports** (`/api/urban-sprint/export`) are admin-only CSVs: every booking
with one row per participant (identity numbers included — handle accordingly),
or the results table. Cells starting with `=`, `+`, `-` or `@` are prefixed
with `'` so nothing a customer typed can run as a spreadsheet formula.

## Scoring (live station game)

Points are never stored as an incrementing counter. Each confirmation writes a
row to `us_completions` holding the whole calculation — base points, booster,
percentage, bonus, total, who confirmed it, when. `us_teams.cached_points` is a
cache rebuilt from that ledger **by database trigger**, so it cannot drift, and
voiding a completion recomputes it correctly.

```
ABC Cafe · Food & Beverage
  Base            30
  Food Booster    +25%   +7.5
  Awarded                37.5
```

The bonus applies when the station's category equals the booster's category. The
percentage lives on the booster row (`us_boosters.bonus_percent`) and is editable
in the console — there is no default constant anywhere in the scoring code. A
completion snapshots the percentage it was scored with, so re-pricing a station
or editing a booster later never rewrites a result a team already has.

All arithmetic happens in `src/lib/urban-sprint/scoring.ts`, server-side. The
gamemaster's confirmation sheet shows a *preview* produced by that same
function; the confirm posts only a station id, and the award is recomputed from
the database before anything is written.

### What stops the obvious abuses

| Risk | What actually prevents it |
| --- | --- |
| Duplicate station completion | Partial unique index on `(team_id, station_id) where status = 'valid'` |
| Double taps | The same index, plus a disabled button for the round trip |
| Two gamemasters claiming one team | `UPDATE … WHERE gamemaster_id IS NULL` — the loser's predicate no longer matches |
| One gamemaster on two teams | Unique index on `us_teams (gamemaster_id)` |
| Booster redraws | `UPDATE … WHERE booster_id IS NULL`; a repeat draw returns the booster already held |
| Frontend score manipulation | The client posts an id, never a number |
| Losing history to a correction | Voiding sets a status and a reason; nothing is deleted |

## Placeholder location data

The team page's **Shops** tab shows a distance per shop and a Google map. Both
are fabricated, and live entirely in `src/lib/urban-sprint/geo.ts`:

- Distances come from a hash of the station id, so they are stable across
  refreshes and identical for everyone on a team — but they are not measured.
  `distanceFromTeam()` becomes real once stations carry lat/lng and the browser
  supplies a position; it already returns the shape the UI renders.
- Maps use Google's keyless embed (`maps?q=...&output=embed`), centred on an
  address rather than on the viewer. The official Embed API and a key are the
  production path; only the URL in that file changes.

The screen says so on both the area map and the detail sheet, so nobody reads
an invented number as a measurement.

## Live updates

Every scoring-relevant write bumps `us_settings.revision` by trigger. Open tabs
poll `/urban-sprint/api/pulse` (one primary-key read) and call `router.refresh()`
only when the number has moved — so pages stay Server Components with no second
client-side data layer, and a quiet minute costs almost nothing. Polling pauses
on a hidden tab.

Supabase Realtime would need the anon key and URL published to the browser,
which this project has so far kept server-side. Swapping transports later means
changing `_components/LiveRefresh.tsx` alone — nothing else knows how updates
arrive.

## Code map

```
src/lib/urban-sprint/      scoring, auth, and one *-db.ts per domain
src/app/urban-sprint/
  page.tsx                 public landing
  leaderboard/             public board
  login/                   sign-in + logout
  book/                    team booking form + success page (public)
  gamemaster/              claim team → draw booster → stations → confirm
  t/[token]/               a team's private link: my team, shops, board
                           (read-only by construction — no scoring control)
  admin/                   overview, users, teams, stations, categories,
                           boosters, activity, leaderboard
  _components/             shared UI, LiveRefresh, TabBar, AppBar
  urban-sprint.css         the whole design system, scoped to .us-root
supabase/urban-sprint-schema.sql
supabase/seed-urban-sprint.mjs
```

`urban-sprint.css` loads only on these routes and everything in it is scoped
under `.us-root`. `globals.css` is not edited.

The palette is Traveloop's — navy grounds, Traveloop red for the race and every
call to action, Traveloop blue reserved for boosters — restated as `--tl-*`
tokens at the top of the file. Two grounds share one token set: `.us-root` is
navy (phone app, scoreboard, login) and `.us-light`, put on a page's
`<main>` or a section, flips the same tokens to Traveloop cream (landing
sections, booking form). Write components against the tokens and they work on
either. The logo is `Wordmark` in `_components/ui.tsx`: the Traveloop logo in
front, URBAN SPRINT behind, in a `sm` bar size and an `lg` hero size.

The admin console is the exception: it is built on the Traveloop admin's
design system (`.admin-shell` / `.ad-*` in globals.css, and the PageHeader,
Panel, StatGrid and DataTable components from `/admin`), so the two consoles
look and work alike. `admin/console.css` adds only what that system lacks —
slot grid, standings, edit dialogs — and restates the few admin rules that
`.us-root`'s element defaults would otherwise override. Row editing opens a
native `<dialog>` (`admin/Dialog.tsx`), never an in-cell popover, which a
table's scroll box would clip.

## Deliberately not built

GPS, QR codes, photo proof, messaging, push notifications, timed missions and
analytics are all out of scope for the MVP. The seams are there for them:
stations already carry an address, completions are an append-only ledger a
verification step could hang off, and the live layer is one component wide.

Maps and distances exist only as the placeholders described above — real
positioning is the obvious next piece of work, and `geo.ts` is the only file it
touches.

Every bottom-navigation href must stay inside its own role's shell. A tab
pointing at a route rendered by a different layout navigates away from the bar
that rendered it, and the bar disappears mid-race. `_components/tabs.ts` is
where that rule lives.
