import { RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Segmented } from "@/components/common/Segmented";
import { cn } from "@/lib/utils";
import { deleteFeedback, fetchFeedback, type FeedbackRow } from "@/services/admin";
import { useCachedState, useLoadOnce } from "@/lib/page-cache";
import { ConfirmButton } from "./shared";
import { useAction } from "./use-action";

const CATEGORY_LABEL: Record<string, string> = {
  idee: "💡 Idee",
  fehler: "🐞 Fehler",
  lob: "💚 Lob",
  sonstiges: "💬 Sonstiges",
};

type Filter = "all" | "idee" | "fehler" | "lob" | "sonstiges";

/** Rückmeldungen aus der App – nach Art filtern, einzeln oder alle löschen. */
export function FeedbackSection({ pin }: { pin: string }) {
  const { busy, run } = useAction();
  const [rows, setRows] = useCachedState<FeedbackRow[] | null>("feedback", null);
  const [filter, setFilter] = useState<Filter>("all");
  const load = useCallback(async () => {
    const res = await run("load", () => fetchFeedback(pin));
    if (res) setRows(res.rows);
  }, [pin, run, setRows]);
  useLoadOnce("feedback", load);

  const count = (f: Filter) =>
    (rows ?? []).filter((r) => f === "all" || (r.category ?? "sonstiges") === f).length;
  const shown = useMemo(
    () => (rows ?? []).filter((r) => filter === "all" || (r.category ?? "sonstiges") === filter),
    [rows, filter],
  );

  return (
    <div className="space-y-3 text-[13.5px]">
      <div className="flex gap-2">
        <Segmented<Filter>
          size="sm"
          className="min-w-0 flex-1"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Alle", count: count("all") },
            { value: "fehler", label: "🐞", count: count("fehler") },
            { value: "idee", label: "💡", count: count("idee") },
            { value: "lob", label: "💚", count: count("lob") },
            { value: "sonstiges", label: "💬", count: count("sonstiges") },
          ]}
        />
        <button
          type="button"
          onClick={load}
          aria-label="Aktualisieren"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground"
        >
          <RefreshCw className={cn("h-4 w-4", busy === "load" && "animate-spin")} />
        </button>
      </div>

      {rows && shown.length === 0 && (
        <p className="rounded-xl bg-subtle p-3 text-muted-foreground">
          {rows.length === 0 ? "Noch kein Feedback." : "Hier gibt es nichts."}
        </p>
      )}
      <ul className="space-y-2">
        {shown.map((f, i) => (
          <li key={f.id ?? i} className="flex gap-2 rounded-2xl border border-border bg-card p-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <span className="rounded-md bg-subtle px-1.5 py-0.5 font-semibold text-foreground">
                  {CATEGORY_LABEL[f.category ?? "sonstiges"] ?? f.category}
                </span>
                {f.rating != null && (
                  <span>{f.rating > 0 ? "👍" : f.rating < 0 ? "👎" : "😐"}</span>
                )}
                <span>
                  {new Date(f.created_at).toLocaleString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {f.app_version && <span>· v{f.app_version}</span>}
              </div>
              <p className="whitespace-pre-wrap break-words">
                {f.message ?? <span className="text-muted-foreground">ohne Text</span>}
              </p>
            </div>
            {f.id != null && (
              <button
                type="button"
                aria-label="Feedback löschen"
                onClick={async () => {
                  if (await run(`fb-${f.id}`, () => deleteFeedback(pin, f.id!), "Gelöscht"))
                    await load();
                }}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {rows && rows.length > 0 && (
        <ConfirmButton
          variant="danger-outline"
          className="w-full"
          icon={<Trash2 />}
          busy={busy === "fb-all"}
          title="Alles Feedback löschen?"
          text="Alle Einträge werden endgültig gelöscht – nicht nur die gefilterten."
          confirm="Alle löschen"
          onConfirm={async () => {
            if (await run("fb-all", () => deleteFeedback(pin, "all"), "Feedback gelöscht"))
              await load();
          }}
        >
          Alles Feedback löschen
        </ConfirmButton>
      )}
    </div>
  );
}
