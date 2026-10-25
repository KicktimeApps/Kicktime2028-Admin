import { Loader2, Lock, ScanFace } from "lucide-react";
import { useState } from "react";
import { LogoMark } from "@/components/layout/Logo";
import { haptics } from "@/lib/haptics";
import { usePinStore } from "@/lib/pin";
import { cn } from "@/lib/utils";
import { verifyPin } from "@/services/admin";
import { faceIdHint, faceIdSupported, loginWithFaceId } from "@/services/passkey";
import { isBackendConfigured } from "@/services/supabase";

/** Sperrbildschirm: PIN prüft der Server (Secret ADMIN_PIN, Sperre nach Fehlversuchen). */
export function PinScreen() {
  const unlock = usePinStore((s) => s.unlock);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Face ID nur anbieten, wenn auf diesem Gerät eingerichtet (sonst zuerst PIN).
  const [faceId] = useState(() => faceIdSupported() && faceIdHint());
  const [faceBusy, setFaceBusy] = useState(false);
  const withFaceId = async () => {
    if (faceBusy) return;
    setError(null);
    setFaceBusy(true);
    const res = await loginWithFaceId();
    setFaceBusy(false);
    if (!res) return; // abgebrochen
    if ("error" in res) {
      haptics.warn();
      setError(res.error);
      return;
    }
    haptics.success();
    unlock(res.token);
  };
  const submit = async () => {
    if (value.length < 6 || busy) return;
    setBusy(true);
    const ok = await verifyPin(value);
    setBusy(false);
    if (ok) {
      haptics.success();
      unlock(value);
    } else {
      haptics.warn();
      setError("Falsche PIN oder zu viele Versuche. Bitte kurz warten.");
      setValue("");
    }
  };
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <form
        className="flex w-full max-w-xs flex-col items-center text-center"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <LogoMark className="h-14 w-14" />
        <h1 className="mt-4 font-display text-[28px] font-bold uppercase leading-none tracking-tight">
          KickTime-Team
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Kontrollzentrum für die EM 2028.{faceId ? "" : " Bitte PIN eingeben."}
        </p>
        {!isBackendConfigured() ? (
          <p className="mt-6 rounded-xl bg-subtle p-4 text-[13.5px] text-muted-foreground">
            Kein Server eingestellt (public-config.ts).
          </p>
        ) : (
          <>
            {faceId && (
              <>
                <button
                  type="button"
                  onClick={() => void withFaceId()}
                  disabled={faceBusy}
                  className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-primary text-[16px] font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {faceBusy ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ScanFace className="h-5 w-5" />
                  )}
                  Mit Face ID entsperren
                </button>
                <div className="mt-5 flex w-full items-center gap-3 text-[12px] text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> oder mit PIN
                  <span className="h-px flex-1 bg-border" />
                </div>
              </>
            )}
            <input
              autoFocus={!faceId}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={12}
              value={value}
              onChange={(e) => {
                setError(null);
                setValue(e.target.value.replace(/\D/g, ""));
              }}
              placeholder="PIN"
              aria-label="PIN"
              className={cn(
                faceId ? "mt-4" : "mt-6",
                "h-14 w-full rounded-2xl border bg-subtle text-center text-[26px] tracking-[0.4em] outline-none placeholder:text-[18px] placeholder:tracking-normal",
                error ? "border-destructive" : "border-border focus:border-primary",
              )}
            />
            <p role="alert" className="mt-2 min-h-[1.25rem] text-[13px] text-destructive">
              {error}
            </p>
            <button
              type="submit"
              disabled={busy || value.length < 6}
              className={cn(
                "mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold disabled:opacity-40",
                faceId ? "border border-border" : "bg-primary text-primary-foreground",
              )}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Entsperren
            </button>
            <p className="mt-4 text-[12px] text-muted-foreground">
              Die PIN wird nicht gespeichert. Nach 30 Minuten ohne Bedienung sperrt sich die App.
            </p>
          </>
        )}
      </form>
    </div>
  );
}
