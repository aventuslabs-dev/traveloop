import { getSiteUrl } from "@/lib/stripe";
import { teamLinkPath } from "@/lib/urban-sprint/team-link";
import ShareTeamLink from "../../_components/ShareTeamLink";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import {
  ARRIVAL_LEAD_MINUTES,
  arrivalTime,
  formatBookingDate,
  formatRinggit,
  formatSlotTime,
} from "@/lib/urban-sprint/booking-config";
import { getBookingBySessionId, type StoredTeamBooking } from "@/lib/urban-sprint/bookings-db";
import { getPassRegistrationsByOrder } from "@/lib/pass-registrations-db";
import { COLLECTION_POINT } from "@/lib/pass-collection";
import { formatPassNumber } from "@/lib/pass-number";
import { Empty, Wordmark } from "../../_components/ui";
import SuccessWatcher from "./SuccessWatcher";

export const metadata: Metadata = {
  title: "Booking confirmed",
  robots: { index: false, follow: false },
};

/** A racer's Platinum Pass, as the success page lists it. */
type IssuedPass = { traveller: string; passNumber: string };

type State =
  | { kind: "confirmed"; booking: StoredTeamBooking }
  | { kind: "settling"; booking: StoredTeamBooking }
  | { kind: "lapsed"; booking: StoredTeamBooking }
  | { kind: "unknown" };

/**
 * Where Stripe sends the buyer after paying.
 *
 * The booking row is the record, but the webhook that marks it paid can land
 * a moment after the buyer does. So Stripe's own word on the session decides
 * whether this reads as confirmed — the same rule the pass success page uses —
 * and the page keeps refreshing until the booking catches up.
 *
 * Shows the team and each racer's Platinum Pass number — the same thing the
 * pass success page shows a pass buyer — but never identity numbers or
 * contact details: the session id in the URL is unguessable, but it's also
 * the kind of URL that gets pasted into a group chat.
 */
export default async function UrbanSprintBookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sessionId = (await searchParams).session_id;
  if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
    redirect("/urban-sprint/book");
  }

  const state = await loadState(sessionId);
  // Written by the same webhook that confirms the booking, so a confirmed
  // page can briefly have none yet; the watcher refreshes until they land.
  const passes = state.kind === "confirmed" ? await loadPasses(sessionId) : [];

  return (
    <main className="us-public us-light">
      <header className="us-topbar">
        <Wordmark tone="light" />
        <nav className="us-topbar-nav" aria-label="Urban Sprint">
          <Link href="/urban-sprint#leaderboard">Leaderboard</Link>
        </nav>
      </header>

      <div className="us-shell us-book us-book-done">
        {state.kind === "unknown" ? (
          <Empty title="We couldn't find that booking">
            If you were charged, your confirmation email has your reference — contact us quoting
            it. Otherwise, <Link href="/urban-sprint/book">start a new booking</Link>.
          </Empty>
        ) : state.kind === "lapsed" ? (
          <Empty title="This booking wasn't completed">
            The payment didn&rsquo;t go through, so the place was released and nothing was
            charged. <Link href="/urban-sprint/book">Book again</Link>.
          </Empty>
        ) : (
          <Confirmation state={state} sessionId={sessionId} passes={passes} />
        )}
      </div>

      {state.kind !== "unknown" && state.kind !== "lapsed" && (
        <SuccessWatcher
          confirmed={state.kind === "confirmed" && state.booking.status === "paid" && passes.length > 0}
        />
      )}
    </main>
  );
}

