import { useEffect } from "react";
import { create } from "zustand";
import { usePinStore } from "@/lib/pin";
import { fetchAlerts, fetchRequests } from "@/services/admin";

/** Zähler für die Navigation: offene Anträge und aktive Probleme des Wächters. */
type Badges = {
  requests: number;
  alerts: number;
  refresh: () => Promise<void>;
};

export const useBadges = create<Badges>((set) => ({
  requests: 0,
  alerts: 0,
  refresh: async () => {
    const pin = usePinStore.getState().pin;
    if (!pin) return;
    const [r, a] = await Promise.all([fetchRequests(pin), fetchAlerts(pin)]);
    set({
      ...(r.ok && { requests: (r.data.data ?? []).filter((x) => x.status === "open").length }),
      ...(a.ok && { alerts: (a.data.alerts ?? []).filter((x) => x.active).length }),
    });
  },
}));

const EVERY_MS = 2 * 60_000;

/** Lädt die Zähler beim Entsperren, alle 2 Minuten und beim Zurückkehren in die App. */
export function useBadgePolling(pin: string | null) {
  useEffect(() => {
    if (!pin) return;
    const refresh = () => {
      if (document.visibilityState === "visible") void useBadges.getState().refresh();
    };
    refresh();
    const id = window.setInterval(refresh, EVERY_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [pin]);
}
