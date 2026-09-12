/**
 * The block vocabulary the legal pages are written in.
 *
 * Terms and the insurance schedule are long, heavily structured documents.
 * Modelling them as data rather than as JSX keeps each locale a single
 * editable file, makes the two languages diffable side by side, and means the
 * page component is one small renderer instead of hundreds of translated tags.
 */
export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  /** Bulleted list. */
  | { type: "ul"; items: string[] }
  /** Numbered list where each item opens with a bold lead-in. */
  | { type: "ol"; items: { lead: string; text: string }[] }
  /** Definition list — label on the left, value on the right. */
  | { type: "dl"; items: { term: string; text: string; href?: string }[] };

export type LegalSection = {
  /** Anchor id. Stays identical across locales so a deep link survives a switch. */
  id: string;
  /** Table-of-contents label and the section's own heading. */
  label: string;
  heading: string;
  blocks: LegalBlock[];
};
