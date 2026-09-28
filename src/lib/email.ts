import { Resend } from "resend";
import type { StoredOrder } from "./orders-db";
import type { StoredBooking } from "./experience-bookings-db";
import type { IssuedPassItem } from "./pass-registrations-db";
import { buildInvoicePdf, invoiceLineItemsFor } from "./invoice";
import { formatPassNumber } from "./pass-number";
import { COLLECTION_POINT, collectionSteps } from "./pass-collection";
import { formatDateLong, formatPrice, formatTimeRange } from "@/app/data/experiences";
import type { RaceDetails } from "./urban-sprint/race-details";
import {
  ARRIVAL_LEAD_MINUTES,
  arrivalTime,
  formatBookingDate,
  formatSlotTime,
} from "./urban-sprint/booking-config";
import { parseLinkedText } from "./urban-sprint/linked-text";
import { teamLinkPath } from "./urban-sprint/team-link";

/** "Gold Pass" for a single-pass order, "3 passes" for a multi-pass one — matches the order summary. */
function passSummary(order: StoredOrder): string {
  return order.quantity > 1 ? order.passName : `${order.passName} Pass`;
}

/**
 * One row per pass: who it's for and the number they collect it with. Shown
 * for a single pass too — the number is the thing the buyer needs at the
 * airport, so it gets the most prominent spot in the email.
 */
function passNumbersTable(items: IssuedPassItem[]): string {
  if (items.length === 0) return "";

  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 12px 0; border-top: 1px solid #eee;">
            <div style="font-weight: 600;">${escapeHtml(item.registration.fullName)}</div>
            <div style="font-size: 13px; color: #6b6b6b;">${item.passName} Pass</div>
          </td>
          <td style="padding: 12px 0; border-top: 1px solid #eee; text-align: right; white-space: nowrap; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; ${
            item.passNumber
              ? `font-size: 16px; font-weight: 700; letter-spacing: .04em;">${formatPassNumber(item.passNumber)}`
              : `font-size: 13px; color: #6b6b6b;">In your account shortly`
          }</td>
        </tr>`
    )
    .join("");

  return `
    <p style="margin: 24px 0 4px; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #6b6b6b;">Your pass number${items.length > 1 ? "s" : ""}</p>
    <table style="width: 100%; border-collapse: collapse; margin: 0 0 8px; font-size: 14px;">
      ${rows}
    </table>
  `;
}

/** Where and how to pick up the physical pass, with a photo of the counter so it's recognisable on arrival. */
function collectionBlock(passCount: number): string {
  const steps = collectionSteps(passCount)
    .map((step) => `<li style="margin: 0 0 4px;">${step}</li>`)
    .join("");

  return `
    <div style="margin: 24px 0; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
      <img src="${siteUrl()}${COLLECTION_POINT.photo}" width="496" alt="${COLLECTION_POINT.photoAlt}" style="display: block; width: 100%; height: auto; border: 0;" />
      <div style="padding: 18px 20px;">
        <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #D72936;">Collect your physical pass</p>
        <p style="margin: 0 0 6px; font-weight: 700;">${COLLECTION_POINT.place}</p>
        <p style="margin: 0 0 4px; font-size: 14px; color: #3d3d3d;">${COLLECTION_POINT.directions}</p>
        <p style="margin: 0 0 14px; font-size: 14px; color: #6b6b6b;">${COLLECTION_POINT.hours}</p>
        <p style="margin: 0 0 6px; font-size: 14px; font-weight: 600;">At the counter:</p>
        <ol style="margin: 0 0 14px; padding-left: 20px; font-size: 14px;">${steps}</ol>
        <a href="${COLLECTION_POINT.mapsUrl}" style="font-size: 14px; font-weight: 700; color: #D72936;">Open in Google Maps &rarr;</a>
      </div>
    </div>
  `;
}

/** " — you saved MYR 69.90" when the order had any discount, else nothing. */
function savedNote(order: StoredOrder): string {
  const saved = order.discount.automaticCents + order.discount.codeCents;
  if (saved <= 0) return "";
  return ` <span style="color: #0d6b48;">&mdash; you saved ${order.currency.toUpperCase()} ${(saved / 100).toFixed(2)}</span>`;
}

let cached: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.includes("replace_me")) return null;

  if (!cached) cached = new Resend(apiKey);
  return cached;
}

/* ------------------------------------------------------------------ */
/* Urban Sprint: the race part of a team's receipt                     */
/* ------------------------------------------------------------------ */

/**
 * Staff-edited wording as email HTML: escaped throughout, [label](/path) links
 * made absolute (a mail client has no site to resolve "/terms" against), and
 * line breaks kept.
 */
function linkedTextHtml(text: string): string {
  return parseLinkedText(text)
    .map((part) => {
      if (!part.href) return escapeHtml(part.text);
      const href = part.href.startsWith("/") ? `${siteUrl()}${part.href}` : part.href;
      return `<a href="${escapeHtml(href)}" style="color: #244798;">${escapeHtml(part.text)}</a>`;
    })
    .join("")
    .replace(/\n/g, "<br>");
}

/** The Booking ID, when to arrive and when the challenge starts — what the team needs on race day. */
function raceBlock({ booking }: RaceDetails): string {
  const details: [string, string][] = [
    ["Booking ID", booking.reference],
    ["Team name", escapeHtml(booking.teamName)],
    ["Date", formatBookingDate(booking.date)],
    ["Arrival time", formatSlotTime(arrivalTime(booking.time))],
    ["Challenge time", formatSlotTime(booking.time)],
    ["Team size", `${booking.teamSize} people`],
  ];

  return `
    <p style="margin: 16px 0; padding: 14px 16px; background: #F4EFE7; border-radius: 10px; font-size: 14px;">
      Please arrive by <strong>${formatSlotTime(arrivalTime(booking.time))}</strong> — ${ARRIVAL_LEAD_MINUTES} minutes before your ${formatSlotTime(booking.time)} challenge — and quote Booking ID <strong>${booking.reference}</strong> at check-in.
    </p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
      ${details
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding: 8px 0; color: #6b6b6b; width: 45%;">${label}</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right;">${value}</td>
        </tr>`
        )
        .join("")}
    </table>
    <div style="margin: 20px 0; padding: 16px; border: 1px solid #E6DED2; border-radius: 10px;">
      <p style="margin: 0 0 6px; font-size: 15px; font-weight: 700;">Your team page</p>
      <p style="margin: 0 0 14px; font-size: 14px; color: #4a4a4a;">Send this link to everyone on the team — no sign-in needed. On race day it shows your booster, every station you clear and where you stand.</p>
      <a href="${siteUrl()}${teamLinkPath(booking.reference)}" style="display: inline-block; background: #D72936; color: white; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 999px;">Open team page</a>
    </div>
  `;
}

