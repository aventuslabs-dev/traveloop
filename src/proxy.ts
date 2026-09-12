import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  type Locale,
  splitLocale,
} from "@/i18n/config";

/**
 * Every page lives under a locale segment, so a request without one is sent to
 * the visitor's remembered locale — or to `en` if they have never chosen.
 *
 * Deliberately *not* sniffing `Accept-Language`: auto-redirecting on a browser
 * header sends crawlers to whichever locale the crawl happens to advertise and
 * strands anyone whose browser language isn't their reading preference. The
 * first-visit banner (LanguageBanner) offers the switch instead, which keeps
 * the choice the visitor's and `/en` the stable canonical entry point.
 */
function rememberedLocale(request: NextRequest): Locale {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  return isLocale(saved) ? saved : defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { locale } = splitLocale(pathname);

  if (!locale) {
    const url = request.nextUrl.clone();
    url.pathname = `/${rememberedLocale(request)}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const response = await updateSession(request, locale);

  // Reaching a prefixed URL by any route — a link, a share, the switcher —
  // is the visitor telling us which language they read. Persist it so a later
  // bare `/` lands where they left off. Skipped on redirects, whose own
  // destination already carries the locale.
  if (!response.headers.has("location")) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    /**
     * Everything except the unlocalized API tree, Next's own assets, and any
     * path containing a dot — which covers every file in `public/` (images,
     * video, fonts) plus favicon.ico, robots.txt and sitemap.xml, all of
     * which must stay at the domain root rather than gain a locale prefix.
     *
     * No `$` anchor: the matcher is compiled by path-to-regexp, which adds
     * its own anchors and silently fails to match when one is written here.
     */
    "/((?!api/|_next/|.*\\.).*)",
  ],
};
