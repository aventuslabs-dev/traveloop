/**
 * Where travellers pick up their physical pass. The site renders this from
 * the `checkout.collection` dictionary so it follows the reader's language;
 * the English here is for the receipt email and invoice PDF, which are
 * English-only (the PDF's built-in fonts carry no Chinese glyphs).
 */
export const COLLECTION_POINT = {
  /** Photo of the counter, in /public. Emails need it as an absolute URL. */
  photo: "/collection.jpeg",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Penang+International+Airport",
  place: "Penang International Airport — Arrival Hall",
  directions:
    "Walk out of the Arrival Hall and the yellow Airport Taxi Services counter is right in front of you.",
  hours: "Open daily, 7:00 AM until the last flight.",
  photoAlt:
    "The yellow Airport Taxi Services counter just outside the Arrival Hall at Penang International Airport",
} as const;

/** What to hand over at the counter — worded for one pass or several. */
export function collectionSteps(passCount: number): string[] {
  return passCount > 1
    ? ["Show the passport of each traveller.", "Give the pass number for each pass."]
    : ["Show your passport.", "Give your pass number."];
}
