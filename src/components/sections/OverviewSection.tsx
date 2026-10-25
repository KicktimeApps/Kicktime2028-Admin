import { Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  BellRing,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CirclePause,
  Inbox,
  Megaphone,
  MessageSquareText,
  Pencil,
  RefreshCw,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { localParts } from "@/domain/time";
import type { MatchView, ResultRecord } from "@/domain/types";
import { useBadges } from "@/hooks/useBadges";
import { getErrors, subscribeErrors } from "@/lib/error-log";
import { cn } from "@/lib/utils";
import {
  fetchAlerts,
  fetchConfig,
  fetchFeedback,
  fetchGroups,
  fetchStats,
  fetchTeamLog,
  type AdminConfig,
  type AdminGroup,
  type FeedbackRow,
  type Stats,
  type StatsExt,
  type TeamLogRow,
  type WatchAlert,
} from "@/services/admin";
import { refreshLiveData } from "@/services/live-data";
import { useSourceDetails } from "@/services/source-details";
import { useMatchStore } from "@/store/match-store";
import { STAGE_LABEL } from "@/tournament/config";
import { scoreText, sourcesDiffer } from "./match-format";
import { logIcon } from "./log-format";
import { MatchLine } from "./MatchLine";
import { Page } from "@/components/shell/TeamShell";
import { fmtTime } from "./use-action";

const day = (t: string | number) => localParts(t, "Europe/Berlin").dayKey;
const fmtNum = (n: number) => n.toLocaleString("de-DE");

type Data = {
  stats: Stats | null;
  config: AdminConfig | null;
  groups: AdminGroup[] | null;
  /** null = SQL-Update „Wächter“ fehlt, undefined = noch nicht geladen. */
  alerts: WatchAlert[] | null | undefined;
  feedback: FeedbackRow[] | null;
  /** null = SQL-Update „Team-App“ fehlt. */
  log: TeamLogRow[] | null | undefined;
  at: number | null;
};

/** Alles für das Dashboard laden – beim Öffnen und jede Minute, solange es sichtbar ist. */
function useDashboardData(pin: string) {
  const [data, setData] = useState<Data>({
    stats: null,
    config: null,
    groups: null,
    alerts: undefined,
    feedback: null,
    log: undefined,
    at: null,
  });
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const [stats, config, groups, alerts, feedback, log] = await Promise.all([
      fetchStats(pin),
      fetchConfig(pin),
      fetchGroups(pin),
      fetchAlerts(pin),
      fetchFeedback(pin),
      fetchTeamLog(pin),
    ]);
    setLoading(false);
    setData((d) => ({
      stats: stats.ok ? stats.data : d.stats,
      config: config.ok ? config.data : d.config,
      groups: groups.ok ? (groups.data.data ?? []) : d.groups,
      alerts: alerts.ok ? alerts.data.alerts : d.alerts,
      feedback: feedback.ok ? feedback.data.rows : d.feedback,
      log: log.ok ? log.data.rows : d.log,
      at: Date.now(),
    }));
  }, [pin]);
  useEffect(() => {
    void load();
    const id = window.setInterval(() => document.visibilityState === "visible" && load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);
  return { data, loading, reload: load };
}

/**
 * Dashboard: oben der Gesamtzustand, darunter die wichtigsten Zahlen, der
 * Spieltag mit Quellen-Abgleich, der Nutzerverlauf und was zu tun ist.
 */
export function OverviewSection({ pin }: { pin: string }) {
  const { data, loading, reload } = useDashboardData(pin);
  const ext = data.stats?.ext ?? null;
  return (
    <Page
      title="Übersicht"
      wide
      action={
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span className="hidden sm:inline">
            {data.at ? `Stand ${fmtTime(data.at)} · frischt sich jede Minute auf` : "Lädt …"}
          </span>
          <button
            type="button"
            onClick={() => {
              void reload();
              void refreshLiveData({ force: true });
              void useBadges.getState().refresh();
            }}
            aria-label="Jetzt aktualisieren"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:text-foreground"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-[13.5px]">
        <HealthBar data={data} />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            label="Gerade online"
            value={ext ? fmtNum(ext.online) : data.stats ? fmtNum(data.stats.online) : "–"}
            hint="letzte 10 Minuten"
          />
          <ActiveToday ext={ext} fallback={data.stats?.day} />
          <Kpi
            label="Tipprunden"
            value={data.groups ? fmtNum(data.groups.length) : "–"}
            hint={
              data.groups
                ? `${fmtNum(data.groups.reduce((n, g) => n + Number(g.members), 0))} Mitglieder · ${fmtNum(
                    data.groups.reduce((n, g) => n + Number(g.tips), 0),
                  )} Tipps`
                : undefined
            }
            to="/tipprunden"
          />
          <Kpi
            label="Mitteilungs-Abos"
            value={data.stats?.push ? fmtNum(data.stats.push.subscriptions) : "–"}
            hint={
              data.stats?.push ? `${fmtNum(data.stats.push.sent24h)} gesendet in 24 h` : undefined
            }
            to="/mitteilungen"
          />
        </div>

        {/* Handy: eine Spalte, „Zu erledigen“ gleich nach den Zahlen. Computer: zwei Spalten. */}
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:items-start">
          <div className="contents lg:col-span-2 lg:block lg:space-y-4">
            <MatchdayPanel className="order-2" />
            <UsagePanel ext={ext} className="order-3" />
          </div>
          <div className="contents lg:block lg:space-y-4">
            <TodoPanel data={data} className="order-1" />
            <LogPanel rows={data.log} className="order-4" />
            <FeedbackPanel rows={data.feedback} className="order-4" />
            <AnnouncementPanel config={data.config} className="order-5" />
          </div>
        </div>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Gesamtzustand                                                       */
/* ------------------------------------------------------------------ */

type Tone = "good" | "warn" | "bad" | "off";

const TONE: Record<Tone, { icon: LucideIcon; text: string; bg: string }> = {
  good: { icon: CircleCheck, text: "text-primary", bg: "bg-primary/10 border-primary/30" },
  warn: { icon: TriangleAlert, text: "text-gold", bg: "bg-gold/10 border-gold/40" },
  bad: {
    icon: CircleAlert,
    text: "text-destructive",
    bg: "bg-destructive/10 border-destructive/40",
  },
  off: { icon: CircleDashed, text: "text-muted-foreground", bg: "bg-subtle border-border" },
};

function HealthBar({ data }: { data: Data }) {
  const live = useMatchStore((s) => s.live);
  const details = useSourceDetails((s) => s.details);
  const problems = (data.alerts ?? []).filter((a) => a.active);
  const paused = data.config?.liveSource?.paused === true;
  const liveOk = !live.lastError && live.cache !== "stale";
  const espnLeague = details?.espn ?? data.config?.liveSource?.backup ?? "uefa.euro";

  const checks: { label: string; value: string; tone: Tone; icon?: LucideIcon }[] = [
    {
      label: "Wächter",
      value:
        data.alerts === undefined
          ? "–"
          : data.alerts === null
            ? "nicht eingerichtet"
            : problems.length > 0
              ? `${problems.length} Problem${problems.length === 1 ? "" : "e"}`
              : "alles ok",
      tone: data.alerts === null ? "warn" : problems.length > 0 ? "bad" : "good",
    },
    {
      label: "OpenLigaDB",
      value: paused ? "angehalten" : !live.lastFetchAt ? "–" : liveOk ? "liefert" : "Störung",
      tone: paused ? "warn" : !live.lastFetchAt ? "off" : liveOk ? "good" : "bad",
      icon: paused ? CirclePause : undefined,
    },
    {
      label: "ESPN",
      value: espnLeague ? "an" : "aus",
      tone: espnLeague ? "good" : "off",
    },
    {
      label: "Letzter Abruf",
      value: live.lastFetchAt
        ? new Date(live.lastFetchAt).toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "–",
      tone: live.lastFetchAt && Date.now() - live.lastFetchAt < 10 * 60_000 ? "good" : "warn",
    },
  ];
  const overall: Tone = checks.some((c) => c.tone === "bad")
    ? "bad"
    : checks.some((c) => c.tone === "warn")
      ? "warn"
      : "good";
  const Icon = TONE[overall].icon;
  const headline =
    overall === "good"
      ? "Alles läuft"
      : (problems[0]?.message ??
        (live.lastError
          ? `Live-Daten: ${live.lastError}`
          : paused
            ? "Live-Abruf ist angehalten"
            : "Bitte prüfen"));

  return (
    <Link
      to="/live"
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-4 transition-colors hover:border-primary/50 sm:flex-row sm:items-center",
        TONE[overall].bg,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Icon className={cn("h-7 w-7 shrink-0", TONE[overall].text)} aria-hidden />
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Systemstatus
          </div>
          <div className="line-clamp-2 text-[16px] font-semibold leading-snug">{headline}</div>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-1.5 sm:flex sm:shrink-0 sm:gap-5">
        {checks.map((c) => {
          const CIcon = c.icon ?? TONE[c.tone].icon;
          return (
            <div key={c.label} className="min-w-0">
              <dt className="text-[11px] text-muted-foreground">{c.label}</dt>
              <dd className="flex items-center gap-1.5 font-semibold">
                <CIcon className={cn("h-3.5 w-3.5 shrink-0", TONE[c.tone].text)} aria-hidden />
                <span className="truncate">{c.value}</span>
              </dd>
            </div>
          );
        })}
      </dl>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Kennzahlen                                                          */
/* ------------------------------------------------------------------ */

function Kpi({
  label,
  value,
  hint,
  to,
  trend,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  to?: string;
  /** Kleiner Verlauf rechts neben der Zahl. */
  trend?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const body = (
    <>
      <div className="text-[12px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <span className="text-[28px] font-semibold leading-none tracking-tight">{value}</span>
        {trend}
      </div>
      {children}
      {hint && <div className="mt-1.5 truncate text-[12px] text-muted-foreground">{hint}</div>}
    </>
  );
  const cls = "block min-w-0 rounded-2xl border border-border bg-card p-4";
  return to ? (
    <Link to={to} className={cn(cls, "hover:border-primary/40")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Heute aktiv – mit Veränderung zu gestern und Verlauf der letzten 14 Tage. */
function ActiveToday({ ext, fallback }: { ext: StatsExt | null; fallback?: number }) {
  if (!ext)
    return (
      <Kpi
        label="Aktiv heute"
        value={fallback != null ? fmtNum(fallback) : "–"}
        hint={fallback != null ? "in 24 Stunden" : undefined}
        to="/statistik"
      />
    );
  const yesterday = ext.daily.length >= 2 ? ext.daily[ext.daily.length - 2].count : null;
  const delta = yesterday ? Math.round(((ext.today - yesterday) / yesterday) * 100) : null;
  return (
    <Kpi
      label="Aktiv heute"
      value={fmtNum(ext.today)}
      to="/statistik"
      trend={<Sparkline values={ext.daily.map((d) => d.count)} />}
    >
      {delta != null && (
        <div
          className={cn(
            "mt-1.5 inline-flex items-center gap-0.5 whitespace-nowrap text-[12px] font-semibold",
            delta >= 0 ? "text-primary" : "text-muted-foreground",
          )}
        >
          {delta >= 0 ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          {delta >= 0 ? "+" : "−"}
          {Math.abs(delta)} % zu gestern
        </div>
      )}
    </Kpi>
  );
}

/** Kleiner Verlauf: Säulen im zurückhaltenden Ton, der letzte Tag in der Akzentfarbe. */
function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-7 w-16 shrink-0 items-end gap-[2px]" aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className={cn(
            "flex-1 rounded-t-[2px]",
            i === values.length - 1 ? "bg-primary" : "bg-muted-foreground/30",
          )}
          style={{ height: `${Math.max(v > 0 ? 8 : 0, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Spieltag                                                            */
/* ------------------------------------------------------------------ */

function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card", className)}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <h2 className="flex-1 text-[14px] font-semibold">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

const PanelLink = ({ to, children }: { to: string; children: string }) => (
  <Link
    to={to}
    className="inline-flex items-center gap-0.5 text-[12.5px] font-semibold text-primary hover:underline"
  >
    {children}
    <ChevronRight className="h-3.5 w-3.5" />
  </Link>
);

function MatchdayPanel({ className }: { className?: string }) {
  const matches = useMatchStore((s) => s.tournament.matches);
  const now = useMatchStore((s) => s.now);
  const details = useSourceDetails((s) => s.details);
  const admin = useMatchStore((s) => s.adminResults);

  const { title, list } = useMemo(() => {
    const today = day(now);
    const todays = matches.filter((m) => day(m.kickoffUtc) === today);
    if (todays.length > 0) return { title: "Spieltag heute", list: todays };
    const next = matches.filter((m) => Date.parse(m.kickoffUtc) > now).slice(0, 3);
    return { title: next.length > 0 ? "Nächste Spiele" : "Turnier beendet", list: next };
  }, [matches, now]);

  const finished = matches.filter((m) => m.status === "finished").length;
  const current = matches.find((m) => m.status !== "finished") ?? matches[matches.length - 1];

  return (
    <Panel
      title={title}
      className={className}
      action={<PanelLink to="/spiele">Spiele-Check</PanelLink>}
    >
      <div className="mb-4">
        <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
          <span className="text-muted-foreground">
            Turnier · {current ? STAGE_LABEL[current.stage] : ""}
          </span>
          <span className="font-semibold tabular">
            {finished} von {matches.length} Spielen
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={matches.length}
          aria-valuenow={finished}
          aria-label="Gespielte Spiele"
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${(finished / matches.length) * 100}%` }}
          />
        </div>
      </div>
      {list.length === 0 ? (
        <p className="text-muted-foreground">Alle Spiele sind gespielt.</p>
      ) : (
        <ul className="divide-y divide-border">
          {list.map((m) => (
            <li key={m.id} className="py-3 first:pt-0 last:pb-0">
              <MatchLine m={m} withDay={title === "Nächste Spiele"} />
              <SourceStrip
                m={m}
                primary={details?.primary[m.id]}
                backup={details?.backup ? details.backup[m.id] : undefined}
                espnOn={!!details?.backup}
                corrected={!!admin[m.id]}
              />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Unter jedem Spiel: was die Quellen melden und ob sie übereinstimmen. */
function SourceStrip({
  m,
  primary,
  backup,
  espnOn,
  corrected,
}: {
  m: MatchView;
  primary?: ResultRecord;
  backup?: ResultRecord;
  espnOn: boolean;
  corrected: boolean;
}) {
  if (m.status === "scheduled" && !primary && !backup) return null;
  const differ = sourcesDiffer(primary, backup);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-[3.75rem] text-[11.5px]">
      <Chip>OpenLigaDB {scoreText(primary)}</Chip>
      {espnOn && <Chip>ESPN {scoreText(backup)}</Chip>}
      {corrected && <Chip tone="primary">korrigiert</Chip>}
      {differ ? (
        <span className="inline-flex items-center gap-1 font-semibold text-gold">
          <TriangleAlert className="h-3.5 w-3.5" /> weichen ab
        </span>
      ) : primary && backup ? (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <CircleCheck className="h-3.5 w-3.5 text-primary" /> stimmen überein
        </span>
      ) : null}
    </div>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: "primary" }) {
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 font-medium tabular",
        tone === "primary" ? "bg-primary/15 text-foreground" : "bg-subtle text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Nutzer-Verlauf                                                      */
/* ------------------------------------------------------------------ */

function UsagePanel({ ext, className }: { ext: StatsExt | null; className?: string }) {
  const [active, setActive] = useState<number | null>(null);
  if (!ext || ext.daily.length === 0)
    return (
      <Panel
        title="Nutzer pro Tag"
        className={className}
        action={<PanelLink to="/statistik">Statistik</PanelLink>}
      >
        <p className="text-muted-foreground">Noch keine Daten.</p>
      </Panel>
    );
  const daily = ext.daily;
  const max = Math.max(1, ...daily.map((d) => d.count));
  const top = niceMax(max);
  const avg = Math.round(daily.reduce((n, d) => n + d.count, 0) / daily.length);
  const fmtDay = (d: string, long = false) =>
    new Date(`${d}T12:00:00`).toLocaleDateString("de-DE", {
      weekday: long ? "long" : "short",
      day: "2-digit",
      month: "2-digit",
    });
  const shown = active ?? daily.length - 1;
  return (
    <Panel
      title="Nutzer pro Tag"
      className={className}
      action={<PanelLink to="/statistik">Statistik</PanelLink>}
    >
      <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <div>
          <div className="text-[11px] text-muted-foreground">{fmtDay(daily[shown].day, true)}</div>
          <div className="text-[22px] font-semibold leading-tight">
            {fmtNum(daily[shown].count)}{" "}
            <span className="text-[13px] font-normal text-muted-foreground">Geräte</span>
          </div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">Ø 14 Tage</div>
          <div className="text-[15px] font-semibold">{fmtNum(avg)}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">30 Tage</div>
          <div className="text-[15px] font-semibold">{fmtNum(ext.month)}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">Neu (7 Tage)</div>
          <div className="text-[15px] font-semibold">{fmtNum(ext.new7)}</div>
        </div>
      </div>
      <div className="flex gap-2">
        {/* y-Achse: drei runde Werte */}
        <div className="flex h-36 flex-col justify-between py-0 text-right text-[10.5px] text-muted-foreground tabular">
          <span>{fmtNum(top)}</span>
          <span>{fmtNum(top / 2)}</span>
          <span>0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-px bg-border" />
            ))}
          </div>
          <div
            className="relative flex h-36 items-end gap-[2px]"
            role="img"
            aria-label={`Nutzer pro Tag: ${daily.map((d) => `${fmtDay(d.day)} ${d.count}`).join(", ")}`}
            onMouseLeave={() => setActive(null)}
          >
            {daily.map((d, i) => (
              <button
                key={d.day}
                type="button"
                aria-label={`${fmtDay(d.day)}: ${d.count}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                className="group relative flex h-full flex-1 items-end justify-center"
              >
                <span
                  className={cn(
                    "w-full max-w-6 rounded-t-[4px] transition-colors",
                    shown === i ? "bg-primary" : "bg-primary/45 group-hover:bg-primary/70",
                  )}
                  style={{ height: `${Math.max(d.count > 0 ? 2 : 0, (d.count / top) * 100)}%` }}
                />
                {active === i && (
                  <span
                    className="pointer-events-none absolute z-10 -translate-y-full whitespace-nowrap rounded-lg border border-border bg-popover px-2 py-1 text-[11.5px] shadow-md"
                    style={{ bottom: `calc(${(d.count / top) * 100}% + 6px)` }}
                  >
                    <b>{fmtNum(d.count)}</b> · {fmtDay(d.day)}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[10.5px] text-muted-foreground">
            <span>{fmtDay(daily[0].day)}</span>
            <span>heute</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/** Runder Höchstwert für die Achse (z. B. 97 → 100, 340 → 400). */
function niceMax(v: number): number {
  const step = 10 ** Math.floor(Math.log10(v));
  const n = Math.ceil(v / step);
  const nice = n <= 2 ? 2 : n <= 4 ? 4 : n <= 5 ? 5 : n <= 8 ? 8 : 10;
  return Math.max(2, nice * step);
}

/* ------------------------------------------------------------------ */
/* Zu erledigen, Feedback, Hinweis                                     */
/* ------------------------------------------------------------------ */

function TodoPanel({ data, className }: { data: Data; className?: string }) {
  const requests = useBadges((s) => s.requests);
  const overrides = useMatchStore((s) => Object.keys(s.adminResults).length);
  const errors = useSyncExternalStore(subscribeErrors, getErrors, getErrors);
  const details = useSourceDetails((s) => s.details);
  const problems = (data.alerts ?? []).filter((a) => a.active).length;
  const diffs = details
    ? Object.keys(details.primary).filter((id) =>
        sourcesDiffer(details.primary[id], details.backup?.[id] ?? undefined),
      ).length
    : 0;
  const pending = (data.groups ?? []).reduce((n, g) => n + Number(g.pending), 0);

  const items: { to: string; icon: LucideIcon; label: string; count: number; urgent?: boolean }[] =
    [
      { to: "/live", icon: BellRing, label: "Wächter-Probleme", count: problems, urgent: true },
      { to: "/antraege", icon: Inbox, label: "Entsperrungsanträge", count: requests, urgent: true },
      { to: "/spiele", icon: TriangleAlert, label: "Quellen weichen ab", count: diffs },
      { to: "/korrektur", icon: Pencil, label: "Aktive Korrekturen", count: overrides },
      { to: "/tipprunden", icon: Users, label: "Offene Beitrittsanfragen", count: pending },
      { to: "/system", icon: CircleAlert, label: "Fehler auf diesem Gerät", count: errors.length },
    ];
  const open = items.filter((i) => i.count > 0);

  return (
    <Panel title="Zu erledigen" className={className}>
      {open.length === 0 ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <CircleCheck className="h-4 w-4 text-primary" /> Nichts offen
        </div>
      ) : (
        <ul className="-mx-2 space-y-0.5">
          {open.map(({ to, icon: Icon, label, count, urgent }) => (
            <li key={to + label}>
              <Link to={to} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted">
                <Icon
                  className={cn("h-4 w-4 shrink-0", urgent ? "text-destructive" : "text-gold")}
                  aria-hidden
                />
                <span className="flex-1">{label}</span>
                <span className="min-w-6 rounded-full bg-muted px-2 text-center text-[12px] font-semibold tabular">
                  {count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const CATEGORY: Record<string, string> = {
  idee: "💡",
  fehler: "🐞",
  lob: "💚",
  sonstiges: "💬",
};

function FeedbackPanel({ rows, className }: { rows: FeedbackRow[] | null; className?: string }) {
  const latest = (rows ?? []).slice(0, 3);
  return (
    <Panel
      title={`Neuestes Feedback${rows ? ` (${rows.length})` : ""}`}
      className={className}
      action={<PanelLink to="/feedback">Alle</PanelLink>}
    >
      {rows && latest.length === 0 && <p className="text-muted-foreground">Noch kein Feedback.</p>}
      <ul className="space-y-3">
        {latest.map((f, i) => (
          <li key={f.id ?? i} className="flex gap-2.5">
            <span className="text-[15px] leading-5" aria-hidden>
              {CATEGORY[f.category ?? "sonstiges"] ?? "💬"}
            </span>
            <div className="min-w-0">
              <p className="line-clamp-2 break-words">
                {f.message ?? <span className="text-muted-foreground">ohne Text</span>}
              </p>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                {fmtTime(f.created_at)}
                {f.app_version && ` · v${f.app_version}`}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {!rows && <MessageSquareText className="h-4 w-4 animate-pulse text-muted-foreground" />}
    </Panel>
  );
}

function AnnouncementPanel({
  config,
  className,
}: {
  config: AdminConfig | null;
  className?: string;
}) {
  const a = config?.announcement;
  return (
    <Panel
      title="Hinweis in der App"
      className={className}
      action={<PanelLink to="/mitteilungen">Ändern</PanelLink>}
    >
      {a ? (
        <div className="flex gap-2.5">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="line-clamp-3 break-words">{a.text}</p>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">
              sichtbar {a.until ? `bis ${fmtTime(a.until)}` : "ohne Ende"}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground">Kein Hinweis aktiv.</p>
      )}
    </Panel>
  );
}

function LogPanel({
  rows,
  className,
}: {
  rows: TeamLogRow[] | null | undefined;
  className?: string;
}) {
  if (rows === null) return null; // SQL-Update fehlt noch
  const latest = (rows ?? []).slice(0, 4);
  return (
    <Panel
      title="Letzte Team-Aktionen"
      className={className}
      action={<PanelLink to="/protokoll">Protokoll</PanelLink>}
    >
      {rows && latest.length === 0 && <p className="text-muted-foreground">Noch nichts.</p>}
      <ul className="space-y-2.5">
        {latest.map((r) => {
          const Icon = logIcon(r.action);
          return (
            <li key={r.id} className="flex gap-2.5">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0">
                <p className="line-clamp-2 break-words">{r.detail ?? r.action}</p>
                <div className="text-[11.5px] text-muted-foreground">{fmtTime(r.at)}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
