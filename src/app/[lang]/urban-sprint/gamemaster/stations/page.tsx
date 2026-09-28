import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/urban-sprint/auth";
import { listCategories } from "@/lib/urban-sprint/categories-db";
import { racePhase } from "@/lib/urban-sprint/race-clock";
import { getStanding } from "@/lib/urban-sprint/results-db";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { listStationsForTeam } from "@/lib/urban-sprint/stations-db";
import { bookingReferenceForTeam, getTeamForGamemaster } from "@/lib/urban-sprint/teams-db";
import { ordinal, points } from "@/lib/urban-sprint/format";
import AppBar from "../../_components/AppBar";
import LiveRefresh from "../../_components/LiveRefresh";
import TabBar from "../../_components/TabBar";
import { Flash } from "../../_components/ui";
import StationBoard from "./StationBoard";
import { gamemasterTabs } from "../../_components/tabs";

export default async function GamemasterStationsPage() {
  const session = await requireRole("gamemaster");
  const team = await getTeamForGamemaster(session.userId);

  // The opening sequence lives on /gamemaster. Arriving here without a team or
  // a booster means the sequence isn't finished, so it sends them back to
  // whichever step is next rather than showing an unscoreable list.
  if (!team || !team.booster) redirect("/urban-sprint/gamemaster");

  const [stations, categories, settings, standing] = await Promise.all([
    listStationsForTeam(team.id, team.booster),
    listCategories(),
    getSettings(),
    getStanding(bookingReferenceForTeam(team) ?? ""),
  ]);

  const remaining = stations.filter((station) => !station.completed).length;
  const phase = racePhase(team);

  return (
    <>
      <LiveRefresh revision={settings.revision} intervalMs={4000} />

      <AppBar
        title="Stations"
        subtitle={`${team.name} · ${points(team.points)} pts · ${
          standing.row ? ordinal(standing.row.rank) : "not on the board yet"
        }`}
        accent={team.color}
      />

      <div className="us-page has-tabs">
        {phase !== "racing" && (
          <Flash tone={phase === "ready" ? "info" : "err"}>
            {phase === "ready" ? (
              <>
                Start the race on the <Link href="/urban-sprint/gamemaster">Team</Link> tab to
                confirm stations. You can look around until then.
              </>
            ) : (
              "The race is over, so stations can't be confirmed any more."
            )}
          </Flash>
        )}
        <StationBoard
          stations={stations}
          categories={categories}
          teamColor={team.color}
          boosterName={team.booster.name}
          boosterCategory={team.booster.categoryName}
          bonusPercent={team.booster.bonusPercent}
          locked={phase === "ready" ? "Start the race first" : phase === "finished" ? "Race over" : null}
        />
      </div>

      <TabBar tabs={gamemasterTabs(remaining)} />
    </>
  );
}
