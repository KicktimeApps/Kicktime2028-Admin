import { RefreshCw, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Segmented } from "@/components/common/Segmented";
import { localParts } from "@/domain/time";
import type { MatchView, ResultRecord } from "@/domain/types";
import { cn } from "@/lib/utils";
import { refreshLiveData } from "@/services/live-data";
import { useSourceDetails } from "@/services/source-details";
import { useMatchStore } from "@/store/match-store";
import { STAGE_LABEL } from "@/tournament/config";
import { Card } from "./shared";
import { fmtKickoff, scoreText, sourcesDiffer } from "./match-format";
import { MatchLine } from "./MatchLine";
import { fmtTime, useAction } from "./use-action";

type Filter = "today" | "live" | "diff" | "all";

const STATUS: Record<ResultRecord["status"], string> = {
  scheduled: "geplant",
  live: "live",
  finished: "beendet",
};

const day = (t: string | number) => localParts(t, "Europe/Berlin").dayKey;

/**
 * Spiele-Check: alle 51 Spiele mit dem, was jede Quelle meldet – OpenLigaDB,
 * ESPN und eine Korrektur. So sieht man sofort, wo Quellen auseinanderlaufen,
 * welche Teams schon feststehen und welche Anstoßzeiten bestätigt sind.
 */
