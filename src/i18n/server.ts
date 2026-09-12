import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale, splitLocale } from "./config";

/**
 * The locale a *server action* is running for.
 *
 * Pages get the locale from `params.lang` and should use that — it is
 * authoritative. Server actions have no params, so this reads the `Referer`
 * of the form post, which is the page the visitor actually submitted from,
 * and falls back to the cookie the proxy sets on every localized page view.
 *
 * Referer first matters for anyone with two tabs open in different languages:
 * the cookie holds whichever they loaded last, the referer holds the one they
 * actually clicked in.
 */
export async function actionLocale(): Promise<Locale> {
  const referer = (await headers()).get("referer");

  if (referer) {
    try {
      const { locale } = splitLocale(new URL(referer).pathname);
      if (locale) return locale;
    } catch {
      // A malformed or cross-origin referer is no worse than none — fall
      // through to the cookie rather than throwing inside an action.
    }
  }

  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(saved) ? saved : defaultLocale;
}

/**
 * An absolute app path prefixed with the acting locale, for `redirect()`
 * inside a server action:
 *
 *   redirect(await actionPath("/account/login"))
 */
export async function actionPath(path: string): Promise<string> {
  return `/${await actionLocale()}${path}`;
}
