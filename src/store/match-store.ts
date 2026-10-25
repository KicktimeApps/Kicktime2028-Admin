import { create } from "zustand";
import { resolveTournament, type TournamentState } from "@/domain/resolve";
import { resultSignature, type FixturePatch, type ResultRecord } from "@/domain/types";
import { DRAW } from "@/tournament/draw";
import { FIXTURES } from "@/tournament/schedule";

export type LiveMeta = {
  /** "cache" = zuletzt gespeicherter Stand (offline / vor dem ersten Abruf). */
  source: "backend" | "openligadb" | "cache" | null;
  lastFetchAt: number | null;
  lastError: string | null;
  unmatched: number;
  /** Zuletzt abgefragte Adresse der Live-Quelle (für den Admin-Bereich). */
  apiUrl?: string | null;
  /** Antwort des Servers: hit | miss | stale | paused. */
  cache?: string | null;
};

type Inputs = {
  now: number;
  apiResults: Record<string, ResultRecord>;
  apiPatches: Record<string, FixturePatch>;
  adminResults: Record<string, ResultRecord>;
};

type MatchStore = Inputs & {
  tournament: TournamentState;
  live: LiveMeta;
  tick: () => void;
  setApiData: (
    results: Record<string, ResultRecord>,
    patches: Record<string, FixturePatch>,
  ) => void;
  setAdminResults: (r: Record<string, ResultRecord>) => void;
  setLiveMeta: (m: Partial<LiveMeta>) => void;
};

/**
 * Die Live-Quelle (OpenLigaDB) gibt vor. Eine Admin-Korrektur überbrückt nur,
 * wenn die Quelle hängt: Sie gilt, solange die Quelle noch genau das meldet,
 * was sie beim Speichern der Korrektur gemeldet hat. Kommt danach etwas Neues
 * (z. B. das 2:0 oder das Spielende), gilt sofort wieder die Quelle.
 *
 * Korrekturen ohne gemerkten Quellstand (ältere Server-Funktion) bleiben wie
 * bei KickTime 2026 stehen, bis sie entfernt werden; meldet die Quelle das
 * Spielende, wird mit dem korrigierten Stand beendet.
 */
export function mergeResults(
  api: Record<string, ResultRecord>,
  admin: Record<string, ResultRecord>,
): Record<string, ResultRecord> {
  const out: Record<string, ResultRecord> = { ...api };
  for (const [id, a] of Object.entries(admin)) {
    const b = api[id];
    if (a.sourceSig !== undefined) {
      if (resultSignature(b) === a.sourceSig) out[id] = a;
      continue;
    }
    if (b?.status === "finished" && a.status !== "finished") {
      out[id] = {
        ...a,
        status: "finished",
        score: a.score ?? b.score,
        penalties: a.penalties ?? b.penalties,
        phase: undefined,
        minute: undefined,
      };
    } else {
      out[id] = a;
    }
  }
  return out;
}

/** Immer der echte Turnierstand – die Team-App kennt keinen Vorschau-Modus. */
function compute(i: Inputs): TournamentState {
  return resolveTournament({
    fixtures: FIXTURES,
    draw: DRAW,
    results: mergeResults(i.apiResults, i.adminResults),
    patches: i.apiPatches,
    now: i.now,
  });
}

/**
 * Paarungen für die Zuordnung der Live-Daten: immer der echte Turnierstand
 * und ohne die Teams, die die Quelle beim letzten
 * Abruf selbst gesetzt hat. Sonst gälten diese beim nächsten Abruf als
 * „schon bekannt“, würden nicht mehr gesetzt – und die Teams sprängen bei
 * jedem zweiten Abruf zurück auf Platzhalter.
 */
export function liveMatchTeams(): Map<number, { home: string | null; away: string | null }> {
  const s = useMatchStore.getState();
  const patches: Record<string, FixturePatch> = {};
  for (const [id, p] of Object.entries(s.apiPatches))
    if (p.kickoffUtc) patches[id] = { kickoffUtc: p.kickoffUtc };
  const t = resolveTournament({
    fixtures: FIXTURES,
    draw: DRAW,
    results: mergeResults(s.apiResults, s.adminResults),
    patches,
    now: s.now,
  });
  return new Map(t.matches.map((m) => [m.number, { home: m.home, away: m.away }]));
}

const initial: Inputs = {
  now: Date.now(),
  apiResults: {},
  apiPatches: {},
  adminResults: {},
};

export const useMatchStore = create<MatchStore>((set, get) => {
  // Die Uhr tickt alle 10 s. Ändert sich am Turnier dabei nichts, bleibt das
  // alte Objekt bestehen – sonst würden alle Listen und Tabellen grundlos
  // neu gezeichnet.
  let lastKey = "";
  const update = (patch: Partial<Inputs>) => {
    const next = { ...get(), ...patch };
    const tournament = compute(next);
    const key = JSON.stringify(tournament);
    if (key === lastKey) set(patch);
    else {
      lastKey = key;
      set({ ...patch, tournament });
    }
  };
  return {
    ...initial,
    tournament: compute(initial),
    live: { source: null, lastFetchAt: null, lastError: null, unmatched: 0 },
    tick: () => update({ now: Date.now() }),
    setApiData: (results, patches) =>
      update({
        // Ersetzen statt anhängen: Die Quelle liefert immer die komplette
        // Liste. So verschwinden auch verschobene oder korrigierte Einträge.
        apiResults: results,
        apiPatches: patches,
      }),
    setAdminResults: (adminResults) => update({ adminResults }),
    setLiveMeta: (m) => set({ live: { ...get().live, ...m } }),
  };
});

export function useTournament(): TournamentState {
  return useMatchStore((s) => s.tournament);
}

export function useMatch(id: string | null | undefined) {
  return useMatchStore((s) => (id ? s.tournament.matches.find((m) => m.id === id) : undefined));
}
