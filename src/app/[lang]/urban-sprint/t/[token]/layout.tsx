import type { Metadata } from "next";
import { loadTeamLink } from "./load";

export const metadata: Metadata = {
  title: "Your team",
  robots: { index: false, follow: false },
  // The URL is the key to the page; don't hand it to sites this page links to.
  referrer: "no-referrer",
};

/**
 * A booked team's own pages, opened from its private link — no sign-in. See
 * lib/urban-sprint/team-link.ts for what makes the link private.
 */
export default async function TeamLinkLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  await loadTeamLink((await params).token);
  return <div className="us-app">{children}</div>;
}
