import { BellRing, CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useCachedState, useLoadOnce } from "@/lib/page-cache";
import { Switch } from "@/components/ui/switch";
import { getDeviceId } from "@/lib/device-id";
import { enablePush } from "@/lib/push";
import { teamDevice, type TeamDeviceDelivery, type TeamDeviceState } from "@/services/admin";
import { useTeamStore } from "@/store/team-store";
import { fmtTime, useAction } from "./use-action";

/**
 * Team-Mitteilungen (neue Anträge, Wächter) an dieses Gerät – nur Geräte, die
 * hier mit der PIN eingetragen werden. Kein anderes Gerät kann sich selbst
 * eintragen. Warnt, wenn eingetragene Geräte keine Mitteilungen empfangen
 * können (z. B. App neu installiert → neue Geräte-ID).
 */
export function TeamDeviceRow({ pin, reloadKey = 0 }: { pin: string; reloadKey?: number }) {
  const pushEnabled = useTeamStore((s) => s.pushEnabled);
  const { busy, run } = useAction();
  const [state, setState] = useCachedState<TeamDeviceState | null>("teamdevice", null);
  const device = getDeviceId();
  const load = useCallback(async () => {
    const r = await teamDevice(pin, device, "");
    if (r.ok) setState(r.data);
  }, [pin, device, setState]);
  // Einmal beim ersten Öffnen, danach nur, wenn die Wächter-Karte neu lädt.
  useLoadOnce("teamdevice", load);
  useEffect(() => {
    if (reloadKey > 0) void load();
  }, [reloadKey, load]);
  const set = async (mode: "on" | "off" | "only", msg: string) => {
    const res = await run("device", () => teamDevice(pin, device, mode), msg);
    if (res) setState(res);
  };

  // Ältere Server-Version kennt reachable/selfPush noch nicht → keine Warnung.
  const dead = state?.reachable !== undefined ? Math.max(0, state.count - state.reachable) : 0;
  const warning = !pushEnabled
    ? "Auf diesem Gerät sind Mitteilungen aus – erst einschalten, dann eintragen."
    : state?.registered && state.selfPush === false
      ? "Dieses Gerät ist eingetragen, hat aber kein Mitteilungs-Abo. Unter System die Mitteilungen aus- und wieder einschalten."
      : state && state.count > 0 && state.reachable === 0
        ? "Kein eingetragenes Gerät kann Mitteilungen empfangen – dieses Gerät eintragen."
        : null;

  return (
    <div className="space-y-2 rounded-xl bg-muted/40 px-3 py-2.5">
      <label className="flex items-center gap-3">
        <span className="min-w-0 flex-1 text-[13.5px] font-medium">
          Team-Mitteilungen an dieses Gerät
        </span>
        <Switch
          checked={!!state?.registered}
          disabled={!state || !pushEnabled || busy === "device"}
          onCheckedChange={(v) =>
            set(v ? "on" : "off", v ? "Dieses Gerät bekommt Mitteilungen" : "Ausgeschaltet")
          }
          aria-label="Team-Mitteilungen an dieses Gerät"
        />
      </label>
      {state && state.count > 0 && (
        <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
          <BellRing className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">
            {state.count} {state.count === 1 ? "Gerät eingetragen" : "Geräte eingetragen"}
            {state.registered ? " (auch dieses)" : ""}
            {dead > 0 && `, ${dead} davon ohne Mitteilungen`}
          </span>
          {state.registered && state.count > 1 && (
            <button
              type="button"
              onClick={() => set("only", "Nur noch dieses Gerät")}
              className="shrink-0 font-semibold text-foreground underline-offset-2 hover:underline"
            >
              Nur dieses Gerät
            </button>
          )}
        </div>
      )}
      {state?.devices && state.devices.length > 0 && (
        <ul className="space-y-1">
          {state.devices.map((d, i) => (
            <DeliveryLine key={i} d={d} n={i + 1} />
          ))}
        </ul>
      )}
      {warning && (
        <p className="flex gap-2 text-[12.5px] text-gold">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{warning}</span>
        </p>
      )}
      {!pushEnabled && (
        <button
          type="button"
          disabled={busy === "push"}
          onClick={() =>
            run(
              "push",
              async () => {
                const err = await enablePush();
                return err ? { ok: false as const, error: err } : { ok: true as const, data: null };
              },
              "Mitteilungen sind an",
            )
          }
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          <BellRing className="h-3.5 w-3.5" /> Mitteilungen einschalten
        </button>
      )}
    </div>
  );
}

/** Letzte Zustellung eines eingetragenen Geräts – kommt die Warnung wirklich an? */
function DeliveryLine({ d, n }: { d: TeamDeviceDelivery; n: number }) {
  const name = d.self ? "Dieses Gerät" : `Gerät ${n}`;
  const failedLast = !!d.lastFail && (!d.lastOk || d.lastFail > d.lastOk);
  const [Icon, color, text] = !d.push
    ? [CircleX, "text-destructive", "kein Mitteilungs-Abo – bekommt nichts"]
    : failedLast
      ? [
          CircleX,
          "text-destructive",
          `Zustellung fehlgeschlagen ${fmtTime(d.lastFail)}${d.lastStatus ? ` (Fehler ${d.lastStatus})` : ""}`,
        ]
      : d.lastOk
        ? [CircleCheck, "text-primary", `zuletzt zugestellt ${fmtTime(d.lastOk)}`]
        : [BellRing, "text-muted-foreground", "noch nichts zugestellt – Test schicken"];
  return (
    <li className="flex items-start gap-2 text-[12.5px]">
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${color}`} />
      <span className="min-w-0 flex-1">
        <span className="font-medium text-foreground">{name}:</span>{" "}
        <span className="text-muted-foreground">{text}</span>
      </span>
    </li>
  );
}
