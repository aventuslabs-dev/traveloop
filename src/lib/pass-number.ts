/**
 * Pass numbers — the 16-character code a traveller quotes, with their
 * passport, to collect the physical pass.
 *
 * The database issues them (generate_pass_number in supabase/schema.sql);
 * this module only formats them for people and reduces what people type back
 * to the stored form. Kept free of server imports so client code can use it.
 */

/** "7KQM4XRT2BHN9CWD" → "7KQM-4XRT-2BHN-9CWD": four groups read back far more reliably than sixteen in a row. */
export function formatPassNumber(passNumber: string): string {
  return passNumber.match(/.{1,4}/g)?.join("-") ?? passNumber;
}

/** Whatever was typed at the counter, as stored: case, spaces and hyphens don't matter. */
export function normalizePassNumber(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export const PASS_NUMBER_LENGTH = 16;
