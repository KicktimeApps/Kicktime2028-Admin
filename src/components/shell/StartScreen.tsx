import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { TOURNAMENT } from "@/tournament/config";
import { preloadAll } from "./preload";
import { useStartup } from "./startup-store";

/** Mindestens so lange zeigen (Logo fertig animiert), höchstens so lange warten. */
const MIN_MS = 900;
const MAX_MS = 20_000;

/**
 * Ladebildschirm nach dem Entsperren (wie die Öffnungsanimation der KickTime-App):
 * lädt die Daten aller Bereiche auf einmal, danach ist jede Seite sofort da.
 * Erst nach PIN bzw. Face ID – vorher gibt der Server nichts heraus.
 * Dauert es zu lange, geht es nach 20 s trotzdem weiter (der Rest lädt nach).
 */
export function StartScreen({ pin }: { pin: string }) {
  const [progress, setProgress] = useState({ done: 0, total: 1 });
  useEffect(() => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      useStartup.setState({ ready: true });
    };
    const start = Date.now();
    void preloadAll(pin, (done, total) => setProgress({ done, total })).finally(() =>
      window.setTimeout(finish, Math.max(0, MIN_MS - (Date.now() - start))),
    );
    const giveUp = window.setTimeout(finish, MAX_MS);
    return () => window.clearTimeout(giveUp);
  }, [pin]);

  const share = progress.done / progress.total;
  return (
    <motion.div
      key="start"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-background"
      role="status"
      aria-label="Daten werden geladen"
    >
      <div className="relative flex items-center justify-center">
        <div className="splash-aura absolute h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
        <div className="splash-aura splash-aura-2 absolute h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <img
          src="/logo.svg"
          alt=""
          className="splash-logo relative h-28 w-28"
          style={{
            filter: "drop-shadow(0 0 24px color-mix(in oklab, var(--primary) 55%, transparent))",
          }}
        />
      </div>

      <div className="splash-text mt-10 flex flex-col items-center">
        <div className="font-display text-4xl font-bold uppercase tracking-[0.25em]">
          Kick<span className="text-primary">Time</span>
        </div>
        <div className="mt-2 text-sm tracking-[0.5em] text-muted-foreground">
          TEAM · {TOURNAMENT.short} {TOURNAMENT.year}
        </div>
      </div>

      <div className="absolute bottom-20 left-1/2 flex w-[60%] max-w-xs -translate-x-1/2 flex-col items-center gap-3">
        <div className="h-px w-full overflow-hidden rounded-full bg-primary/15">
          <div
            className="h-full bg-primary transition-[width] duration-300 ease-out"
            style={{
              width: `${Math.max(4, share * 100)}%`,
              boxShadow: "0 0 8px color-mix(in oklab, var(--primary) 60%, transparent)",
            }}
          />
        </div>
        <div className="text-[12px] tabular text-muted-foreground">
          Lade Daten … {progress.done}/{progress.total}
        </div>
      </div>
    </motion.div>
  );
}
