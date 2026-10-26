import type { AdminConfig, ServerFixture, fetchServerFixtures } from "@/services/admin";
import type { Announcement } from "@/services/announcement";

/**
 * Wie Bereiche ihre geladenen Daten ablegen – gemeinsam für den Bereich selbst
 * und den Startbildschirm (`shell/preload.ts`), damit beide gleich rechnen.
 */

export const ESPN_DEFAULT = "uefa.euro";

/** Formular der Live-Quelle aus der gespeicherten Einstellung (auch für den Startbildschirm). */
export function sourceFormOf(data: AdminConfig) {
  const src = data.liveSource ?? { ...data.defaults, suffix: "", paused: false };
  return {
    form: {
      league: src.league,
      season: src.season,
      suffix: src.suffix ?? "",
      paused: !!src.paused,
      backup: src.backup ?? ESPN_DEFAULT,
    },
    espnOn: (src.backup ?? ESPN_DEFAULT) !== "",
  };
}

/** Antwort von fixtures_list → gespeicherter Vergleichsstand. */
export function serverFixturesOf(
  res: Awaited<ReturnType<typeof fetchServerFixtures>>,
): ServerFixture[] | "missing" | null {
  if (res.ok) return Array.isArray(res.data.rows) ? res.data.rows : "missing";
  // Edge Function admin noch ohne „fixtures_list“ (vor KickTime 2.18.0).
  return /Unbekannte Aktion/.test(res.error) ? "missing" : null;
}

/** Felder des Hinweis-Banners aus dem gespeicherten Hinweis (auch für den Startbildschirm). */
export const bannerFormOf = (a: Announcement | null) => ({
  text: a?.text ?? "",
  tone: a?.tone ?? ("info" as Announcement["tone"]),
  until: toLocalInput(a?.until ?? null),
});

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
