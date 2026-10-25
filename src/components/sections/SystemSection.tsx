import { BellOff, BellRing, Lock, Trash2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Segmented } from "@/components/common/Segmented";
import { getDeviceId } from "@/lib/device-id";
import { clearErrors, getErrors, subscribeErrors } from "@/lib/error-log";
import { isInstalledApp } from "@/lib/install";
import { usePinStore } from "@/lib/pin";
import { disablePush, enablePush, pushSupported } from "@/lib/push";
import type { ThemeMode } from "@/lib/theme";
import { APP_VERSION } from "@/lib/version";
import { isBackendConfigured } from "@/services/supabase";
import { useTeamStore } from "@/store/team-store";
import { FaceIdCard } from "./FaceIdCard";
import { ActionButton, Card, Info } from "./shared";
import { useAction } from "./use-action";

export function SystemSection() {
  const errors = useSyncExternalStore(subscribeErrors, getErrors, getErrors);
  const pushEnabled = useTeamStore((s) => s.pushEnabled);
  const theme = useTeamStore((s) => s.theme);
  const setTheme = useTeamStore((s) => s.setTheme);
  const lock = usePinStore((s) => s.lock);
  const { busy, run } = useAction();
  return (
    <div className="space-y-3 text-[13.5px]">
      <Card
        title="Mitteilungen auf diesem Gerät"
        text="Für Warnungen des Wächters und neue Anträge. Danach unter Live-Daten oder Anträge dieses Gerät eintragen."
      >
        {pushEnabled ? (
          <ActionButton
            className="w-full"
            icon={<BellOff />}
            busy={busy === "push"}
            onClick={() =>
              run(
                "push",
                async () => {
                  await disablePush();
                  return { ok: true as const, data: null };
                },
                "Mitteilungen auf diesem Gerät aus",
              )
            }
          >
            Ausschalten
          </ActionButton>
        ) : (
          <ActionButton
            variant="primary"
            className="w-full"
            icon={<BellRing />}
            busy={busy === "push"}
            disabled={!pushSupported()}
            onClick={() =>
              run(
                "push",
                async () => {
                  const err = await enablePush();
                  return err
                    ? { ok: false as const, error: err }
                    : { ok: true as const, data: null };
                },
                "Mitteilungen sind an",
              )
            }
          >
            Einschalten
          </ActionButton>
        )}
        {!pushSupported() && (
          <p className="text-[12.5px] text-muted-foreground">
            Dieser Browser kann keine Mitteilungen. Auf dem iPhone die Team-App zuerst über Teilen →
            „Zum Home-Bildschirm“ hinzufügen und von dort öffnen.
          </p>
        )}
      </Card>

      <FaceIdCard />

      <Card title="Darstellung">
        <Segmented<ThemeMode>
          value={theme}
          onChange={setTheme}
          options={[
            { value: "dark", label: "Dunkel" },
            { value: "light", label: "Hell" },
            { value: "system", label: "Wie Gerät" },
          ]}
        />
      </Card>

      <Card title="Dieses Gerät">
        <div className="grid grid-cols-2 gap-2">
          <Info label="Team-App" value={`v${APP_VERSION}`} />
          <Info label="Server" value={isBackendConfigured() ? "verbunden" : "keiner"} />
          <Info label="Installiert" value={isInstalledApp() ? "ja" : "nein (Browser)"} />
          <Info label="Mitteilungen" value={pushEnabled ? "an" : "aus"} />
        </div>
        <Info label="Geräte-ID" value={getDeviceId()} hint="Eigene ID der Team-App" />
      </Card>

      <Card
        title={`Fehlerprotokoll (${errors.length})`}
        text="Fehler, die in der Team-App auf diesem Gerät aufgetreten sind."
        action={
          errors.length > 0 && (
            <ActionButton
              variant="outline"
              className="h-8 px-2.5 text-[12.5px]"
              icon={<Trash2 />}
              onClick={clearErrors}
            >
              Leeren
            </ActionButton>
          )
        }
      >
        <ul className="max-h-72 space-y-1 overflow-y-auto rounded-xl bg-subtle p-2 font-mono text-[11.5px]">
          {errors.length === 0 && <li className="text-muted-foreground">Keine Fehler 🎉</li>}
          {errors.map((e, i) => (
            <li key={i} className="break-words">
              <span className="text-muted-foreground">
                {new Date(e.ts).toLocaleString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>{" "}
              <span className="text-primary">[{e.category}]</span> {e.message}
            </li>
          ))}
        </ul>
      </Card>

      <ActionButton className="w-full" icon={<Lock />} onClick={lock}>
        Jetzt sperren
      </ActionButton>
    </div>
  );
}
