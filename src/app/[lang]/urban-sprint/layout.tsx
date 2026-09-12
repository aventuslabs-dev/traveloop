import type { Metadata } from "next";
import "./urban-sprint.css";

/**
 * Urban Sprint's own shell.
 *
 * The Traveloop root layout still wraps this (fonts, JSON-LD), but everything
 * visual from here down is scoped to `.us-root` and lives in urban-sprint.css,
 * which only loads on these routes. Nothing in globals.css is edited, so the
 * Traveloop site is untouched by anything the campaign does.
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
    description: "A city-wide race through Traveloop's partner shops. Follow the leaderboard live.",
  },
};

export default function UrbanSprintLayout({ children }: { children: React.ReactNode }) {
  return <div className="us-root">{children}</div>;
}