/** The Rules & Regulations, as the console words them at sending. */
function rulesBlock({ rulesText }: RaceDetails): string {
  return `
    <p style="margin: 28px 0 8px; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #6b6b6b;">Urban Sprint Rules &amp; Regulations</p>
    <div style="font-size: 13px; line-height: 1.6; color: #333;">${linkedTextHtml(rulesText)}</div>
  `;
}

/* ------------------------------------------------------------------ */
/* Receipts                                                            */
/* ------------------------------------------------------------------ */

function firstName(order: StoredOrder): string {
  return order.customerName?.split(" ")[0] ?? "traveller";
}

/**
 * The top of a receipt: what was bought. A Premier Pass order leads with the
 * passes; an Urban Sprint order leads with the race, then the Platinum Pass
 * each racer got with it.
 */
function receiptIntro(order: StoredOrder, race: RaceDetails | null): string {
  if (!race) {
    return `<p>Your Traveloop <strong>${passSummary(order)}</strong> ${order.quantity > 1 ? "are" : "is"} confirmed.</p>`;
  }

  return `
    <p>Thanks, ${escapeHtml(firstName(order))} — <strong>${escapeHtml(race.booking.teamName)}</strong> is booked for Urban Sprint.</p>
    ${raceBlock(race)}
    <p style="margin-top: 24px;">Your entry includes a Traveloop <strong>Platinum Pass</strong> for every racer, with its insurance cover. Each person collects theirs with the number below and the IC or passport they registered with.</p>
  `;
}

