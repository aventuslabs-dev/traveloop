/**
 * Fills `{placeholder}` slots in a dictionary string.
 *
 *   t("Switch to {language}", { language: "中文" }) → "Switch to 中文"
 *
 * Deliberately tiny: the dictionaries hold whole sentences rather than
 * fragments glued together at runtime, so this only ever substitutes names,
 * counts and prices — never grammar. An unmatched slot is left as-is so a
 * missing value shows up in review instead of rendering "undefined".
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  );
}

/**
 * A count and the noun that agrees with it:
 *
 *   count({ one: "{n} booking", other: "{n} bookings" }, 3) → "3 bookings"
 *
 * Two forms rather than a full CLDR plural-rules table because that is what
 * these two languages need — English inflects on "exactly one", Chinese does
 * not inflect at all and sets both forms to the same string. `{n}` is filled
 * with the count.
 *
 * Written as a dictionary shape rather than a runtime `n === 1 ? a : b` at the
 * call site so the Chinese dictionary is never forced to carry a distinction
 * it does not make, and so a language that pluralises differently is a change
 * here rather than in every component.
 */
export type Plural = { one: string; other: string };

export function count(forms: Plural, n: number): string {
  return fill(n === 1 ? forms.one : forms.other, { n });
}
