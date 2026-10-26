import { Link } from "@tanstack/react-router";
import { ArrowLeft, Crown, RefreshCw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Flag } from "@/components/team/Flag";
import { teamDisplay } from "@/domain/labels";
import { buildBoard } from "@/domain/predictions";
import { tournamentWinner } from "@/domain/status";
import { cn } from "@/lib/utils";
import { fetchGroupBoard, type GroupBoard } from "@/services/admin";
import { useTournament } from "@/store/match-store";
import { useCachedState, useLoadOnce } from "@/lib/page-cache";
import { Info } from "./shared";
import { useAction } from "./use-action";

/**
 * Tabelle einer Tipprunde – genauso gerechnet wie in der KickTime-App
 * (buildBoard, laufende Spiele zählen vorläufig mit), mit den Tipps, die auch
 * die Mitglieder sehen: erst ab Anpfiff.
 */
export function GroupBoardSection({ pin, groupId }: { pin: string; groupId: string }) {
  const tournament = useTournament();
  const { busy, run } = useAction();
  const [board, setBoard] = useCachedState<GroupBoard | null>(`board:${groupId}`, null);
  const [error, setError] = useCachedState<string | null>(`board:${groupId}.error`, null);
  const load = useCallback(async () => {
    const res = await run("load", async () => {
      const r = await fetchGroupBoard(pin, groupId);
      if (!r.ok) setError(r.error);
      return r;
    });
    if (res) {
      setBoard(res.data);
      setError(null);
    }
  }, [pin, groupId, run, setBoard, setError]);
  useLoadOnce(`board:${groupId}`, load);

  const winner = tournamentWinner(tournament);
  const rows = useMemo(
    () =>
      board ? buildBoard(board.members, tournament.matches, { live: true, champion: winner }) : [],
    [board, tournament.matches, winner],
  );
  const rated = tournament.matches.filter((m) => m.score && m.status !== "scheduled").length;
  const owner = board?.members.find((m) => m.isOwner);

  return (
    <div className="space-y-3 text-[13.5px]">
      <div className="flex items-center gap-2">
        <Link
          to="/tipprunden"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Alle Runden
        </Link>
        <button
          type="button"
          onClick={load}
          aria-label="Aktualisieren"
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground"
        >
          <RefreshCw className={cn("h-4 w-4", busy === "load" && "animate-spin")} />
        </button>
      </div>

      {error && !board && (
        <p className="rounded-xl bg-destructive/10 p-3 text-destructive">{error}</p>
      )}

      {board && (
        <>
          <div>
            <h2 className="text-[20px] font-semibold leading-tight">{board.group.name}</h2>
            <p className="text-muted-foreground">
              Code <span className="font-mono">{board.group.code}</span>
              {owner && ` · Ersteller ${owner.name}`}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Info label="Mitglieder" value={String(board.members.length)} />
            <Info label="Gewertet" value={`${rated} ${rated === 1 ? "Spiel" : "Spiele"}`} />
            <Info label="Spitze" value={rows[0] ? `${rows[0].points} P.` : "–"} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-left">
              <thead className="border-b border-border text-[11.5px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="w-10 py-2 pl-3 font-medium">#</th>
                  <th className="py-2 font-medium">Name</th>
                  <th className="px-2 py-2 text-right font-medium" title="Volltreffer">
                    VT
                  </th>
                  <th className="px-2 py-2 text-right font-medium" title="Richtige Tendenz">
                    Tend.
                  </th>
                  <th className="py-2 pr-3 text-right font-medium">Punkte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-3 text-muted-foreground">
                      Noch keine Mitglieder.
                    </td>
                  </tr>
                )}
                {rows.map((r) => {
                  const mem = board.members.find((m) => m.id === r.id);
                  const champ = mem?.champion ? teamDisplay(mem.champion, mem.champion) : null;
                  return (
                    <tr key={r.id}>
                      <td className="py-2.5 pl-3 font-semibold tabular text-muted-foreground">
                        {r.rank}.
                      </td>
                      <td className="py-2.5">
                        <span className="flex min-w-0 items-center gap-1.5">
                          {mem?.isOwner && (
                            <Crown
                              className="h-3.5 w-3.5 shrink-0 text-gold"
                              aria-label="Ersteller"
                            />
                          )}
                          <span className="truncate font-medium">{r.name}</span>
                          {champ && <Flag flag={champ.flag} size="xs" />}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular">{r.exact}</td>
                      <td className="px-2 py-2.5 text-right tabular">{r.hits}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold tabular">
                        {r.points}
                        {r.livePoints > 0 && (
                          <span className="ml-1 text-[11px] font-semibold text-live">
                            +{r.livePoints} live
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-muted-foreground">
            Gerechnet wie in der App: 4 Punkte Volltreffer, 3 Tordifferenz, 2 Tendenz, Halbfinale
            und Finale doppelt, 10 für den Europameister. Laufende Spiele zählen vorläufig mit.
          </p>
        </>
      )}
    </div>
  );
}