function receiptHeading(order: StoredOrder, race: RaceDetails | null): string {
  return race
    ? `${escapeHtml(race.booking.teamName)} is in the race!`
    : `Thanks for your purchase, ${escapeHtml(firstName(order))}!`;
}

function receiptSubject(order: StoredOrder, race: RaceDetails | null, welcome: boolean): string {
  if (race) {
    const when = `${formatBookingDate(race.booking.date)}, ${formatSlotTime(race.booking.time)}`;
    return welcome
      ? `Welcome to Traveloop — Urban Sprint booking ${race.booking.reference} confirmed`
      : `Urban Sprint booking ${race.booking.reference} confirmed — ${race.booking.teamName}, ${when}`;
  }
  return welcome
    ? `Welcome to Traveloop — your ${passSummary(order)} ${order.quantity > 1 ? "are" : "is"} confirmed`
    : `Your Traveloop ${passSummary(order)} — ${order.invoiceNumber}`;
}

function confirmationHtml(order: StoredOrder, items: IssuedPassItem[], race: RaceDetails | null): string {
  const loginUrl = `${siteUrl()}/account/login`;

  return emailShell(
    receiptHeading(order, race),
    `
        ${receiptIntro(order, race)}
        ${passNumbersTable(items)}
        ${collectionBlock(order.quantity)}
        <p>Total paid: <strong>${order.currency.toUpperCase()} ${(order.amountTotal / 100).toFixed(2)}</strong>${savedNote(order)}</p>
        <p>Order reference: <code>${order.sessionId}</code><br/>Invoice: <code>${order.invoiceNumber}</code></p>

        <p style="margin-top: 28px;">You can view ${order.quantity > 1 ? "these passes" : "this pass"} and your full purchase history any time in your Traveloop account.</p>

        <p style="text-align: center; margin: 28px 0;">
          <a href="${loginUrl}" style="display: inline-block; background: #D72936; color: white; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 999px;">Go to Customer Portal</a>
        </p>

        <p style="font-size: 13px; color: #6b6b6b;">Your invoice is attached to this email. Quote ${race ? `your Booking ID, ${race.booking.reference},` : "your order reference"} if you contact us.</p>
        ${race ? rulesBlock(race) : ""}
    `
  );
}

function accountWelcomeHtml(
  order: StoredOrder,
  items: IssuedPassItem[],
  password: string,
  race: RaceDetails | null
): string {
  const loginUrl = `${siteUrl()}/account/login`;

  return emailShell(
    receiptHeading(order, race),
    `
        ${receiptIntro(order, race)}
        ${passNumbersTable(items)}
        ${collectionBlock(order.quantity)}
        <p>Total paid: <strong>${order.currency.toUpperCase()} ${(order.amountTotal / 100).toFixed(2)}</strong>${savedNote(order)}</p>
        <p>Order reference: <code>${order.sessionId}</code><br/>Invoice: <code>${order.invoiceNumber}</code></p>

        <p style="margin-top: 28px;">We've also set up a Traveloop account for you, so you can view your passes and purchase history any time:</p>

        <div style="background: #f7f5f2; border-radius: 12px; padding: 18px 20px; margin: 16px 0;">
          <p style="margin: 0 0 8px; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #6b6b6b;">Your login</p>
          <p style="margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px;">Email: ${order.customerEmail}</p>
          <p style="margin: 4px 0 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px;">Password: ${password}</p>
        </div>

        <p style="text-align: center; margin: 28px 0;">
          <a href="${loginUrl}" style="display: inline-block; background: #D72936; color: white; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 999px;">Sign in to your account</a>
        </p>

        <p style="font-size: 13px; color: #6b6b6b;">For your security, we recommend changing this password after you sign in for the first time.</p>
        <p style="font-size: 13px; color: #6b6b6b;">Your invoice is attached to this email. Quote ${race ? `your Booking ID, ${race.booking.reference},` : "your order reference"} if you contact us.</p>
        ${race ? rulesBlock(race) : ""}
    `
  );
}