export function MatchCheckSection() {
  const matches = useMatchStore((s) => s.tournament.matches);
  const now = useMatchStore((s) => s.now);
  const admin = useMatchStore((s) => s.adminResults);
  const details = useSourceDetails((s) => s.details);
  const { busy, run } = useAction();
  const today = day(now);
  const hasToday = matches.some((m) => day(m.kickoffUtc) === today);
  const [filter, setFilter] = useState<Filter>(hasToday ? "today" : "all");

  const differs = (m: MatchView) =>
    sourcesDiffer(details?.primary[m.id], details?.backup?.[m.id] ?? undefined);
  // 51 Spiele – ohne Zwischenspeichern schnell genug.
  const lists = {
    today: matches.filter((m) => day(m.kickoffUtc) === today),
    live: matches.filter((m) => m.status === "live"),
    diff: matches.filter((m) => differs(m) || !!admin[m.id]),
    all: matches,
  };
  const list = lists[filter];

  // Nach Tagen gruppieren.
  const days = useMemo(() => {
    const out: { key: string; label: string; items: MatchView[] }[] = [];
    for (const m of list) {
      const key = day(m.kickoffUtc);
      let g = out.find((x) => x.key === key);
      if (!g) {
        g = {
          key,
          label: new Date(m.kickoffUtc).toLocaleDateString("de-DE", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          }),
          items: [],
        };
        out.push(g);
      }
      g.items.push(m);
    }
    return out;
  }, [list]);

  const confirmed = matches.filter((m) => m.kickoffConfirmed).length;
  const known = matches.filter((m) => m.home && m.away).length;

  return (
    <div className="space-y-3 text-[13.5px]">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Paarungen" value={`${known}/51`} />
        <Stat label="Anstoß fest" value={`${confirmed}/51`} />
        <Stat
          label="Stand"
          value={details ? fmtTime(details.at) : "–"}
          hint={details && !details.espn ? "ESPN aus" : undefined}
        />
      </div>

      <div className="flex gap-2">
        <Segmented<Filter>
          size="sm"
          className="min-w-0 flex-1"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "today", label: "Heute", count: lists.today.length },
            { value: "live", label: "Live", count: lists.live.length },
            { value: "diff", label: "Auffällig", count: lists.diff.length },
            { value: "all", label: "Alle" },
          ]}
        />
        <button
          type="button"
          onClick={() =>
            run("reload", async () => {
              await refreshLiveData({ force: true });
              return { ok: true as const, data: null };
            })
          }
          aria-label="Neu laden"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground"
        >
          <RefreshCw className={cn("h-4 w-4", busy === "reload" && "animate-spin")} />
        </button>
      </div>

      {list.length === 0 && (
        <p className="rounded-xl bg-subtle p-3 text-muted-foreground">
          {filter === "today"
            ? "Heute ist kein Spiel."
            : filter === "live"
              ? "Gerade läuft kein Spiel."
              : filter === "diff"
                ? "Nichts Auffälliges: Die Quellen stimmen überein, keine Korrektur aktiv."
                : "Keine Spiele."}
        </p>
      )}

      {days.map((d) => (
        <section key={d.key} className="space-y-2">
          <h2 className="px-1 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
            {d.label}
          </h2>
          <ul className="space-y-2">
            {d.items.map((m) => (
              <li key={m.id} className="rounded-2xl border border-border bg-card p-3">
                <MatchLine m={m} />
                <Sources
                  m={m}
                  primary={details?.primary[m.id]}
                  backup={
                    details
                      ? details.backup
                        ? (details.backup[m.id] ?? null)
                        : undefined
                      : undefined
                  }
                  override={admin[m.id]}
                  differs={differs(m)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Unmatched />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-subtle px-3 py-2">
      <div className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="truncate font-semibold tabular">{value}</div>
      {hint && <div className="truncate text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Was jede Quelle zu diesem Spiel meldet. backup: undefined = unbekannt, null = nichts. */
function Sources({
  m,
  primary,
  backup,
  override,
  differs,
}: {
  m: MatchView;
  primary?: ResultRecord;
  backup?: ResultRecord | null;
  override?: ResultRecord;
  differs: boolean;
}) {
  const line = (r?: ResultRecord | null) => (r ? `${scoreText(r)} · ${STATUS[r.status]}` : "–");
  return (
    <div className="mt-2.5 space-y-1.5 border-t border-border pt-2.5 text-[12px]">
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <span className="text-muted-foreground">OpenLigaDB</span>
        <span className="tabular">{line(primary)}</span>
        {backup !== undefined && (
          <>
            <span className="text-muted-foreground">ESPN</span>
            <span className="tabular">{line(backup)}</span>
          </>
        )}
        {override && (
          <>
            <span className="text-primary">Korrektur</span>
            <span className="tabular">{line(override)}</span>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
        <span>
          #{m.number} · {m.group ? `Gruppe ${m.group}` : STAGE_LABEL[m.stage]}
        </span>
        <span>{m.venue.city}</span>
        <span className={cn(!m.kickoffConfirmed && "text-gold")}>
          {m.kickoffConfirmed
            ? "Anstoß bestätigt"
            : `Anstoß vorläufig (${fmtKickoff(m.kickoffUtc)})`}
        </span>
      </div>
      {differs && (
        <p className="flex items-center gap-1.5 font-semibold text-gold">
          <TriangleAlert className="h-3.5 w-3.5" /> Quellen melden Unterschiedliches
        </p>
      )}
    </div>
  );
}

/** Spiele der Quellen, die die App keinem EM-Spiel zuordnen konnte. */
function Unmatched() {
  const details = useSourceDetails((s) => s.details);
  if (!details || details.unmatched.length === 0) return null;
  return (
    <Card
      title={`Nicht zugeordnet (${details.unmatched.length})`}
      text="Diese Spiele liefert eine Quelle, die App findet aber kein passendes EM-Spiel (anderer Tag, unbekanntes Stadion, Teamnamen falsch). Bei einer Test-Liga normal."
    >
      <ul className="space-y-1.5">
        {details.unmatched.slice(0, 40).map((f) => (
          <li
            key={`${f.source}-${f.externalId}`}
            className="rounded-lg bg-subtle px-2.5 py-2 text-[12.5px]"
          >
            <div className="font-semibold">
              {f.homeName ?? "?"} – {f.awayName ?? "?"}
            </div>
            <div className="text-muted-foreground">
              {f.source === "espn" ? "ESPN" : "OpenLigaDB"} ·{" "}
              {f.kickoffUtc ? fmtTime(f.kickoffUtc) : "ohne Zeit"}
              {(f.city || f.stadium) && ` · ${[f.city, f.stadium].filter(Boolean).join(", ")}`}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
