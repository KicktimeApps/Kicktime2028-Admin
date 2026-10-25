import type { ResultRecord } from "@/domain/types";

export const fmtKickoff = (iso: string, withDay = false) =>
  new Date(iso).toLocaleString("de-DE", {
    ...(withDay && { weekday: "short", day: "2-digit", month: "2-digit" }),
    hour: "2-digit",
    minute: "2-digit",
  });

/** Stand als Text, z. B. „2:1“, „1:1 i. E. 4:3“ oder „–“. */
export function scoreText(r?: Pick<ResultRecord, "score" | "penalties"> | null): string {
  if (!r?.score) return "–";
  const pens = r.penalties ? ` i. E. ${r.penalties.home}:${r.penalties.away}` : "";
  return `${r.score.home}:${r.score.away}${pens}`;
}

/** Melden OpenLigaDB und ESPN Unterschiedliches? (Nur wenn beide etwas haben.) */
export function sourcesDiffer(p?: ResultRecord, b?: ResultRecord): boolean {
  if (!p || !b) return false;
  return scoreText(p) !== scoreText(b) || (p.status === "finished") !== (b.status === "finished");
}
