import { Link } from "@tanstack/react-router";
import { Ban, Crown, Search, ShieldBan, Trophy, Undo2, UserMinus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  banGlobal,
  findPerson,
  removeMember,
  unbanGlobal,
  unbanMember,
  type PersonHit,
  type PersonMembership,
} from "@/services/admin";
import { useCachedState } from "@/lib/page-cache";
import { ActionButton, ConfirmButton } from "./shared";
import { fmtTime, useAction } from "./use-action";

const BAN_LABEL = {
  owner: "vom Ersteller gesperrt",
  admin: "vom Team gesperrt",
  global: "überall gesperrt",
} as const;

const STATUS_LABEL = { open: "offen", accepted: "angenommen", rejected: "abgelehnt" } as const;

/**
 * Personensuche über alle Tipprunden. Eine Person = ein Gerät: alle Runden,
 * in denen es mitspielt (auch unter anderem Namen), Sperren und Anträge.
 */
export function PersonsSection({ pin }: { pin: string }) {
  const { busy, run } = useAction();
  const [query, setQuery] = useCachedState("persons.query", "");
  const [hits, setHits] = useCachedState<PersonHit[] | null>("persons.hits", null);
  const [searched, setSearched] = useCachedState("persons.searched", "");
  const latest = useRef("");

  const search = useCallback(
    async (q: string) => {
      latest.current = q;
      if (q.trim().length < 2) {
        setHits(null);
        return;
      }
      const res = await run("search", () => findPerson(pin, q.trim()));
      // Nur die Antwort auf die letzte Eingabe zählt.
      if (res && latest.current === q) {
        setHits(res.data ?? []);
        setSearched(q.trim());
      }
    },
    [pin, run, setHits, setSearched],
  );

  // Beim Tippen kurz warten, dann suchen – nicht erneut, wenn die Suche beim
  // Zurückwechseln schon da ist.
  useEffect(() => {
    if (hits && query.trim() === searched) return;
    const t = window.setTimeout(() => void search(query), 400);
    return () => window.clearTimeout(t);
  }, [query, search, hits, searched]);

  return (
    <div className="space-y-3 text-[13.5px]">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 60))}
          placeholder="Name eingeben (mind. 2 Zeichen) …"
          aria-label="Name suchen"
          className="h-11 w-full rounded-xl border border-border bg-subtle pl-9 pr-3 text-[15px] outline-none focus:border-primary"
        />
      </label>

      {hits && hits.length === 0 && (
        <p className="rounded-xl bg-subtle p-3 text-muted-foreground">
          Niemand mit „{searched}“ gefunden.
        </p>
      )}
      {hits && hits.length > 0 && (
        <p className="text-[12px] text-muted-foreground">
          {hits.length === 25 ? "Mindestens 25" : hits.length}{" "}
          {hits.length === 1 ? "Person" : "Personen"} – jede Karte ist ein Gerät.
        </p>
      )}

      <ul className="space-y-3">
        {hits?.map((p) => (
          <PersonCard
            key={p.device}
            person={p}
            busy={busy}
            run={run}
            pin={pin}
            onChanged={() => search(query)}
          />
        ))}
      </ul>
    </div>
  );
}

