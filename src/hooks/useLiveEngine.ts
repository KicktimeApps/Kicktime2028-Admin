import { useEffect } from "react";
import { ensureServiceWorker, refreshPush } from "@/lib/push";
import { refreshLiveData, restoreLiveCache } from "@/services/live-data";
import { useMatchStore } from "@/store/match-store";

const MATCH_WINDOW_MIN = 150;

/**
 * Uhr und Live-Daten. Das Team will den Stand frisch sehen: rund um Spiele
 * jede Minute, sonst alle 5 Minuten (die KickTime-App fragt außerhalb des
 * Turniers seltener).
 */
export function useLiveEngine() {
  const liveWindow = useMatchStore((s) =>
    s.tournament.matches.some((m) => {
      const k = Date.parse(m.kickoffUtc);
      return s.now >= k - 15 * 60_000 && s.now <= k + MATCH_WINDOW_MIN * 60_000;
    }),
  );

  useEffect(() => {
    restoreLiveCache();
    void ensureServiceWorker().then(() => refreshPush());
    const tick = window.setInterval(() => useMatchStore.getState().tick(), 10_000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;
    const loop = async () => {
      if (document.visibilityState === "visible") await refreshLiveData();
      if (cancelled) return;
      timer = window.setTimeout(loop, liveWindow ? 60_000 : 5 * 60_000);
    };
    void loop();
    const onVisible = () => document.visibilityState === "visible" && void refreshLiveData();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [liveWindow]);
}
