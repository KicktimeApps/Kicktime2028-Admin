import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { getDeviceId } from "@/lib/device-id";
import { getSupabase } from "./supabase";

/**
 * Entsperren mit Face ID (Passkeys) – nur in der Team-App. Der Server
 * (Edge Function admin) prüft die Antwort und gibt eine Freigabe „s1.…“ für
 * 4 Stunden aus, die statt der PIN mitgeschickt wird (nur im Speicher).
 */
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function call<T>(body: Record<string, unknown>): Promise<Result<T>> {
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: "Kein Server eingestellt" };
  try {
    const { data, error } = await sb.functions.invoke("admin", {
      body: { ...body, by: getDeviceId() },
    });
    if (error) {
      const res = (error as { context?: Response }).context;
      const detail = await res
        ?.clone()
        .json()
        .then((b: { error?: string }) => b?.error)
        .catch(() => undefined);
      return { ok: false, error: detail ?? error.message };
    }
    if (data && typeof data === "object" && "error" in data)
      return { ok: false, error: String(data.error) };
    return { ok: true, data: data as T };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Merkt sich, ob auf diesem Gerät Face ID eingerichtet wurde – nur ein Hinweis, kein Geheimnis. */
const HINT_KEY = "kicktime-2028-team.faceid";
export const faceIdHint = () => {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
};
const setHint = (on: boolean) => {
  try {
    if (on) localStorage.setItem(HINT_KEY, "1");
    else localStorage.removeItem(HINT_KEY);
  } catch {
    /* privates Fenster – dann eben ohne Hinweis */
  }
};

export const faceIdSupported = () => typeof window !== "undefined" && browserSupportsWebAuthn();

/** Abbruch durch den Nutzer (Face ID weggeklickt) ist kein Fehler. */
const cancelled = (err: unknown) =>
  err instanceof Error && (err.name === "NotAllowedError" || err.name === "AbortError");

/** Mit Face ID entsperren. Gibt die Freigabe zurück, null bei Abbruch, sonst einen Fehlertext. */
export async function loginWithFaceId(): Promise<{ token: string } | { error: string } | null> {
  const opts = await call<{ available: boolean; options?: PublicKeyCredentialRequestOptionsJSON }>({
    action: "passkey_login_options",
  });
  if (!opts.ok) return { error: opts.error };
  if (!opts.data.available || !opts.data.options) {
    setHint(false);
    return { error: "Face ID ist hier nicht (mehr) eingerichtet – bitte mit PIN entsperren." };
  }
  let response;
  try {
    response = await startAuthentication({ optionsJSON: opts.data.options });
  } catch (err) {
    return cancelled(err) ? null : { error: "Face ID hat nicht geklappt." };
  }
  const res = await call<{ token: string }>({ action: "passkey_login", response });
  if (!res.ok) return { error: res.error };
  setHint(true);
  return { token: res.data.token };
}

/** Name des Geräts für die Liste, z. B. „iPhone · 25.10.“. */
export function deviceLabel(ua = navigator.userAgent): string {
  const kind = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Macintosh/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : "Gerät";
  const date = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  return `${kind} · ${date}`;
}

/** Face ID auf diesem Gerät einrichten (nur mit echter PIN). Gibt einen Fehlertext oder null. */
export async function registerFaceId(pin: string): Promise<string | null | "cancelled"> {
  const label = deviceLabel();
  const opts = await call<{ options: PublicKeyCredentialCreationOptionsJSON }>({
    action: "passkey_register_options",
    pin,
  });
  if (!opts.ok) return opts.error;
  let response;
  try {
    response = await startRegistration({ optionsJSON: opts.data.options });
  } catch (err) {
    if (cancelled(err)) return "cancelled";
    if (err instanceof Error && err.name === "InvalidStateError")
      return "Auf diesem Gerät ist Face ID schon eingerichtet.";
    return "Face ID ließ sich nicht einrichten.";
  }
  const res = await call({ action: "passkey_register", pin, response, label });
  if (!res.ok) return res.error;
  setHint(true);
  return null;
}

export type TeamPasskey = {
  id: string;
  label: string | null;
  rp_id: string;
  created_at: string;
  last_used_at: string | null;
  /** Für diese Adresse der Team-App eingerichtet. */
  here: boolean;
};

/** null = SQL-Update fehlt noch. */
export const listPasskeys = (pin: string) =>
  call<{ data: TeamPasskey[] | null }>({ action: "passkey_list", pin });

export const deletePasskey = (pin: string, id: string) =>
  call({ action: "passkey_delete", pin, id });
