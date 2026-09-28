import { NextResponse } from "next/server";
import { getUrbanSprintSession } from "@/lib/urban-sprint/auth";
import {
  arrivalTime,
  formatSlotTime,
  malaysiaToday,
  photoFolderName,
} from "@/lib/urban-sprint/booking-config";
import { DOCUMENT_TYPE_LABEL, SEX_LABEL } from "@/lib/urban-sprint/booking-form";
import { listBookingsForExport } from "@/lib/urban-sprint/bookings-db";
import { formatDuration } from "@/lib/urban-sprint/format";
import { getResults } from "@/lib/urban-sprint/results-db";
import { getPassRegistrationsByOrders } from "@/lib/pass-registrations-db";
import { formatPassNumber } from "@/lib/pass-number";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * CSV exports for the organisers: every booking with its participants (one
 * row per person, so it drops straight into the Traveloop Card and insurance
 * registration), or the results table on its own.
 *
 * Admin only, and checked here rather than trusted to the console that links
 * to it — the URL is guessable, and the bookings file carries identity numbers.
 */
export async function GET(request: Request) {
  const session = await getUrbanSprintSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const kind = new URL(request.url).searchParams.get("kind") === "results" ? "results" : "bookings";

  try {
    const rows = kind === "results" ? await resultsSheet() : await bookingsSheet();
    return csvResponse(rows, `urban-sprint-${kind}-${malaysiaToday()}.csv`);
  } catch (error) {
    console.error(`[us-export] Couldn't export ${kind}:`, error);
    return NextResponse.json({ error: "The export failed. Please try again." }, { status: 500 });
  }
}

async function bookingsSheet(): Promise<string[][]> {
  const [bookings, results] = await Promise.all([listBookingsForExport(), getResults()]);
  const rankByReference = new Map(results.map((row) => [row.reference, row.rank]));

  // Each paid team's Platinum Passes, from its Traveloop order (same session).
  const passes = await getPassRegistrationsByOrders(
    bookings.flatMap((booking) => (booking.stripeSessionId ? [booking.stripeSessionId] : []))
  );
  const passNumberFor = (sessionId: string | null, documentNumber: string) => {
    const pass = passes.find(
      (row) => row.orderSessionId === sessionId && row.travelDocumentNumber === documentNumber
    );
    return pass?.passNumber ? formatPassNumber(pass.passNumber) : "";
  };

  const header = [
    "Booking ID",
    "Status",
    "Date",
    "Challenge time",
    "Arrival time",
    "Team name",
    "Team size",
    "Amount paid (RM)",
    "Paid at",
    "Payer name",
    "Payer email",
    "Payer phone",
    "Participant #",
    "Full name",
    "Document type",
    "Document number",
    "Nationality",
    "Sex",
    "Age",
    "Email",
    "Mobile",
    "Arrival date",
    "Departure date",
    "Address",
    "Emergency contact",
    "Emergency phone",
    "Emergency relationship",
    "Platinum Pass No.",
    "Points",
    "Completion time",
    "Rank",
    "Photo folder",
    "Declaration version",
    "Declaration accepted at",
  ];

  const rows = bookings.flatMap((booking) =>
    booking.participants.map((person) => [
      booking.reference,
      booking.status,
      booking.date,
      formatSlotTime(booking.time),
      formatSlotTime(arrivalTime(booking.time)),
      booking.teamName,
      String(booking.teamSize),
      (booking.amountCents / 100).toFixed(2),
      malaysiaTimestamp(booking.paidAt),
      booking.payerName ?? "",
      booking.payerEmail ?? "",
      booking.payerPhone ?? "",
      String(person.position + 1),
      person.fullName,
      DOCUMENT_TYPE_LABEL[person.documentType],
      person.documentNumber,
      person.nationality,
      SEX_LABEL[person.sex],
      String(person.age),
      person.email,
      person.phone,
      person.arrivalDate ?? "",
      person.departureDate ?? "",
      person.address ?? "",
      person.emergencyContactName ?? "",
      person.emergencyContactPhone ?? "",
      person.emergencyContactRelationship ?? "",
      passNumberFor(booking.stripeSessionId, person.documentNumber),
      booking.resultPoints === null ? "" : String(booking.resultPoints),
      booking.resultSeconds === null ? "" : formatDuration(booking.resultSeconds),
      String(rankByReference.get(booking.reference) ?? ""),
      photoFolderName(booking.reference, booking.teamName),
      booking.termsVersion,
      malaysiaTimestamp(booking.termsAcceptedAt),
    ])
  );

  return [header, ...rows];
}

async function resultsSheet(): Promise<string[][]> {
  const results = await getResults();

  const header = [
    "Rank",
    "Booking ID",
    "Team name",
    "Team size",
    "Date",
    "Challenge time",
    "Points",
    "Completion time",
    "Completion seconds",
    "Photo folder",
  ];

  const rows = results.map((row) => [
    String(row.rank),
    row.reference,
    row.teamName,
    String(row.teamSize),
    row.date,
    formatSlotTime(row.time),
    String(row.points),
    formatDuration(row.seconds),
    String(row.seconds),
    photoFolderName(row.reference, row.teamName),
  ]);

  return [header, ...rows];
}

/** "2026-10-03 14:05" in Malaysian time, or blank. */
function malaysiaTimestamp(iso: string | null): string {
  if (!iso) return "";
  return new Date(Date.parse(iso) + 8 * 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " ");
}

/**
 * One CSV cell. Quoted when it needs to be, and defused when it starts like a
 * formula: a team name or email typed by the public must not run as a
 * spreadsheet formula on an organiser's laptop.
 */
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function csvResponse(rows: string[][], filename: string): Response {
  // The byte-order mark makes Excel read the file as UTF-8, so names with
  // accents or Chinese characters survive the double-click open.
  const body = "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";

  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
