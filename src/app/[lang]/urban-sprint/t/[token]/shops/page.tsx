import { getSettings } from "@/lib/urban-sprint/settings-db";
import { listStations, listStationsForTeam } from "@/lib/urban-sprint/stations-db";
import { scoreStation } from "@/lib/urban-sprint/scoring";
import { points } from "@/lib/urban-sprint/format";
import type { StationForTeam } from "@/lib/urban-sprint/types";
import AppBar from "../../../_components/AppBar";
import LiveRefresh from "../../../_components/LiveRefresh";
import TabBar from "../../../_components/TabBar";
import { teamLinkTabs } from "../../../_components/tabs";
import { loadTeamLink } from "../load";
import ShopBoard from "./ShopBoard";

/**
 * Where the team can go. Same data and same pricing as the gamemaster's
 * station list — built by the same listStationsForTeam(), so the points racers
 * read are the points their gamemaster will award. Nothing here can score.
 */
export default async function TeamLinkShopsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [{ base, booking, team, color }, settings] = await Promise.all([
    loadTeamLink((await params).token),
    getSettings(),
  ]);

  // A team taken out of the game can still browse: with no booster and
  // nothing completed every shop prices at base, through the same
  // scoreStation() so the two paths can't drift.
  const stations: StationForTeam[] = team
    ? await listStationsForTeam(team.id, team.booster)
    : (await listStations({ activeOnly: true })).map((station) => ({
        ...station,
        completed: false,
        completedAt: null,
        projected: scoreStation(station, null),
      }));

  const remaining = stations.filter((station) => !station.completed).length;

  return (
    <>
      <LiveRefresh revision={settings.revision} intervalMs={5000} />

      <AppBar
        title="Shops"
        subtitle={
          team
            ? `${booking.teamName} · ${points(team.points)} pts · ${remaining} to go`
            : booking.teamName
        }
        accent={team?.color}
        signOut={false}
      />

      <div className="us-page has-tabs">
        <ShopBoard
          stations={stations}
          teamColor={color}
          boosterName={team?.booster?.name ?? null}
          boosterCategory={team?.booster?.categoryName ?? null}
          bonusPercent={team?.booster?.bonusPercent ?? null}
        />
      </div>

      <TabBar tabs={teamLinkTabs(base)} />
    </>
  );
}
