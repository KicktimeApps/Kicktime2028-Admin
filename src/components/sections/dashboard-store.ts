import { create } from "zustand";
import { usePinStore } from "@/lib/pin";
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
  type TeamLogRow,
  type WatchAlert,
} from "@/services/admin";

export type Data = {
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

const EMPTY: Data = {
  stats: null,
  config: null,
  groups: null,
  alerts: undefined,
  feedback: null,
  log: undefined,
  at: null,
};

type DashboardState = { data: Data; loading: boolean; load: (pin: string) => Promise<void> };

/**
 * Daten des Dashboards – außerhalb der Seite gespeichert, damit sie beim Zurückwechseln
 * sofort da sind. Geladen wird nur beim ersten Öffnen und über „Jetzt aktualisieren“.
 */
export const useDashboard = create<DashboardState>((set, get) => ({
  data: EMPTY,
  loading: false,
  load: async (pin) => {
    if (get().loading) return;
    set({ loading: true });
    const [stats, config, groups, alerts, feedback, log] = await Promise.all([
      fetchStats(pin),
      fetchConfig(pin),
      fetchGroups(pin),
      fetchAlerts(pin),
      fetchFeedback(pin),
      fetchTeamLog(pin),
    ]);
    const d = get().data;
    set({
      loading: false,
      data: {
        stats: stats.ok ? stats.data : d.stats,
        config: config.ok ? config.data : d.config,
        groups: groups.ok ? (groups.data.data ?? []) : d.groups,
        alerts: alerts.ok ? alerts.data.alerts : d.alerts,
        feedback: feedback.ok ? feedback.data.rows : d.feedback,
        log: log.ok ? log.data.rows : d.log,
        at: Date.now(),
      },
    });
  },
}));

/** Der Startbildschirm hat schon alles geladen – übernehmen statt neu abzurufen. */
export function primeDashboard(d: Omit<Data, "at">) {
  useDashboard.setState({ data: { ...d, at: Date.now() } });
}

// Gesperrt → Daten vergessen; nach dem Entsperren lädt die Übersicht einmal frisch.
usePinStore.subscribe((s, prev) => {
  if (prev.pin && !s.pin) useDashboard.setState({ data: EMPTY });
});
