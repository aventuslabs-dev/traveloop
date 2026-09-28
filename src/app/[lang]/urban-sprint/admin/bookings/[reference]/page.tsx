import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/app/components/Icons";
import { getOrderBySessionId, type StoredOrder } from "@/lib/orders-db";
import { formatPassNumber } from "@/lib/pass-number";
import {
  getPassRegistrationsByOrder,
  type StoredPassRegistration,
} from "@/lib/pass-registrations-db";
import { requireRole } from "@/lib/urban-sprint/auth";
import {
  ARRIVAL_LEAD_MINUTES,
  arrivalTime,
  formatBookingDate,
  formatRinggit,
  formatSlotTime,
  normalizeBookingId,
  photoFolderName,
} from "@/lib/urban-sprint/booking-config";
import { DOCUMENT_TYPE_LABEL, SEX_LABEL } from "@/lib/urban-sprint/booking-form";
import { getBookingByReference } from "@/lib/urban-sprint/bookings-db";
import { formatDuration, ordinal, percent, points } from "@/lib/urban-sprint/format";
import { lookupRanking } from "@/lib/urban-sprint/results-db";
import { getSiteUrl } from "@/lib/stripe";
import { teamLinkPath } from "@/lib/urban-sprint/team-link";
import { getTeamForBooking } from "@/lib/urban-sprint/teams-db";
import type { Team } from "@/lib/urban-sprint/types";
import LinkedText from "../../../_components/LinkedText";
import { CopyButton } from "../../../_components/ShareTeamLink";
import ResultForm from "../../ResultForm";
import {
  AdminFlash,
  BOOKING_STATUS,
  EmptyState,
  PageHeader,
  Panel,
  Pill,
  Swatch,
  bookingHref,
  formatDay,
  formatDayTime,
} from "../../ui";

/**
 * One team's booking: the race, the payment, its result, and every racer with
 * their Platinum Pass. The page a Booking ID leads to from anywhere in the
 * console — search, the slot grid, the overview's to-do list.
 *
 * A paid booking is also a Traveloop order under the same checkout session;
 * its invoice and passes come from there.
 */
