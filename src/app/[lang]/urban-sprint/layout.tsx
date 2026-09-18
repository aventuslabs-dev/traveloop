import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/seo";
import "./urban-sprint.css";

/**
 * Urban Sprint's own shell.
 *
 * The Traveloop root layout still wraps this (fonts, JSON-LD), but everything
 * visual from here down is scoped to `.us-root` and lives in urban-sprint.css,
 * which only loads on these routes. Nothing in globals.css is edited, so the
 * Traveloop site is untouched by anything the campaign does.
 */

const OG_DESCRIPTION =
  "A city-wide race through Traveloop's partner shops. Follow the leaderboard live.";

/**
 * The campaign writes its own titles in English only — it is run in person in
 * George Town and has no translated copy — so this stays a static object.
 * Canonicals and hreflang belong to the individual pages, which know their own
 * path; setting them here would tell a crawler that every route under this
 * layout is really /urban-sprint.
 */
export const metadata: Metadata = {
  title: {
    default: "Urban Sprint — a Traveloop campaign",
    template: "%s — Urban Sprint",
  },
  description:
    "Urban Sprint is a city-wide race through Traveloop's partner shops. Teams sprint " +
    "between stations, gamemasters confirm each stop, and the leaderboard moves live.",
  openGraph: {
    type: "website",
    siteName: "Urban Sprint",
    title: "Urban Sprint — a Traveloop campaign",
    description: OG_DESCRIPTION,
    images: [{ ...OG_IMAGE, alt: "Traveloop — Urban Sprint" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Urban Sprint — a Traveloop campaign",
    description: OG_DESCRIPTION,
    images: [{ ...OG_IMAGE, alt: "Traveloop — Urban Sprint" }],
  },
};

export default function UrbanSprintLayout({ children }: { children: React.ReactNode }) {
  return <div className="us-root">{children}</div>;
}
