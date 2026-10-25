import { Link, useRouterState } from "@tanstack/react-router";
import { Lock, MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/layout/Logo";
import { useBadges } from "@/hooks/useBadges";
import { usePinStore } from "@/lib/pin";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";
import { NAV, TABS, type NavItem } from "./nav";

/**
 * Rahmen der Team-App: am Computer Seitenleiste links, auf dem Handy unten
 * vier Reiter plus „Mehr“.
 */
export function TeamShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const lock = usePinStore((s) => s.lock);
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-card/60 px-3 py-5 lg:flex">
        <Brand className="px-2" />
        <nav aria-label="Bereiche" className="mt-6 flex-1 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <SideLink key={item.to} item={item} active={isActive(path, item.to)} />
          ))}
        </nav>
        <div className="space-y-2 border-t border-border px-2 pt-3">
          <button
            type="button"
            onClick={lock}
            className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-[13.5px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Lock className="h-4 w-4" /> Sperren
          </button>
          <div className="px-2 text-[11.5px] text-muted-foreground tabular">v{APP_VERSION}</div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/85 px-4 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md lg:hidden">
          <Brand />
          <button
            type="button"
            onClick={lock}
            aria-label="Sperren"
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          >
            <Lock className="h-[18px] w-[18px]" />
          </button>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 lg:px-8 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>

      <BottomTabs path={path} />
    </div>
  );
}

const isActive = (path: string, to: string) =>
  to === "/" ? path === "/" : path === to || path.startsWith(`${to}/`);

function Brand({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="h-8 w-8" />
      <span className="leading-none">
        <span className="block font-display text-[19px] font-bold uppercase tracking-tight">
          Kick<span className="text-primary">Time</span>
        </span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Team · EM 2028
        </span>
      </span>
    </Link>
  );
}

function Badge({ kind }: { kind?: NavItem["badge"] }) {
  const n = useBadges((s) => (kind ? s[kind] : 0));
  if (!n) return null;
  return (
    <span
      className={cn(
        "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold tabular",
        kind === "alerts"
          ? "bg-destructive text-destructive-foreground"
          : "bg-gold text-gold-foreground",
      )}
      aria-label={kind === "alerts" ? `${n} Probleme` : `${n} offen`}
    >
      {n}
    </span>
  );
}

function SideLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-3 rounded-lg px-2.5 text-[14px] font-medium transition-colors",
        active
          ? "bg-primary/12 text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className={cn("h-[18px] w-[18px]", active && "text-primary")} />
      <span className="flex-1">{item.label}</span>
      <Badge kind={item.badge} />
    </Link>
  );
}

function BottomTabs({ path }: { path: string }) {
  const tabs = NAV.filter((n) => TABS.includes(n.to));
  const moreActive = !tabs.some((t) => isActive(path, t.to));
  const moreBadge = useBadges((s) =>
    NAV.filter((n) => !TABS.includes(n.to) && n.badge).some((n) => s[n.badge!] > 0),
  );
  return (
    <nav
      aria-label="Bereiche"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {tabs.map((t) => (
          <TabLink key={t.to} to={t.to} label={t.label} icon={t.icon} active={isActive(path, t.to)}>
            <Badge kind={t.badge} />
          </TabLink>
        ))}
        <TabLink to="/mehr" label="Mehr" icon={MoreHorizontal} active={moreActive}>
          {moreBadge && <span className="h-2 w-2 rounded-full bg-gold" aria-hidden />}
        </TabLink>
      </div>
    </nav>
  );
}

function TabLink({
  to,
  label,
  icon: Icon,
  active,
  children,
}: {
  to: string;
  label: string;
  icon: NavItem["icon"];
  active: boolean;
  children?: ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="h-[22px] w-[22px]" />
      {label}
      <span className="absolute left-1/2 top-1.5 ml-2">{children}</span>
    </Link>
  );
}

/** Seitenkopf: Titel, kurze Erklärung, rechts optional Knöpfe. */
export function Page({
  title,
  text,
  action,
  wide,
  children,
}: {
  title: string;
  text?: ReactNode;
  action?: ReactNode;
  /** Volle Breite (Dashboard) statt schmaler Lesespalte. */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto space-y-4", !wide && "max-w-3xl")}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[28px] font-bold uppercase leading-tight tracking-tight">
            {title}
          </h1>
          {text && <p className="mt-0.5 text-[13.5px] text-muted-foreground">{text}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
