import { requireRole } from "@/lib/urban-sprint/auth";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { listStations, listStationsForTeam } from "@/lib/urban-sprint/stations-db";
import { getTeamForParticipant } from "@/lib/urban-sprint/teams-db";
import { scoreStation } from "@/lib/urban-sprint/scoring";
import { points } from "@/lib/urban-sprint/format";
import type { StationForTeam } from "@/lib/urban-sprint/types";
import AppBar from "../../_components/AppBar";
import LiveRefresh from "../../_components/LiveRefresh";
import TabBar from "../../_components/TabBar";
import { PARTICIPANT_TABS } from "../../_components/tabs";
import ShopBoard from "./ShopBoard";

/**
 * Where the team can go, from the participant's side.
 *
 * Same data and same pricing as the gamemaster's station list — it is built by
 * the same listStationsForTeam(), so the points a participant reads are the
 * points their gamemaster will award. Nothing here can score.
 */
export default async function ParticipantShopsPage() {
  const session = await requireRole("participant");
  const [team, settings] = await Promise.all([
    getTeamForParticipant(session.userId),
    getSettings(),
  ]);

  // A participant waiting to be assigned still gets to browse. Without a team
  // there is no booster and nothing completed, so every shop prices at base —
  // computed through the same scoreStation() so the two paths can't drift.
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
            ? `${team.name} · ${points(team.points)} pts · ${remaining} to go`
            : "Browsing — you're not on a team yet"
        }
        accent={team?.color}
      />

      <div className="us-page has-tabs">
        <ShopBoard
          stations={stations}
          teamColor={team?.color ?? "#ff4d1c"}
          boosterName={team?.booster?.name ?? null}
          boosterCategory={team?.booster?.categoryName ?? null}
          bonusPercent={team?.booster?.bonusPercent ?? null}
        />
      </div>

      <TabBar tabs={PARTICIPANT_TABS} />
    </>
  );
}
