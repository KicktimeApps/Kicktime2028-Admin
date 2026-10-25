import { create } from "zustand";
import type { LiveFixture } from "@/domain/live";
import type { ResultRecord } from "@/domain/types";

/**
 * Was jede Live-Quelle beim letzten Abruf einzeln gemeldet hat – für den
 * Spiele-Check. Die App selbst zeigt nur das zusammengeführte Ergebnis.
 */
export type SourceDetails = {
  at: number;
  /** Eingestellte ESPN-Liga, leer = Zweitquelle aus. */
  espn: string;
  primary: Record<string, ResultRecord>;
  /** null = ESPN ausgeschaltet. */
  backup: Record<string, ResultRecord> | null;
  /** Spiele der Quellen, die keinem EM-Spiel zugeordnet werden konnten. */
  unmatched: (LiveFixture & { source: "openligadb" | "espn" })[];
};

export const useSourceDetails = create<{
  details: SourceDetails | null;
  set: (d: SourceDetails) => void;
}>((set) => ({
  details: null,
  set: (details) => set({ details }),
}));
