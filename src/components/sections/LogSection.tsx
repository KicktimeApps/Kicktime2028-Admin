import { RefreshCw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { getDeviceId } from "@/lib/device-id";
import { cn } from "@/lib/utils";
import { fetchTeamLog, type TeamLogRow } from "@/services/admin";
import { useCachedState, useLoadOnce } from "@/lib/page-cache";
import { logIcon } from "./log-format";
import { useAction } from "./use-action";

/** Team-Protokoll: jede ändernde Aktion mit Zeit, Klartext und Gerät. */
export function LogSection({ pin }: { pin: string }) {
  const { busy, run } = useAction();
  const [rows, setRows] = useCachedState<TeamLogRow[] | null | undefined>("log", undefined);
  const load = useCallback(async () => {
    const res = await run("load", () => fetchTeamLog(pin));
    if (res) setRows(res.rows);
  }, [pin, run, setRows]);
  useLoadOnce("log", load);

  const me = getDeviceId();
  const days = useMemo(() => {
    const out: { label: string; items: TeamLogRow[] }[] = [];
    for (const r of rows ?? []) {
      const label = new Date(r.at).toLocaleDateString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      });
      const last = out[out.length - 1];
      if (last?.label === label) last.items.push(r);
      else out.push({ label, items: [r] });
    }
    return out;
  }, [rows]);

  return (
    <div className="space-y-4 text-[13.5px]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12.5px] text-muted-foreground">
          Die letzten 200 Aktionen, 180 Tage lang aufbewahrt.
        </p>
        <button
          type="button"
          onClick={load}
          aria-label="Aktualisieren"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground"
        >
          <RefreshCw className={cn("h-4 w-4", busy === "load" && "animate-spin")} />
        </button>
      </div>

      {rows === null && (
        <p className="rounded-xl bg-gold/10 p-3">
          Noch nicht eingerichtet – das SQL-Update „Team-App“ fehlt.
        </p>
      )}
      {rows && rows.length === 0 && (
        <p className="rounded-xl bg-subtle p-3 text-muted-foreground">Noch keine Einträge.</p>
      )}

      {days.map((d) => (
        <section key={d.label}>
          <h2 className="mb-1.5 px-1 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
            {d.label}
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {d.items.map((r) => {
              const Icon = logIcon(r.action);
              return (
                <li key={r.id} className="flex items-start gap-3 px-3.5 py-2.5">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="break-words">{r.detail ?? r.action}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {new Date(r.at).toLocaleTimeString("de-DE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      ·{" "}
                      {r.device_id === me
                        ? "dieses Gerät"
                        : r.device_id
                          ? `Gerät …${r.device_id.slice(-4)}`
                          : "unbekanntes Gerät"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