/**
 * Sends the buyer their receipt + invoice. Throws if the send fails, or if
 * the invoice PDF can't be built — the caller decides what that means.
 *
 * `race` is set for an Urban Sprint order: the same receipt then doubles as
 * the team's booking confirmation, so a team gets one email, not two.
 *
 * Falls back to logging the full email to the console when RESEND_API_KEY
 * isn't set, so the checkout flow can be exercised end-to-end without an
 * email provider account.
 */
export async function sendOrderConfirmationEmail(
  order: StoredOrder,
  items: IssuedPassItem[],
  race: RaceDetails | null = null
): Promise<void> {
  const resend = getResend();
  const subject = receiptSubject(order, race, false);

  if (!resend) {
    console.info("[email] RESEND_API_KEY not set — logging email instead of sending:", {
      to: order.customerEmail,
      subject,
      invoiceNumber: order.invoiceNumber,
      passNumbers: items.map((item) => item.passNumber),
    });
    return;
  }

  if (!order.customerEmail) {
    console.warn(`[email] Order ${order.sessionId} has no customer email — skipping send.`);
    return;
  }

  const from = process.env.EMAIL_FROM ?? "Traveloop <onboarding@resend.dev>";
  const invoicePdf = await buildInvoicePdf(order, invoiceLineItemsFor(order, items));

  const { error } = await resend.emails.send({
    from,
    to: order.customerEmail,
    subject,
    html: confirmationHtml(order, items, race),
    attachments: [
      {
        filename: `${order.invoiceNumber}.pdf`,
        content: invoicePdf.toString("base64"),
      },
    ],
  });

  if (error) {
    // Raised, not swallowed. Fulfilment owns what happens next: it writes the
    // reason onto the order so /admin can show who is still waiting and offer
    // a resend. Logging and returning would leave an undelivered receipt with
    // nothing anywhere to say so.
    throw new Error(`Resend rejected the confirmation for ${order.sessionId}: ${error.message}`);
  }
}

/**
 * Sent once, on the buyer's first purchase: thanks them, hands over their
 * auto-generated account credentials, and links to the customer portal.
 * Repeat purchases get the plain sendOrderConfirmationEmail instead — the
 * account already exists, so there's no password to hand over again.
 */
export async function sendAccountWelcomeEmail(
  order: StoredOrder,
  items: IssuedPassItem[],
  password: string,
  race: RaceDetails | null = null
): Promise<void> {
  const resend = getResend();
  const subject = receiptSubject(order, race, true);

  if (!resend) {
    console.info("[email] RESEND_API_KEY not set — logging welcome email instead of sending:", {
      to: order.customerEmail,
      subject,
      invoiceNumber: order.invoiceNumber,
      passNumbers: items.map((item) => item.passNumber),
      generatedPassword: password,
    });
    return;
  }

  if (!order.customerEmail) {
    console.warn(`[email] Order ${order.sessionId} has no customer email — skipping welcome send.`);
    return;
  }

  const from = process.env.EMAIL_FROM ?? "Traveloop <onboarding@resend.dev>";
  const invoicePdf = await buildInvoicePdf(order, invoiceLineItemsFor(order, items));

  const { error } = await resend.emails.send({
    from,
    to: order.customerEmail,
    subject,
    html: accountWelcomeHtml(order, items, password, race),
    attachments: [
      {
        filename: `${order.invoiceNumber}.pdf`,
        content: invoicePdf.toString("base64"),
      },
    ],
  });

  if (error) {
    // See sendOrderConfirmationEmail: the caller records the failure.
    throw new Error(`Resend rejected the welcome email for ${order.sessionId}: ${error.message}`);
  }
}

/* ------------------------------------------------------------------ */
/* Contact form                                                        */
/* ------------------------------------------------------------------ */

/** Visitor-supplied text goes into an HTML email — escape it, don't trust it. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type ContactEnquiry = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

/**
 * Delivers a website enquiry to the team inbox, with the visitor's address as
 * reply-to so a reply goes straight back to them. Logs instead of sending when
 * Resend isn't configured. Returns false if the enquiry could not be delivered,
 * so the form can tell the visitor rather than silently swallowing it.
 */
