import { Flag } from "@/components/team/Flag";
import { teamDisplay } from "@/domain/labels";
import type { MatchView } from "@/domain/types";
import { cn } from "@/lib/utils";
import { fmtKickoff } from "./match-format";

const PHASE: Record<string, string> = {
  first: "1. HZ",
  half: "Pause",
  second: "2. HZ",
  extra: "Verl.",
  penalties: "Elfm.",
};

/** Ein Spiel in einer Zeile: Uhrzeit, Paarung, Stand, Status. */
export function MatchLine({
  m,
  withDay,
  className,
}: {
  m: MatchView;
  withDay?: boolean;
  className?: string;
}) {
  const a = teamDisplay(m.home, m.slotHome);
  const b = teamDisplay(m.away, m.slotAway);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="w-12 shrink-0 text-[12px] leading-tight text-muted-foreground tabular">
        {withDay ? (
          <>
            <span className="block">
              {new Date(m.kickoffUtc).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
              })}
            </span>
            {fmtKickoff(m.kickoffUtc)}
          </>
        ) : (
          fmtKickoff(m.kickoffUtc)
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5 text-[13.5px]">
        <div className="flex items-center gap-1.5">
          <Flag flag={a.flag} size="xs" />
          <span className={cn("truncate", a.placeholder && "text-muted-foreground")}>{a.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Flag flag={b.flag} size="xs" />
          <span className={cn("truncate", b.placeholder && "text-muted-foreground")}>{b.name}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-display text-[20px] font-bold leading-none tabular">
          {m.score ? `${m.score.home}:${m.score.away}` : "–"}
        </div>
        <div
          className={cn(
            "mt-1 text-[11px] font-semibold",
            m.status === "live" ? "text-live" : "text-muted-foreground",
          )}
        >
          {m.status === "live"
            ? `● ${m.phase ? PHASE[m.phase] : "live"}${m.minute && m.phase !== "half" ? ` ${m.minute}'` : ""}`
            : m.status === "finished"
              ? m.penalties
                ? `i. E. ${m.penalties.home}:${m.penalties.away}`
                : "Ende"
              : `#${m.number}`}
        </div>
      </div>
    </div>
  );
}
