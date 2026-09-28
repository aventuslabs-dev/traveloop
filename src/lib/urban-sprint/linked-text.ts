/**
 * The one piece of markup the console's wording fields understand:
 * `[label](/path)` becomes a link. Everything else stays text — the wording is
 * typed by staff and shown to the public, so it is never interpreted as HTML.
 *
 * Only site paths ("/terms") and https URLs become links; anything else
 * (javascript:, protocol-relative //host) is left as the literal text.
 *
 * Browser-safe: the booking form renders the declaration with it.
 */

export type TextPart = { text: string; href?: string };

const LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;

function safeHref(href: string): string | null {
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (href.startsWith("https://")) return href;
  return null;
}

export function parseLinkedText(input: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;

  for (const match of input.matchAll(LINK)) {
    const [whole, label, rawHref] = match;
    const href = safeHref(rawHref);
    if (!href) continue;

    if (match.index > last) parts.push({ text: input.slice(last, match.index) });
    parts.push({ text: label, href });
    last = match.index + whole.length;
  }

  if (last < input.length) parts.push({ text: input.slice(last) });
  return parts;
}

/** The wording with its links stripped to their labels — for CSV and plain-text records. */
export function linkedTextToPlain(input: string): string {
  return parseLinkedText(input)
    .map((part) => part.text)
    .join("");
}