function PersonCard({
  person: p,
  busy,
  run,
  pin,
  onChanged,
}: {
  person: PersonHit;
  busy: string | null;
  run: ReturnType<typeof useAction>["run"];
  pin: string;
  onChanged: () => void;
}) {
  const names = [...new Set(p.memberships.map((m) => m.name))];
  const title = names[0] ?? p.ban?.label ?? "Unbekannt";
  const act = async (key: string, fn: () => ReturnType<typeof removeMember>, msg: string) => {
    if (await run(key, fn, msg)) onChanged();
  };
  // „Überall sperren“ braucht eine Mitgliedschaft, über die der Server das Gerät findet.
  const any = p.memberships[0];

  return (
    <li className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-semibold">{title}</div>
          {names.length > 1 && (
            <div className="text-[12px] text-muted-foreground">
              auch: {names.slice(1).join(", ")}
            </div>
          )}
          <div className="text-[12px] text-muted-foreground">
            {p.memberships.length} {p.memberships.length === 1 ? "Runde" : "Runden"}
            {p.requests.length > 0 &&
              ` · ${p.requests.length} ${p.requests.length === 1 ? "Antrag" : "Anträge"}`}
          </div>
        </div>
        {p.ban && (
          <span className="shrink-0 rounded-full bg-destructive/15 px-2 py-0.5 text-[11.5px] font-semibold text-destructive">
            überall gesperrt
          </span>
        )}
      </div>

      {p.ban && (
        <div className="rounded-xl bg-destructive/10 px-3 py-2 text-[12.5px]">
          Seit {fmtTime(p.ban.createdAt)} überall gesperrt
          {p.ban.reason && ` · Grund: ${p.ban.reason}`}
        </div>
      )}

      {p.memberships.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {p.memberships.map((m) => (
            <MembershipRow
              key={m.groupId}
              m={m}
              busy={busy}
              onRemove={(ban) =>
                act(
                  `${ban ? "ban" : "rm"}-${m.memberId}`,
                  () => removeMember(pin, m.groupId, m.memberId, ban),
                  ban ? `${m.name} gesperrt` : `${m.name} entfernt`,
                )
              }
              onUnban={() =>
                act(
                  `unban-${m.memberId}`,
                  () => unbanMember(pin, m.groupId, m.memberId),
                  `${m.name} entsperrt`,
                )
              }
              globallyBanned={!!p.ban}
            />
          ))}
        </ul>
      )}

      {p.requests.length > 0 && (
        <div>
          <div className="mb-1 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Entsperrungsanträge
          </div>
          <ul className="space-y-1">
            {p.requests.slice(0, 5).map((r) => (
              <li key={r.id} className="text-[12.5px]">
                <span className="font-medium">{STATUS_LABEL[r.status]}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {r.scope === "global" ? "überall" : `„${r.groupName ?? "?"}“`} ·{" "}
                  {fmtTime(r.createdAt)}
                  {r.message && ` · „${r.message}“`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {p.ban ? (
          <ConfirmButton
            variant="outline"
            icon={<Undo2 />}
            busy={busy === `gunban-${p.device}`}
            title="Überall entsperren?"
            text="Die Person kommt mit ihren Tipps in ihre bisherigen Runden zurück und kann wieder Runden erstellen und beitreten."
            confirm="Entsperren"
            onConfirm={() =>
              void act(
                `gunban-${p.device}`,
                () => unbanGlobal(pin, { device: p.device }),
                "Überall entsperrt",
              )
            }
          >
            Überall entsperren
          </ConfirmButton>
        ) : (
          any && (
            <ConfirmButton
              icon={<ShieldBan />}
              variant="danger-outline"
              busy={busy === `gban-${p.device}`}
              title={`${title} überall sperren?`}
              text="Kann keiner Tipprunde mehr beitreten und keine erstellen. Fliegt aus allen Runden; leitet die Person eine Runde, übernimmt das älteste Mitglied. Die Tipps bleiben für ein Entsperren erhalten."
              confirm="Überall sperren"
              onConfirm={() =>
                void act(
                  `gban-${p.device}`,
                  () => banGlobal(pin, any.groupId, any.memberId, ""),
                  `${title} ist überall gesperrt`,
                )
              }
            >
              Überall sperren
            </ConfirmButton>
          )
        )}
      </div>
    </li>
  );
}

function MembershipRow({
  m,
  busy,
  onRemove,
  onUnban,
  globallyBanned,
}: {
  m: PersonMembership;
  busy: string | null;
  onRemove: (ban: boolean) => void;
  onUnban: () => void;
  globallyBanned: boolean;
}) {
  const small =
    "h-8 rounded-lg bg-background px-2.5 text-[12.5px] font-medium [&_svg]:h-3.5 [&_svg]:w-3.5";
  return (
    <li className={cn("space-y-1.5 px-3 py-2.5", m.banned && "bg-muted/40")}>
      <div className="flex items-center gap-2">
        {m.owner && <Crown className="h-3.5 w-3.5 shrink-0 text-gold" aria-label="Ersteller" />}
        <span className="min-w-0 flex-1 truncate font-medium">
          {m.groupName}
          <span className="font-normal text-muted-foreground"> · {m.name}</span>
        </span>
        <Link
          to="/tipprunden/$groupId"
          params={{ groupId: m.groupId }}
          aria-label={`Tabelle von ${m.groupName}`}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-primary"
        >
          <Trophy className="h-4 w-4" />
        </Link>
      </div>
      <div className="text-[12px] text-muted-foreground">
        <span className="font-mono">{m.code}</span> ·{" "}
        {m.banned
          ? BAN_LABEL[m.bannedBy ?? "owner"]
          : !m.approved
            ? "Anfrage offen"
            : `${m.tips} Tipps`}{" "}
        · seit {fmtTime(m.joinedAt)}
      </div>
      {/* Überall Gesperrte nur über „Überall entsperren“ zurückholen. */}
      {!globallyBanned && (
        <div className="flex flex-wrap gap-1.5">
          {m.banned ? (
            <ActionButton
              icon={<Undo2 />}
              busy={busy === `unban-${m.memberId}`}
              onClick={onUnban}
              className={small}
            >
              Entsperren
            </ActionButton>
          ) : (
            <>
              <ActionButton
                icon={<UserMinus />}
                busy={busy === `rm-${m.memberId}`}
                onClick={() => onRemove(false)}
                className={small}
              >
                Entfernen
              </ActionButton>
              <ActionButton
                icon={<Ban />}
                variant="danger-outline"
                busy={busy === `ban-${m.memberId}`}
                onClick={() => onRemove(true)}
                className={small}
              >
                In der Runde sperren
              </ActionButton>
            </>
          )}
        </div>
      )}
    </li>
  );
}
