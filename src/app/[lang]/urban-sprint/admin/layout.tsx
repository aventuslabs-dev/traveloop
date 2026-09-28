import type { Metadata } from "next";
import { requireRole } from "@/lib/urban-sprint/auth";
import { malaysiaToday } from "@/lib/urban-sprint/booking-config";
import { getBookingStats } from "@/lib/urban-sprint/bookings-db";
import { getCampaignStats } from "@/lib/urban-sprint/stats-db";
import { countUsersByRole } from "@/lib/urban-sprint/users-db";
import { logout } from "../login/actions";
import AdminShell, { type AdminNavGroup } from "./AdminShell";
import "./console.css";

export const metadata: Metadata = {
  title: "Console",
  robots: { index: false, follow: false },
};

/**
 * Counts in the rail, so an organiser can see where work is waiting without
 * opening each section. A badge counts exactly what its page lists first:
 * upcoming paid teams on Bookings, raced-but-unscored teams on Results. A
 * failed count degrades to an unbadged rail; the pages surface real errors.
 */
async function loadCounts() {
  const [bookings, campaign, roles] = await Promise.all([
    getBookingStats(malaysiaToday()).catch(() => null),
    getCampaignStats().catch(() => null),
    countUsersByRole().catch(() => null),
  ]);

  return {
    upcomingTeams: bookings?.upcomingTeams ?? 0,
    awaitingResults: bookings?.awaitingResults ?? 0,
    attention: (bookings?.emailIssues ?? 0) + (bookings?.settling ?? 0),
    teams: campaign?.teams ?? 0,
    stations: campaign?.stations ?? 0,
    people: roles ? roles.admin + roles.gamemaster : 0,
  };
}

export default async function UrbanSprintAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("admin");
  const counts = await loadCounts();

  const groups: AdminNavGroup[] = [
    {
      label: "Race bookings",
      items: [
        {
          href: "/urban-sprint/admin",
          label: "Overview",
          icon: "grid",
          count: counts.attention,
          alert: true,
        },
        { href: "/urban-sprint/admin/bookings", label: "Bookings", icon: "calendar", count: counts.upcomingTeams },
        {
          href: "/urban-sprint/admin/results",
          label: "Results",
          icon: "flag",
          count: counts.awaitingResults,
          alert: true,
        },
      ],
    },
    {
      label: "Live station game",
      items: [
        { href: "/urban-sprint/admin/leaderboard", label: "Leaderboard", icon: "table" },
        { href: "/urban-sprint/admin/activity", label: "Activity", icon: "clock" },
        { href: "/urban-sprint/admin/teams", label: "Teams", icon: "shield", count: counts.teams },
        { href: "/urban-sprint/admin/stations", label: "Stations", icon: "pin", count: counts.stations },
        { href: "/urban-sprint/admin/categories", label: "Categories", icon: "tag" },
        { href: "/urban-sprint/admin/boosters", label: "Boosters", icon: "bolt" },
      ],
    },
    {
      label: "Setup",
      items: [
        { href: "/urban-sprint/admin/users", label: "Users", icon: "users", count: counts.people },
        { href: "/urban-sprint/admin/settings", label: "Settings", icon: "settings" },
      ],
    },
  ];

  return (
    <AdminShell
      groups={groups}
      operator={session.displayName || session.email}
      canSwitch={session.isOperator}
      signOut={
        <form action={logout}>
          <button className="admin-rail-signout" type="submit">
            Sign out
          </button>
        </form>
      }
    >
      {children}
    </AdminShell>
  );
}
