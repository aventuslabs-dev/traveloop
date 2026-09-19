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
};

type PassRegistrationRow = {
  id: number;
  order_session_id: string;
  user_id: string | null;
  pass_key: string;
  pass_name: string;
  unit_amount_cents: number;
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
};

function toStoredPassRegistration(row: PassRegistrationRow): StoredPassRegistration {
  return {
    id: row.id,
    orderSessionId: row.order_session_id,
    userId: row.user_id,
    passKey: row.pass_key,
    passName: row.pass_name,
    unitAmountCents: row.unit_amount_cents,
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
  };
}

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
 * An order's items, rebuilt from the registrations it stored.
 *
 * The cart itself lives in a checkout draft that fulfilment deletes once it's
 * done with it (and that the vacuum clears after a day either way), so this is
 * the durable copy. Anything that needs to reconstruct a receipt after the
 * fact — a redelivered Stripe event, an operator resending from /admin —
 * reads the items back from here rather than from the draft.
 */
export async function getOrderItemsFromRegistrations(sessionId: string): Promise<DraftItem[]> {
  const registrations = await getPassRegistrationsByOrder(sessionId);

  return registrations.map((reg) => ({
    passKey: reg.passKey,
    passName: reg.passName,
    unitAmountCents: reg.unitAmountCents,
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

/** All of a customer's registrations across every order, most recent first — powers /account. */
export async function getPassRegistrationsByUserId(userId: string): Promise<StoredPassRegistration[]> {
  const db = getSupabase();

  const { data, error } = await db
    .from("pass_registrations")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<PassRegistrationRow[]>();

  if (error) {
    throw new Error(`Failed to list pass registrations for user ${userId}: ${error.message}`);
  }

  return (data ?? []).map(toStoredPassRegistration);
}