export async function sendContactEnquiryEmail(enquiry: ContactEnquiry): Promise<boolean> {
  const to = process.env.CONTACT_NOTIFICATION_EMAIL ?? "hello@traveloop.my";
  const resend = getResend();

  if (!resend) {
    console.info("[email] RESEND_API_KEY not set — logging contact enquiry instead of sending:", {
      to,
      ...enquiry,
    });
    return true;
  }

  const html = emailShell(
    "New website enquiry",
    `
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px; font-size: 14px;">
        <tr><td style="padding: 8px 0; color: #6b6b6b; width: 30%;">Name</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(enquiry.name)}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b6b6b;">Email</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(enquiry.email)}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b6b6b;">Subject</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(enquiry.subject)}</td></tr>
      </table>
      <p style="background:#f7f5f2; border-radius:12px; padding:16px 18px; font-size:13.5px; white-space:pre-wrap;">${escapeHtml(enquiry.message)}</p>
    `
  );

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Traveloop <onboarding@resend.dev>",
    to,
    replyTo: enquiry.email,
    subject: `[${enquiry.subject}] Website enquiry from ${enquiry.name}`,
    html,
  });

  if (error) {
    console.error("[email] Failed to send contact enquiry:", error);
    return false;
  }

  return true;
}

/* ------------------------------------------------------------------ */
/* Cultural-experience bookings                                        */
/* ------------------------------------------------------------------ */

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** The red header + bordered body the pass emails above use, factored out. */
function emailShell(heading: string, body: string): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1a1a1a; max-width: 560px; margin: 0 auto;">
      <div style="background: #D72936; padding: 28px 32px; border-radius: 16px 16px 0 0;">
        <p style="margin: 0; color: rgba(255,255,255,.8); font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;">Traveloop</p>
        <h1 style="margin: 8px 0 0; color: white; font-size: 22px;">${heading}</h1>
      </div>
      <div style="border: 1px solid #eee; border-top: none; padding: 28px 32px; border-radius: 0 0 16px 16px;">
        ${body}
      </div>
    </div>
  `;
}

/** The date / time / venue / headcount block shared by every booking email. */
function bookingDetails(booking: StoredBooking): string {
  const rows: [string, string][] = [
    ["Experience", booking.experienceName],
    ["Date", formatDateLong(booking.sessionDate)],
    ["Time", formatTimeRange(booking.startMinutes, booking.endMinutes)],
    ["Venue", booking.location ?? "Confirmed by our team"],
    [
      "Participants",
      `${booking.participants}${
        booking.childrenCount > 0 ? ` + ${booking.childrenCount} child (free)` : ""
      }`,
    ],
    ["Payable at the venue", formatPrice(booking.quotedAmountCents)],
    ["Reference", booking.reference],
  ];

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
      ${rows
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding: 8px 0; color: #6b6b6b; width: 45%;">${label}</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right;">${value}</td>
        </tr>`
        )
        .join("")}
    </table>
  `;
}

const PORTAL_BUTTON = `
  <p style="text-align: center; margin: 28px 0;">
    <a href="${siteUrl()}/account/bookings" style="display: inline-block; background: #D72936; color: white; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 999px;">View my bookings</a>
  </p>
