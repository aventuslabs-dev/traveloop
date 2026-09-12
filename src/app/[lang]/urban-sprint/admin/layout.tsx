import type { Metadata } from "next";
import { requireRole } from "@/lib/urban-sprint/auth";
import { getCampaignStats } from "@/lib/urban-sprint/stats-db";
import { countUsersByRole } from "@/lib/urban-sprint/users-db";
import { logout } from "../login/actions";
import AdminShell, { type AdminNavItem } from "./AdminShell";

export const metadata: Metadata = {
  title: "Control",
  robots: { index: false, follow: false },
};

/**
 * Counts in the rail so an organiser can see the shape of the campaign without
 * opening each section. They're head-only queries, and a failure degrades to
 * an unbadged rail rather than an error page — the sections themselves surface
 * real problems.
 */
async function loadCounts() {
  try {
    const [stats, roles] = await Promise.all([getCampaignStats(), countUsersByRole()]);
    return {
      teams: stats.teams,
      stations: stats.stations,
      people: roles.admin + roles.gamemaster + roles.participant,
    };
  } catch {
    return { teams: 0, stations: 0, people: 0 };
  }
}

export default async function UrbanSprintAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("admin");
  const counts = await loadCounts();

  const nav: AdminNavItem[] = [
    { href: "/urban-sprint/admin", label: "Overview", icon: "grid" },
    { href: "/urban-sprint/admin/leaderboard", label: "Leaderboard", icon: "table" },
    { href: "/urban-sprint/admin/activity", label: "Activity", icon: "clock" },
    { href: "/urban-sprint/admin/teams", label: "Teams", icon: "shield", count: counts.teams },
    { href: "/urban-sprint/admin/users", label: "Users", icon: "users", count: counts.people },
    { href: "/urban-sprint/admin/stations", label: "Stations", icon: "pin", count: counts.stations },
    { href: "/urban-sprint/admin/categories", label: "Categories", icon: "tag" },
    { href: "/urban-sprint/admin/boosters", label: "Boosters", icon: "bolt" },
  ];

  return (
    <AdminShell
      nav={nav}
      operator={session.displayName || session.email}
      signOut={
        <form action={logout}>
          <button className="us-admin-signout" type="submit">
            Sign out
          </button>
        </form>
      }
    >
      {children}
    </AdminShell>
  );
}
