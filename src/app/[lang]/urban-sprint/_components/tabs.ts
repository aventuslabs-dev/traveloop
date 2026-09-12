import type { Tab } from "./TabBar";

/**
 * The bottom-navigation sets, defined once.
 *
 * Every href here stays inside its own role's shell. That matters more than it
 * looks: a tab pointing at the public leaderboard would navigate out of the
 * layout that renders the bar, and the bar would vanish under the user's
 * thumb. The public board is reachable from these screens, but as a link out —
 * never as a tab.
 */

export function gamemasterTabs(stationsRemaining?: number): Tab[] {
  return [
    { href: "/urban-sprint/gamemaster", label: "Team", icon: "shield" },
    {
      href: "/urban-sprint/gamemaster/stations",
      label: "Stations",
      icon: "pin",
      badge: stationsRemaining,
    },
    { href: "/urban-sprint/gamemaster/leaderboard", label: "Board", icon: "table" },
  ];
}

/**
 * "Shops" rather than "Stations": participants are being sent to real
 * businesses, and that is the word that makes sense on the street. Organisers
 * and gamemasters keep saying "stations", which is the game's own term.
 *
 * It sits in the middle and raised, because deciding where to walk next is the
 * thing a participant opens their phone to do.
 */
export const PARTICIPANT_TABS: Tab[] = [
  { href: "/urban-sprint/team", label: "My team", icon: "shield" },
  { href: "/urban-sprint/team/shops", label: "Shops", icon: "store", prominent: true },
  { href: "/urban-sprint/team/leaderboard", label: "Board", icon: "table" },
];
