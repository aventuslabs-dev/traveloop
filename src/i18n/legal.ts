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

/**
 * The insurance Terms & Conditions are a separate vocabulary from `LegalBlock`
 * above, not an extension of it.
 *
 * They need a benefits table, which the terms pages never use, and they do not
 * need `h3`, `ol` or `dl`, which those pages do. Keeping the two unions apart
 * means the terms renderer's `switch` stays exhaustive without having to
 * handle a block it can never receive.
 */
export type InsuranceBlock =
  | { type: "p"; text: string }
  /** Paragraph opening with a bold lead-in: "**Claims up to RM500** — ...". */
  | { type: "p"; text: string; lead: string }
  | { type: "ul"; items: string[] }
  /** Two-column table: the benefit and its maximum amount. */
  | { type: "table"; columns: [string, string]; rows: [string, string][] };

/** One numbered clause of the insurance document. */
export type InsuranceSection = {
  /** Rendered with its number, which comes from the array index — never typed into a translation. */
  heading: string;
  blocks: InsuranceBlock[];
};

export type InsuranceDoc = {
  heading: string;
  /** The parenthetical under the title. */
  sub: string;
  /**
   * Which language version governs if the two disagree, shown only on a
   * translation. `null` on the English original, which has nothing to defer to.
   */
  governingLanguage: string | null;
  sections: InsuranceSection[];
};
