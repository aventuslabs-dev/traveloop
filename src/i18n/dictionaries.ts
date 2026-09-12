import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";

/**
 * Loads the dictionary for a locale.
 *
 * Only ever call this from a Server Component or a server action — the whole
 * dictionary is far larger than any one page needs in the browser. Client
 * components receive the single namespace they use, handed down as a prop by
 * the server component that renders them.
 */
const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en").then((m) => m.default),
  cn: () => import("./dictionaries/cn").then((m) => m.default),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return loaders[locale]();
}

export type { Dictionary };
export type { Namespace } from "./dictionaries/en";
