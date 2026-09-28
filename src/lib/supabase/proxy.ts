import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { splitLocale, type Locale } from "@/i18n/config";
import { isOperatorEmail } from "@/lib/admin-auth";

/**
 * Urban Sprint pages anyone may see without signing in. The campaign leans on
 * its leaderboard being public, so the landing page that carries it is
 * deliberately open — and booking a team is how a stranger
 * becomes a participant, so it can't sit behind a login either. Listed without
 * a locale prefix — they are compared against the path after the prefix is
 * stripped. The pulse endpoint they poll lives under /api and never reaches
 * this proxy at all.
 */
const URBAN_SPRINT_PUBLIC = [
  "/urban-sprint",
  "/urban-sprint/login",
  "/urban-sprint/book",
  "/urban-sprint/book/success",
];

/**
 * A booked team's private link pages. Racers don't sign in: the signed token
 * in the path is what admits them, checked by the pages themselves
 * (lib/urban-sprint/team-link.ts).
 */
const URBAN_SPRINT_TEAM_LINK = "/urban-sprint/t/";

/**
 * Refreshes the Supabase auth cookie and gates /admin, /account and the
 * signed-in half of /urban-sprint behind a logged-in session. Runs in proxy.ts
 * (this Next.js version's renamed middleware).
 *
 * `locale` is the segment proxy.ts already parsed off the front of the path.
 * Every check below runs against the *unprefixed* path, and every redirect
 * puts the prefix back, so a signed-out visitor on /cn/account is sent to
 * /cn/account/login rather than dumped into English.
 */
export async function updateSession(request: NextRequest, locale: Locale) {
  let response = NextResponse.next({ request });

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set.");
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Customers get their own Supabase Auth accounts too, so "is signed in" is
  // not "is the admin" — the admin session must belong to ADMIN_LOGIN_EMAIL.
  const isAdmin = isOperatorEmail(user?.email);

  const { pathname } = request.nextUrl;
  const { rest: path } = splitLocale(pathname);

  /** Re-attaches the locale so a redirect keeps the visitor in their language. */
  const localized = (target: string) => `/${locale}${target}`;

  if (path.startsWith("/admin")) {
    if (!isAdmin && path !== "/admin/login") {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = localized("/admin/login");
      return NextResponse.redirect(loginUrl);
    }

    if (isAdmin && path === "/admin/login") {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = localized("/admin");
      return NextResponse.redirect(adminUrl);
    }
  }

  // Urban Sprint is a separate product with its own roles, so "signed in" is
  // all that is checked here. *Which* Urban Sprint role a page needs is
  // decided by requireRole() in the page or action that serves the data —
  // proxy is the optimistic check, not the authorisation.
  if (path.startsWith("/urban-sprint")) {
    const isPublic =
      URBAN_SPRINT_PUBLIC.includes(path) || path.startsWith(URBAN_SPRINT_TEAM_LINK);

    if (!user && !isPublic) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = localized("/urban-sprint/login");
      // So a deep link survives the detour through the login form.
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (path.startsWith("/account")) {
    if (!user && path !== "/account/login") {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = localized("/account/login");
      return NextResponse.redirect(loginUrl);
    }

    if (user && path === "/account/login") {
      const accountUrl = request.nextUrl.clone();
      accountUrl.pathname = localized("/account");
      return NextResponse.redirect(accountUrl);
    }
  }

  return response;
}
