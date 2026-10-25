/**
 * Mitteilungen für die Team-App (Wächter, neue Anträge): eigenes Push-Abo mit
 * eigener Geräte-ID. Im Team-Bereich → Live-Daten bzw. Anträge wird dieses
 * Gerät dann per PIN als Team-Gerät eingetragen.
 */
import { PUBLIC_CONFIG } from "@/public-config";
import { getSupabase, isBackendConfigured } from "@/services/supabase";
import { useTeamStore } from "@/store/team-store";
import { getDeviceId } from "./device-id";
import { logError } from "./error-log";

const SW_PATH = "/sw.js";
const VAPID = (
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) || PUBLIC_CONFIG.vapidPublicKey
).trim();

export const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  typeof Notification !== "undefined" &&
  VAPID.length > 20 &&
  isBackendConfigured();

function unsafeContext(): boolean {
  if (typeof window === "undefined" || !import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true; // Vorschau-iframes
  } catch {
    return true;
  }
  return new URL(window.location.href).searchParams.get("sw") === "off";
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (unsafeContext() || !("serviceWorker" in navigator)) return null;
  try {
    return (
      (await navigator.serviceWorker.getRegistration(SW_PATH)) ??
      (await navigator.serviceWorker.register(SW_PATH, { scope: "/" }))
    );
  } catch (err) {
    logError("push", `Service Worker: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

function b64ToBytes(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function sameKey(a: ArrayBuffer | null, b: Uint8Array): boolean {
  if (!a) return true; // Browser verrät den Schlüssel nicht – dann nicht eingreifen
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

/** Abo anlegen bzw. auffrischen und auf dem Server speichern. */
async function saveSubscription(): Promise<boolean> {
  const sb = await getSupabase();
  if (!sb || Notification.permission !== "granted") return false;
  const reg = await ensureServiceWorker();
  if (!reg) return false;
  try {
    let sub = await reg.pushManager.getSubscription();
    if (sub && !sameKey(sub.options.applicationServerKey, b64ToBytes(VAPID))) {
      await sub.unsubscribe().catch(() => {});
      sub = null;
    }
    if (!sub) {
      const key = b64ToBytes(VAPID);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key.buffer as ArrayBuffer,
      });
    }
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
    const { error } = await sb.rpc("kt_save_subscription", {
      p_device: getDeviceId(),
      p_endpoint: json.endpoint,
      p_p256dh: json.keys.p256dh,
      p_auth: json.keys.auth,
      p_user_agent: navigator.userAgent,
    });
    if (error) throw new Error(error.message);
    return true;
  } catch (err) {
    logError("push", `Abo fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

/**
 * Mitteilungen einschalten (fragt den Browser um Erlaubnis). Gibt einen Text
 * zurück, wenn es nicht geklappt hat.
 */
export async function enablePush(): Promise<string | null> {
  if (!pushSupported())
    return "Dieser Browser kann keine Mitteilungen. Auf dem iPhone die App erst zum Home-Bildschirm hinzufügen.";
  if (unsafeContext()) return "Mitteilungen gehen nur in der fertigen App (nicht in der Vorschau).";
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    return "Mitteilungen sind im Browser blockiert – in den Einstellungen des Handys für diese App erlauben.";
  const ok = await saveSubscription();
  useTeamStore.getState().setPushEnabled(ok);
  return ok ? null : "Das Abo hat nicht geklappt – bitte später noch einmal.";
}

/** Nur auf diesem Gerät abschalten. Die Eintragung als Team-Gerät bleibt bestehen. */
export async function disablePush(): Promise<void> {
  useTeamStore.getState().setPushEnabled(false);
  const reg = await ensureServiceWorker();
  const sub = await reg?.pushManager.getSubscription().catch(() => null);
  await sub?.unsubscribe().catch(() => {});
}

/**
 * Beim Start: Abo auffrischen (Push-Dienste tauschen Abos gelegentlich aus;
 * außerdem gilt das Gerät so als aktiv und wird nie aufgeräumt).
 */
export async function refreshPush(): Promise<void> {
  if (!useTeamStore.getState().pushEnabled || !pushSupported()) return;
  if (Notification.permission !== "granted") {
    useTeamStore.getState().setPushEnabled(false);
    return;
  }
  await saveSubscription();
}