function Confirmation({
  state,
  sessionId,
  passes,
}: {
  state: Extract<State, { booking: StoredTeamBooking }>;
  sessionId: string;
  passes: IssuedPass[];
}) {
  const { booking } = state;
  const confirmed = state.kind === "confirmed";

  return (
    <section className="us-done">
      <span className={`us-done-mark${confirmed ? "" : " is-waiting"}`} aria-hidden>
        {confirmed ? "✓" : "…"}
      </span>
      <p className="us-kicker">{confirmed ? "Booking confirmed" : "Confirming payment"}</p>
      <h1>{confirmed ? `${booking.teamName} is in the race.` : "Your payment is being confirmed."}</h1>
      <p className="us-done-lede">
        {confirmed
          ? booking.payerEmail
            ? `Your confirmation, invoice and Traveloop account details are on their way to ${booking.payerEmail}.`
            : "Your confirmation email is on its way."
          : "Some payment methods take a few minutes to settle. Your place is held in the meantime, and we'll email you as soon as it's through."}
      </p>

      <p className="us-done-arrive">
        Arrive by <b>{formatSlotTime(arrivalTime(booking.time))}</b> on{" "}
        {formatBookingDate(booking.date)} — {ARRIVAL_LEAD_MINUTES} minutes before your challenge —
        and quote Booking ID <b className="us-mono">{booking.reference}</b> at check-in.
      </p>

      {confirmed && booking.status === "paid" && (
        <>
          <p className="us-kicker">Your team page</p>
          <p className="us-done-lede">
            Send this to everyone on the team — no sign-in needed. On race day it shows your
            booster, every station you clear and where you stand.
          </p>
          <ShareTeamLink url={`${getSiteUrl()}${teamLinkPath(booking.reference)}`} teamName={booking.teamName} />
        </>
      )}

      <dl className="us-summary-list us-done-details">
        <div>
          <dt>Booking ID</dt>
          <dd className="us-mono">{booking.reference}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{formatBookingDate(booking.date)}</dd>
        </div>
        <div>
          <dt>Arrival time</dt>
          <dd>{formatSlotTime(arrivalTime(booking.time))}</dd>
        </div>
        <div>
          <dt>Challenge time</dt>
          <dd>{formatSlotTime(booking.time)}</dd>
        </div>
        <div>
          <dt>Team</dt>
          <dd>{booking.teamName}</dd>
        </div>
        <div>
          <dt>Registered participants</dt>
          <dd>{booking.participants.map((participant) => participant.fullName).join(", ")}</dd>
        </div>
        <div className="is-total">
          <dt>{confirmed ? "Paid" : "Total"}</dt>
          <dd>{formatRinggit(booking.amountCents)}</dd>
        </div>
      </dl>

      {confirmed && (
        <>
          <p className="us-kicker">Platinum Pass for every racer</p>
          {passes.length > 0 ? (
            <>
              <p className="us-done-lede">
                Each racer collects their pass at {COLLECTION_POINT.place} with their number below
                and the IC or passport they registered with.
              </p>
              <ul className="us-done-passes">
                {passes.map((pass) => (
                  <li key={pass.passNumber}>
                    <span>{pass.traveller}</span>
                    <span className="us-mono">{formatPassNumber(pass.passNumber)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="us-done-lede">Issuing everyone&rsquo;s pass numbers — this takes a moment.</p>
          )}
        </>
      )}

      <div className="us-form-actions">
        {confirmed && passes.length > 0 && (
          // A file download, not a page: <Link> would try to route to it.
          <a className="us-btn us-btn-primary" href={`/api/orders/${sessionId}/invoice?format=pdf`}>
            Download invoice
          </a>
        )}
        {confirmed && (
          <Link className="us-btn us-btn-ghost" href="/account/login">
            Your Traveloop account
          </Link>
        )}
        <Link className="us-btn us-btn-ghost" href="/urban-sprint">
          Back to Urban Sprint
        </Link>
      </div>
    </section>
  );
}

/** Each racer's pass number, or none if fulfilment hasn't written them yet. Never fails the page. */
async function loadPasses(sessionId: string): Promise<IssuedPass[]> {
  try {
    const registrations = await getPassRegistrationsByOrder(sessionId);
    return registrations.flatMap((reg) =>
      reg.passNumber ? [{ traveller: reg.fullName, passNumber: reg.passNumber }] : []
    );
  } catch (error) {
    console.error("[us-book-success] Couldn't read the pass numbers:", error);
    return [];
  }
}

async function loadState(sessionId: string): Promise<State> {
  let booking: StoredTeamBooking | null;
  try {
    booking = await getBookingBySessionId(sessionId);
  } catch (error) {
    console.error("[us-book-success] Couldn't load booking:", error);
    return { kind: "unknown" };
  }

  if (!booking) return { kind: "unknown" };
  if (booking.status === "paid") return { kind: "confirmed", booking };
  if (booking.status === "expired" || booking.status === "failed" || booking.status === "cancelled") {
    return { kind: "lapsed", booking };
  }

  // Bypass bookings are paid synchronously, so one still pending here never
  // had a real checkout to ask about.
  if (sessionId.startsWith("cs_bypass_")) return { kind: "settling", booking };

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
    return { kind: paid ? "confirmed" : "settling", booking };
  } catch (error) {
    console.error("[us-book-success] Couldn't retrieve session:", error);
    return { kind: "settling", booking };
  }
}
