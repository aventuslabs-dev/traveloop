import { getSupabase } from "./supabase";
import type { DraftItem } from "./checkout-drafts-db";

/** One traveller's registration/insurance record, as stored — one row per pass. */
export type StoredPassRegistration = {
  id: number;
  orderSessionId: string;
  userId: string | null;
  passKey: string;
  passName: string;
  unitAmountCents: number;
  /** Price before any discount; null for passes sold before discounts existed. */
  listAmountCents: number | null;
  fullName: string;
  nationality: string;
  arrivalDate: string;
  departureDate: string;
  travelDocumentType: string;
  travelDocumentNumber: string;
  address: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  termsAcceptedAt: string;
  createdAt: string;
  /** Null only if this code is running ahead of the migration that adds the column. */
  passNumber: string | null;
  /** When the physical pass was handed over at the counter; null while it's still waiting. */
  collectedAt: string | null;
};

type PassRegistrationRow = {
  id: number;
  order_session_id: string;
  user_id: string | null;
  pass_key: string;
  pass_name: string;
  unit_amount_cents: number;
  list_amount_cents?: number | null;
  full_name: string;
  nationality: string;
  arrival_date: string;
  departure_date: string;
  travel_document_type: string;
  travel_document_number: string;
  address: string;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  terms_accepted_at: string;
  created_at: string;
  pass_number?: string | null;
  collected_at?: string | null;
};

function toStoredPassRegistration(row: PassRegistrationRow): StoredPassRegistration {
  return {
    id: row.id,
    orderSessionId: row.order_session_id,
    userId: row.user_id,
    passKey: row.pass_key,
    passName: row.pass_name,
    unitAmountCents: row.unit_amount_cents,
    listAmountCents: row.list_amount_cents ?? null,
    fullName: row.full_name,
    nationality: row.nationality,
    arrivalDate: row.arrival_date,
    departureDate: row.departure_date,
    travelDocumentType: row.travel_document_type,
    travelDocumentNumber: row.travel_document_number,
    address: row.address,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    emergencyContactRelationship: row.emergency_contact_relationship,
    termsAcceptedAt: row.terms_accepted_at,
    createdAt: row.created_at,
    // `?? null` so a deploy that lands before the migration reads as "no
    // number yet" rather than undefined.
    passNumber: row.pass_number ?? null,
    collectedAt: row.collected_at ?? null,
  };
}

/** A pass in an order, as the receipt and invoice describe it: what was bought, for whom, and its number. */
export type IssuedPassItem = DraftItem & {
  /** Null when the registrations couldn't be stored, so the database never issued one. */
  passNumber: string | null;
};

/** Inserts one registration row per pass in the order — the itemised breakdown of a purchase. */
export async function insertPassRegistrations(
  orderSessionId: string,
  userId: string | null,
  items: DraftItem[]
): Promise<void> {
  const db = getSupabase();

  const { error } = await db.from("pass_registrations").insert(
    items.map((item) => ({
      order_session_id: orderSessionId,
      user_id: userId,
      pass_key: item.passKey,
      pass_name: item.passName,
      unit_amount_cents: item.unitAmountCents,
      list_amount_cents: item.listAmountCents ?? null,
      full_name: item.registration.fullName,
      nationality: item.registration.nationality,
      arrival_date: item.registration.arrivalDate,
      departure_date: item.registration.departureDate,
      travel_document_type: item.registration.travelDocumentType,
      travel_document_number: item.registration.travelDocumentNumber,
      address: item.registration.address,
      emergency_contact_name: item.registration.emergencyContactName,
      emergency_contact_phone: item.registration.emergencyContactPhone,
      emergency_contact_relationship: item.registration.emergencyContactRelationship,
      terms_accepted_at: item.registration.termsAcceptedAt,
    }))
  );

  if (error) {
    throw new Error(`Failed to save pass registrations for order ${orderSessionId}: ${error.message}`);
  }
}

export async function getPassRegistrationsByOrder(sessionId: string): Promise<StoredPassRegistration[]> {
  const db = getSupabase();

  const { data, error } = await db
    .from("pass_registrations")
    .select()
    .eq("order_session_id", sessionId)
    .order("id", { ascending: true })
    .returns<PassRegistrationRow[]>();

  if (error) {
    throw new Error(`Failed to list pass registrations for order ${sessionId}: ${error.message}`);
  }

  return (data ?? []).map(toStoredPassRegistration);
}

/**
 * An order's passes, rebuilt from the registrations it stored — the only
 * place their pass numbers exist.
 *
 * The cart itself lives in a checkout draft that fulfilment deletes once it's
 * done with it (and that the vacuum clears after a day either way), so this is
 * the durable copy. Anything that needs to reconstruct a receipt after the
 * fact — a redelivered Stripe event, an operator resending from /admin —
 * reads the items back from here rather than from the draft.
 */
