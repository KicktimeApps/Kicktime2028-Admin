import { bannerFormOf, serverFixturesOf, sourceFormOf } from "@/components/sections/section-forms";
import { primeDashboard } from "@/components/sections/dashboard-store";
import { getDeviceId } from "@/lib/device-id";
import { primeCache } from "@/lib/page-cache";
import {
  fetchAlerts,
  fetchConfig,
  fetchFeedback,
  fetchGlobalBans,
  fetchGroups,
  fetchRequests,
  fetchServerFixtures,
  fetchStats,
  fetchTeamLog,
  teamDevice,
} from "@/services/admin";
import { listPasskeys } from "@/services/passkey";

/**
 * Lädt nach dem Entsperren alles, was die Bereiche brauchen, und legt es unter
 * denselben Schlüsseln ab wie die Bereiche selbst (`useCachedState`). Jeder Abruf
 * nur einmal – die Übersicht bekommt dieselben Antworten. Höchstens 2 Aufrufe
 * gleichzeitig (`services/admin.ts`), sonst zählt der Server Fehlversuche.
 * Was fehlschlägt, lädt der Bereich beim Öffnen selbst.
 */
let running: { pin: string; promise: Promise<void> } | null = null;
let listener: (done: number, total: number) => void = () => {};

export function preloadAll(
  pin: string,
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  // Läuft schon (z. B. zweimal eingehängt) → nicht doppelt laden, nur mitverfolgen.
  listener = onProgress;
  if (running?.pin !== pin) {
    const promise = load(pin, (d, t) => listener(d, t));
    running = { pin, promise };
    void promise.finally(() => {
      if (running?.promise === promise) running = null;
    });
  }
  return running.promise;
}

async function load(pin: string, onProgress: (done: number, total: number) => void): Promise<void> {
  let done = 0;
  const all = {
    stats: fetchStats(pin),
    config: fetchConfig(pin),
    groups: fetchGroups(pin),
    alerts: fetchAlerts(pin),
    feedback: fetchFeedback(pin),
    log: fetchTeamLog(pin),
    requests: fetchRequests(pin),
    bans: fetchGlobalBans(pin),
    device: teamDevice(pin, getDeviceId(), ""),
    passkeys: listPasskeys(pin),
    fixtures: fetchServerFixtures(pin),
  };
  const total = Object.keys(all).length;
  onProgress(0, total);
  for (const p of Object.values(all)) void p.then(() => onProgress(++done, total));
  const r = {
    stats: await all.stats,
    config: await all.config,
    groups: await all.groups,
    alerts: await all.alerts,
    feedback: await all.feedback,
    log: await all.log,
    requests: await all.requests,
    bans: await all.bans,
    device: await all.device,
    passkeys: await all.passkeys,
    fixtures: await all.fixtures,
  };

  const values: Record<string, unknown> = {};
  const loaded: string[] = [];
  if (r.stats.ok) {
    values.stats = r.stats.data;
    loaded.push("stats");
  }
  if (r.groups.ok) {
    values.groups = r.groups.data.data ?? [];
    loaded.push("groups");
  }
  if (r.alerts.ok) {
    values.alerts = r.alerts.data.alerts;
    loaded.push("alerts");
  }
  if (r.feedback.ok) {
    values.feedback = r.feedback.data.rows;
    loaded.push("feedback");
  }
  if (r.log.ok) {
    values.log = r.log.data.rows;
    loaded.push("log");
  }
  if (r.requests.ok) values.requests = r.requests.data.data ?? [];
  if (r.bans.ok) values["requests.bans"] = r.bans.data.data ?? [];
  if (r.requests.ok && r.bans.ok) loaded.push("requests");
  if (r.device.ok) {
    values.teamdevice = r.device.data;
    loaded.push("teamdevice");
  }
  if (r.passkeys.ok) {
    values.passkeys = r.passkeys.data.data;
    loaded.push("passkeys");
  }
  const fx = serverFixturesOf(r.fixtures);
  if (fx) {
    values["live.fixtures"] = fx;
    loaded.push("live.fixtures");
  }
  if (r.config.ok) {
    const { form, espnOn } = sourceFormOf(r.config.data);
    values["live.config"] = r.config.data;
    values["live.form"] = form;
    values["live.espnOn"] = espnOn;
    loaded.push("live.config");
    const a = r.config.data.announcement;
    const banner = bannerFormOf(a);
    values["messages.current"] = a;
    values["messages.text"] = banner.text;
    values["messages.tone"] = banner.tone;
    values["messages.until"] = banner.until;
    if (r.stats.ok) {
      values["messages.subs"] = r.stats.data.push?.subscriptions ?? null;
      loaded.push("messages");
    }
  }
  primeCache(values, loaded);

  // Übersicht: nur übernehmen, wenn alles da ist – sonst lädt sie selbst.
  if (r.stats.ok && r.config.ok && r.groups.ok && r.alerts.ok && r.feedback.ok && r.log.ok)
    primeDashboard({
      stats: r.stats.data,
      config: r.config.data,
      groups: r.groups.data.data ?? [],
      alerts: r.alerts.data.alerts,
      feedback: r.feedback.data.rows,
      log: r.log.data.rows,
    });
}
