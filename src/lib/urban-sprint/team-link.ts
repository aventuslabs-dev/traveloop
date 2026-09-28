import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A booked team's private page link — how racers follow their own race without
 * an account. Only gamemasters and organisers sign in; a racer taps the link
 * from the booking confirmation (or a teammate's WhatsApp) and is there.
 *
 * The token is the Booking ID plus an HMAC of it, so it can be checked without
 * storing anything: /urban-sprint/t/US-ABCD2345-Xy3k9Qm2PzL8vR1w. The link
 * alone can't be forged, but it isn't the only way in: the landing page's
 * "Already booked?" box (urban-sprint/actions.ts) hands the link to anyone who
 * types a paid Booking ID. That's by choice — the page is read-only and holds
 * no personal details (the team's name, score, booster, stations and
 * standing), and Booking IDs are random enough not to be guessed — but it
 * does mean an ID read out at check-in opens the page too.
 *
 * The key is URBAN_SPRINT_LINK_SECRET when set; otherwise it is derived from
 * the Supabase service-role key, which never leaves the server either. Setting
 * or changing URBAN_SPRINT_LINK_SECRET retires every link already sent.
 */

const SIGNATURE_LENGTH = 16;

function signingKey(): Buffer {
  const secret = process.env.URBAN_SPRINT_LINK_SECRET;
  if (secret) return Buffer.from(secret);

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("URBAN_SPRINT_LINK_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set.");
  // Derived, so the service key itself is never what signs a public URL.
  return createHmac("sha256", serviceKey).update("urban-sprint team link v1").digest();
}

function signature(reference: string): string {
  return createHmac("sha256", signingKey())
    .update(reference)
    .digest("base64url")
    .slice(0, SIGNATURE_LENGTH);
}

export function teamLinkToken(reference: string): string {
  return `${reference}-${signature(reference)}`;
}

/** Path only; prefix getSiteUrl() where an absolute link is needed (email, sharing). */
export function teamLinkPath(reference: string): string {
  return `/urban-sprint/t/${teamLinkToken(reference)}`;
}

/** The Booking ID a token was issued for, or null when it isn't one of ours. */
export function readTeamLinkToken(token: string): string | null {
  const match = /^(US-[A-Z0-9]{8})-([A-Za-z0-9_-]{16})$/.exec(token);
  if (!match) return null;

  const [, reference, given] = match;
  const expected = Buffer.from(signature(reference));
  const actual = Buffer.from(given);
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? reference : null;
}
