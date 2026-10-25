import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  type ErrorComponentProps,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { PinScreen } from "@/components/shell/PinScreen";
import { TeamShell } from "@/components/shell/TeamShell";
import { Toaster } from "@/components/ui/sonner";
import { useBadgePolling } from "@/hooks/useBadges";
import { useLiveEngine } from "@/hooks/useLiveEngine";
import { useUpdateCheck } from "@/hooks/useUpdateCheck";
import { logError } from "@/lib/error-log";
import { useIdleLock, usePinStore } from "@/lib/pin";
import { installPressFeedback } from "@/lib/press-feedback";
import { applyTheme } from "@/lib/theme";
import { TEAM_STORE_KEY, useTeamStore } from "@/store/team-store";

import appCss from "../styles.css?url";

const TITLE = "KickTime-Team · EM 2028";

/** Dark/Light vor dem ersten Bild setzen (kein Aufblitzen). Standard: dunkel. */
const THEME_BOOT = `(function(){try{var s=JSON.parse(localStorage.getItem("${TEAM_STORE_KEY}")||"{}").state||{};var t=s.theme||"dark";if(t==="system"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}var r=document.documentElement;r.classList.remove("dark","light");r.classList.add(t)}catch(e){}})();`;

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="font-display text-7xl font-bold text-primary">404</div>
      <p className="mt-2 text-muted-foreground">Diesen Bereich gibt es nicht.</p>
      <Link
        to="/"
        className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Zur Übersicht
      </Link>
    </div>
  );
}

function ErrorView({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(
    () => logError("render", error instanceof Error ? error.message : String(error)),
    [error],
  );
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="font-display text-3xl font-bold uppercase">Fehler</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {error instanceof Error ? error.message : String(error)}
      </p>
      <button
        onClick={() => {
          router.invalidate();
          reset();
        }}
        className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Erneut versuchen
      </button>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: TITLE },
      { name: "robots", content: "noindex, nofollow" },
      { name: "theme-color", content: "#0b1122" },
      { name: "apple-mobile-web-app-title", content: "KT Team" },
      { name: "application-name", content: "KickTime-Team" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
    scripts: [{ children: THEME_BOOT }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorView,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/** Wartet, bis die Einstellungen aus localStorage geladen sind. */
function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const p = useTeamStore.persist;
    if (p.hasHydrated()) setHydrated(true);
    return p.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const hydrated = useHydrated();
  return (
    <QueryClientProvider client={queryClient}>
      {hydrated && <App />}
      <Toaster />
    </QueryClientProvider>
  );
}

function App() {
  const pin = usePinStore((s) => s.pin);
  const theme = useTeamStore((s) => s.theme);
  useEffect(() => {
    applyTheme(theme, "floodlight");
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const on = () => applyTheme("system", "floodlight");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [theme]);
  useLiveEngine();
  useIdleLock();
  useBadgePolling(pin);
  useUpdateCheck();
  useEffect(() => installPressFeedback(), []);
  useGlobalErrorLogging();

  if (!pin) return <PinScreen />;
  return (
    <TeamShell>
      <Outlet />
    </TeamShell>
  );
}

function useGlobalErrorLogging() {
  useEffect(() => {
    const onErr = (e: ErrorEvent) => logError("render", e.message || "Unbekannter Fehler");
    const onRej = (e: PromiseRejectionEvent) =>
      logError("system", e.reason instanceof Error ? e.reason.message : String(e.reason));
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);
}
