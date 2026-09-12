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