export async function getOrderItemsFromRegistrations(sessionId: string): Promise<IssuedPassItem[]> {
  const registrations = await getPassRegistrationsByOrder(sessionId);

  return registrations.map((reg) => ({
    passNumber: reg.passNumber,
    passKey: reg.passKey,
    passName: reg.passName,
    unitAmountCents: reg.unitAmountCents,
    listAmountCents: reg.listAmountCents ?? undefined,
    registration: {
      fullName: reg.fullName,
      nationality: reg.nationality,
      arrivalDate: reg.arrivalDate,
      departureDate: reg.departureDate,
      travelDocumentType: reg.travelDocumentType,
      travelDocumentNumber: reg.travelDocumentNumber,
      address: reg.address,
      emergencyContactName: reg.emergencyContactName,
      emergencyContactPhone: reg.emergencyContactPhone,
      emergencyContactRelationship: reg.emergencyContactRelationship,
      termsAcceptedAt: reg.termsAcceptedAt,
    },
  }));
}

/**
 * The passes on a set of orders, oldest first within each.
 *
 * Asks by order rather than by `pass_registrations.user_id`: that column is
 * written once at purchase, and it stays null when an order is linked to an
 * account afterwards (backfillOrdersForEmail, or an admin changing an email).
 * `orders.user_id` is the link that stays current, so pages that show a
 * customer their passes fetch that customer's orders first and come here.
 */
export async function getPassRegistrationsByOrders(
  sessionIds: string[]
): Promise<StoredPassRegistration[]> {
  if (sessionIds.length === 0) return [];

  const db = getSupabase();

  const { data, error } = await db
    .from("pass_registrations")
    .select()
    .in("order_session_id", sessionIds)
    .order("id", { ascending: true })
    .returns<PassRegistrationRow[]>();

  if (error) {
    throw new Error(`Failed to list pass registrations for ${sessionIds.length} orders: ${error.message}`);
  }

  return (data ?? []).map(toStoredPassRegistration);
}

/* ------------------------------------------------------------------ */
/* Pass tracking (admin)                                               */
/* ------------------------------------------------------------------ */

/**
 * A pass with the order it was bought on. The order, not the registration,
 * says whose account a pass belongs to — see getPassRegistrationsByOrders.
 */
export type TrackedPass = StoredPassRegistration & {
  order: {
    invoiceNumber: string;
    userId: string | null;
    customerName: string | null;
    customerEmail: string | null;
    createdAt: string;
  } | null;
};

type TrackedPassRow = PassRegistrationRow & {
  orders: {
    invoice_number: string;
    user_id: string | null;
    customer_name: string | null;
    customer_email: string | null;
    created_at: string;
  } | null;
};

/** Follows order_session_id → orders.session_id, the foreign key in schema.sql. */
const TRACKED_PASS_SELECT =
  "*, orders(invoice_number, user_id, customer_name, customer_email, created_at)";

function toTrackedPass(row: TrackedPassRow): TrackedPass {
  const order = row.orders;
  return {
    ...toStoredPassRegistration(row),
    order: order
      ? {
          invoiceNumber: order.invoice_number,
          userId: order.user_id,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          createdAt: order.created_at,
        }
      : null,
  };
}

/** Keeps the passes table to one request's worth as the business grows — passes outnumber orders. */
const ADMIN_PASS_LIST_LIMIT = 1000;

/** Every pass sold, newest first — powers /admin/passes. */
export async function getAllPasses(): Promise<TrackedPass[]> {
  const db = getSupabase();

  const { data, error } = await db
    .from("pass_registrations")
    .select(TRACKED_PASS_SELECT)
    .order("id", { ascending: false })
    .limit(ADMIN_PASS_LIST_LIMIT)
    .returns<TrackedPassRow[]>();

  if (error) {
    throw new Error(`Failed to list passes: ${error.message}`);
  }

  return (data ?? []).map(toTrackedPass);
}

/** The pass with this number, already normalised (see normalizePassNumber), or null. */
export async function getPassByNumber(passNumber: string): Promise<TrackedPass | null> {
  const db = getSupabase();

  const { data, error } = await db
    .from("pass_registrations")
    .select(TRACKED_PASS_SELECT)
    .eq("pass_number", passNumber)
    .maybeSingle<TrackedPassRow>();

  if (error) {
    throw new Error(`Failed to look up pass ${passNumber}: ${error.message}`);
  }

  return data ? toTrackedPass(data) : null;
}

/** Records the hand-over at the counter, or undoes one recorded by mistake. */
export async function setPassCollected(passNumber: string, collected: boolean): Promise<void> {
  const db = getSupabase();

  const { error } = await db
    .from("pass_registrations")
    .update({ collected_at: collected ? new Date().toISOString() : null })
    .eq("pass_number", passNumber);

  if (error) {
    throw new Error(`Failed to update collection for pass ${passNumber}: ${error.message}`);
  }
}