export default async function AdminBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireRole("admin");

  const reference = normalizeBookingId(decodeURIComponent((await params).reference));
  const booking = reference ? await getBookingByReference(reference) : null;
  if (!booking) notFound();

  const flash = await searchParams;
  const sessionId = booking.stripeSessionId;

  const [order, passes, ranking, team] = await Promise.all([
    sessionId ? getOrderBySessionId(sessionId).catch((): StoredOrder | null => null) : null,
    sessionId
      ? getPassRegistrationsByOrder(sessionId).catch((): StoredPassRegistration[] => [])
      : [],
    booking.status === "paid" ? lookupRanking(booking.reference) : null,
    getTeamForBooking(booking.reference).catch((): Team | null => null),
  ]);

  const status = BOOKING_STATUS[booking.status];
  const teamLink = `${getSiteUrl()}${teamLinkPath(booking.reference)}`;
  const here = bookingHref(booking.reference);
  const scored = booking.resultPoints !== null && booking.resultSeconds !== null;

  return (
    <>
      <PageHeader
        backHref="/urban-sprint/admin/bookings"
        backLabel="All bookings"
        title={booking.teamName}
        subtitle={`${booking.reference} · ${formatBookingDate(booking.date)}, ${formatSlotTime(booking.time)} · ${booking.teamSize} racers`}
        actions={
          order ? (
            <>
              <a className="ad-btn" href={`/api/orders/${order.sessionId}/invoice?format=pdf`}>
                <Icon name="download" />
                Invoice
              </a>
              {/* The Traveloop console signs in separately; this is its view of the same sale. */}
              <Link className="ad-btn" href={`/admin/orders/${order.sessionId}`} target="_blank">
                <Icon name="external" />
                Traveloop order {order.invoiceNumber}
              </Link>
            </>
          ) : undefined
        }
      />

      <AdminFlash params={flash} />

      <div className="usc-grid">
        <Panel title="Booking" icon="calendar">
          <dl className="ad-dl">
            <div>
              <dt>Status</dt>
              <dd>
                <Pill label={status.label} tone={status.tone} />
              </dd>
            </div>
            <div>
              <dt>Race</dt>
              <dd>
                {formatBookingDate(booking.date)}, {formatSlotTime(booking.time)}
              </dd>
            </div>
            <div>
              <dt>Arrive by</dt>
              <dd>
                {formatSlotTime(arrivalTime(booking.time))}{" "}
                <span className="usc-muted">({ARRIVAL_LEAD_MINUTES} min before)</span>
              </dd>
            </div>
            <div>
              <dt>Booking ID</dt>
              <dd className="is-mono usc-copy">{booking.reference}</dd>
            </div>
            <div>
              <dt>Paid</dt>
              <dd>
                {booking.paidAt
                  ? `${formatRinggit(booking.amountCents)} on ${formatDay(booking.paidAt)}`
                  : "Not paid"}
              </dd>
            </div>
            <div>
              <dt>Paid by</dt>
              <dd>
                <span className="ad-cell-stack">
                  <b>{booking.payerName ?? "—"}</b>
                  <span>{booking.payerEmail ?? ""}</span>
                  <span>{booking.payerPhone ?? ""}</span>
                </span>
              </dd>
            </div>
            <div>
              <dt>Confirmation email</dt>
              <dd>
                {booking.status !== "paid" ? (
                  "—"
                ) : booking.confirmationSentAt ? (
                  <span className="ad-cell-stack">
                    <Pill label="Sent" tone="success" />
                    <span>{formatDayTime(booking.confirmationSentAt)}</span>
                  </span>
                ) : (
                  <span className="ad-cell-stack">
                    <Pill
                      label={booking.confirmationError ? "Not delivered" : "Pending"}
                      tone={booking.confirmationError ? "danger" : "warn"}
                    />
                    <span>
                      {booking.confirmationError ?? "Not sent yet."} Resend it from the Traveloop
                      order.
                    </span>
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt>Photo folder</dt>
              <dd className="is-mono usc-copy">{photoFolderName(booking.reference, booking.teamName)}</dd>
            </div>
          </dl>
        </Panel>

        <div>
          <Panel title="Result" icon="flag">
            {booking.status !== "paid" ? (
              <p className="ad-panel-note">Only a paid booking can have a result.</p>
            ) : (
              <>
                {scored ? (
                  <div className="usc-result">
                    <div>
                      <b>{points(booking.resultPoints ?? 0)}</b>
                      <span>Points</span>
                    </div>
                    <div>
                      <b>{formatDuration(booking.resultSeconds ?? 0)}</b>
                      <span>Time</span>
                    </div>
                    {ranking?.kind === "ranked" && (
                      <div>
                        <b>{ordinal(ranking.row.rank)}</b>
                        <span>of {ranking.total}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="ad-panel-note">
                    No result yet. It&rsquo;s recorded automatically when the gamemaster finishes
                    the race, or at 180 minutes. Enter one here only to correct it.
                  </p>
                )}
                <ResultForm
                  bookingId={booking.id}
                  reference={booking.reference}
                  resultPoints={booking.resultPoints}
                  resultSeconds={booking.resultSeconds}
                  returnTo={here}
                />
              </>
            )}
          </Panel>

          <Panel
            title="Station game"
            icon="shield"
            actions={
              <Link className="ad-btn ad-btn-sm" href="/urban-sprint/admin/teams">
                Teams
              </Link>
            }
          >
            {booking.status === "paid" && (
              <div className="usc-teamlink">
                <p className="ad-panel-note">
                  The team&rsquo;s private page — racers open it from their confirmation email
                  instead of signing in. Anyone with the link can see the team&rsquo;s score.
                </p>
                <div className="usc-teamlink-actions">
                  <a className="ad-btn ad-btn-sm" href={teamLink} target="_blank" rel="noreferrer">
                    <Icon name="external" />
                    Open team page
                  </a>
                  <CopyButton text={teamLink} className="ad-btn ad-btn-sm" />
                </div>
              </div>
            )}
            {!team ? (
              <p className="ad-panel-note">
                {booking.status === "paid"
                  ? "Not in the station game — the team was removed on the Teams page."
                  : "The team joins the station game once the booking is paid."}
              </p>
            ) : (
              <dl className="ad-dl">
                <div>
                  <dt>Team</dt>
                  <dd>
                    <span className="usc-name">
                      <Swatch color={team.color} />
                      {team.name}
                      {!team.active && <Pill label="Inactive" tone="neutral" />}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Gamemaster</dt>
                  <dd>
                    {team.gamemasterName ? (
                      <Pill label={team.gamemasterName} tone="info" />
                    ) : (
                      <span className="usc-muted">Claimed on race day</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Booster</dt>
                  <dd>
                    {team.booster ? (
                      `${team.booster.name} · ${team.booster.categoryName} +${percent(team.booster.bonusPercent)}`
                    ) : (
                      <span className="usc-muted">Drawn after claiming</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Stations</dt>
                  <dd>
                    {team.stationsCompleted} cleared · <strong>{points(team.points)}</strong> points
                    {ranking?.kind === "ranked" &&
                      ` · ${ordinal(ranking.row.rank)} of ${ranking.total}${ranking.row.racing ? ", racing now" : ""}`}
                  </dd>
                </div>
              </dl>
            )}
          </Panel>
        </div>
      </div>

      <Panel title="Racers" icon="users" count={`${booking.participants.length}`} padded={false}>
        {booking.participants.length === 0 ? (
          <EmptyState icon="users" title="No racers on file" />
        ) : (
          <div className="ad-table-scroll">
            <table className="ad-table usc-people">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Racer</th>
                  <th>Document</th>
                  <th>Contact</th>
                  <th>Trip in Penang</th>
                  <th>Emergency contact</th>
                  <th>Platinum Pass</th>
                </tr>
              </thead>
              <tbody>
                {booking.participants.map((person, index) => {
                  const pass = passes.find(
                    (row) => row.travelDocumentNumber === person.documentNumber
                  );

                  return (
                    <tr key={person.position}>
                      <td className="is-mono">{index + 1}</td>
                      <td>
                        <span className="ad-cell-stack">
                          <b>{person.fullName}</b>
                          <span>
                            {SEX_LABEL[person.sex]}, {person.age} · {person.nationality}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="ad-cell-stack">
                          <b className="usc-mono">{person.documentNumber}</b>
                          <span>{DOCUMENT_TYPE_LABEL[person.documentType]}</span>
                        </span>
                      </td>
                      <td>
                        <span className="ad-cell-stack">
                          <b>
                            <Email address={person.email} />
                          </b>
                          <span>{person.phone}</span>
                        </span>
                      </td>
                      <td>
                        {person.arrivalDate && person.departureDate ? (
                          <span className="ad-cell-stack">
                            <b>
                              {formatDay(person.arrivalDate)} – {formatDay(person.departureDate)}
                            </b>
                            <span className="is-wrap">{person.address ?? ""}</span>
                          </span>
                        ) : (
                          <span className="usc-muted">Not collected</span>
                        )}
                      </td>
                      <td>
                        {person.emergencyContactName ? (
                          <span className="ad-cell-stack">
                            <b>{person.emergencyContactName}</b>
                            <span>
                              {[person.emergencyContactRelationship, person.emergencyContactPhone]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                        ) : (
                          <span className="usc-muted">—</span>
                        )}
                      </td>
                      <td>
                        {pass?.passNumber ? (
                          <span className="ad-cell-stack">
                            <span className="usc-pass usc-copy">{formatPassNumber(pass.passNumber)}</span>
                            <span>
                              {pass.collectedAt
                                ? `Collected ${formatDay(pass.collectedAt)}`
                                : "Awaiting collection"}
                            </span>
                          </span>
                        ) : (
                          <span className="usc-muted">
                            {booking.status === "paid" ? "Not issued" : "Issued once paid"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Declaration" icon="book">
        <p className="ad-panel-note">
          Version <strong>{booking.termsVersion}</strong>, accepted{" "}
          {formatDayTime(booking.termsAcceptedAt)}, together with the Platinum Pass insurance terms.
        </p>
        {booking.termsText && (
          <p className="usc-wording">
            <LinkedText text={booking.termsText} />
          </p>
        )}
      </Panel>
    </>
  );
}

/** Offers a line break after the @, so a long address wraps between its halves, not mid-word. */
function Email({ address }: { address: string }) {
  const at = address.lastIndexOf("@");
  if (at < 0) return <>{address}</>;
  return (
    <>
      {address.slice(0, at + 1)}
      <wbr />
      {address.slice(at + 1)}
    </>
  );
}