`;

/**
 * Sends a booking email, or logs it when Resend isn't configured — the same
 * fallback the pass emails use, so the booking flow is testable without an
 * email provider. Never throws: a failed send must not undo a real booking.
 */
async function sendBookingEmail(
  to: string | null,
  subject: string,
  html: string,
  context: string
): Promise<void> {
  const resend = getResend();

  if (!resend) {
    console.info("[email] RESEND_API_KEY not set — logging booking email instead of sending:", {
      to,
      subject,
    });
    return;
  }

  if (!to) {
    console.warn(`[email] No recipient for ${context} — skipping send.`);
    return;
  }

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Traveloop <onboarding@resend.dev>",
    to,
    subject,
    html,
  });

  if (error) {
    console.error(`[email] Failed to send ${context}:`, error);
  }
}

/** Sent the moment a booking is placed: what they asked for, and what happens next. */
export async function sendBookingRequestEmail(
  booking: StoredBooking,
  to: string | null
): Promise<void> {
  const html = emailShell(
    "Your booking is in.",
    `
      <p>Thanks — we've received your booking for the <strong>${booking.experienceName}</strong>.</p>
      ${bookingDetails(booking)}
      <p>Our team is confirming the session now. You'll get a second email once it's locked in${
        booking.location ? "" : ", including the exact venue"
      } — usually within one working day.</p>
      <p style="font-size: 13px; color: #6b6b6b;">Payment is made at the venue on the day. Nothing has been charged.</p>
      ${PORTAL_BUTTON}
    `
  );

  await sendBookingEmail(
    to,
    `Booking received — ${booking.experienceName}, ${formatDateLong(booking.sessionDate)}`,
    html,
    `booking request ${booking.reference}`
  );
}

/** Sent when the team confirms or cancels a booking from the admin panel. */
export async function sendBookingStatusEmail(
  booking: StoredBooking,
  to: string | null
): Promise<void> {
  const isConfirmed = booking.status === "confirmed";

  const html = emailShell(
    isConfirmed ? "You're confirmed." : "Your booking was cancelled.",
    isConfirmed
      ? `
        <p>Your <strong>${booking.experienceName}</strong> is confirmed. We'll see you there.</p>
        ${bookingDetails(booking)}
        ${
          booking.adminNotes
            ? `<p style="background:#f7f5f2; border-radius:12px; padding:16px 18px; font-size:13.5px;">${booking.adminNotes}</p>`
            : ""
        }
        <p style="font-size: 13px; color: #6b6b6b;">Please bring your pass and settle ${formatPrice(
          booking.quotedAmountCents
        )} at the venue. Need to change something? Reply to this email quoting ${booking.reference}.</p>
        ${PORTAL_BUTTON}
      `
      : `
        <p>Your booking for the <strong>${booking.experienceName}</strong> has been cancelled. You haven't been charged.</p>
        ${bookingDetails(booking)}
        ${
          booking.adminNotes
            ? `<p style="background:#f7f5f2; border-radius:12px; padding:16px 18px; font-size:13.5px;">${booking.adminNotes}</p>`
            : ""
        }
        <p>Your pass benefits are unaffected — you're welcome to book another session any time.</p>
        ${PORTAL_BUTTON}
      `
  );

  await sendBookingEmail(
    to,
    isConfirmed
      ? `Confirmed — ${booking.experienceName}, ${formatDateLong(booking.sessionDate)}`
      : `Cancelled — ${booking.experienceName}, ${formatDateLong(booking.sessionDate)}`,
    html,
    `booking status ${booking.reference}`
  );
}

/**
 * Heads-up to the operations inbox that something needs confirming. Skipped
 * silently when BOOKINGS_NOTIFICATION_EMAIL isn't configured — the admin panel
 * lists every booking regardless, so this is a convenience, not the record.
 */
export async function sendBookingAdminAlert(
  booking: StoredBooking,
  customerEmail: string | null
): Promise<void> {
  const to = process.env.BOOKINGS_NOTIFICATION_EMAIL;
  if (!to) return;

  const html = emailShell(
    "New experience booking",
    `
      <p><strong>${booking.experienceName}</strong> booked by ${customerEmail ?? "a customer"} on a ${
        booking.passKey
      } pass.</p>
      ${bookingDetails(booking)}
      ${
        booking.customerNotes
          ? `<p style="background:#f7f5f2; border-radius:12px; padding:16px 18px; font-size:13.5px;"><strong>Customer note:</strong> ${booking.customerNotes}</p>`
          : ""
      }
      <p style="text-align: center; margin: 28px 0;">
        <a href="${siteUrl()}/admin/bookings" style="display: inline-block; background: #D72936; color: white; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 999px;">Open admin</a>
      </p>
    `
  );

  await sendBookingEmail(to, `New booking — ${booking.reference}`, html, `admin alert ${booking.reference}`);
}
