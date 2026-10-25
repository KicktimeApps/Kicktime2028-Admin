import { useEffect } from "react";
import { create } from "zustand";

/**
 * Die PIN bleibt nur im Arbeitsspeicher dieses Fensters – nie in localStorage
 * oder Cookies. Nach 30 Minuten ohne Bedienung sperrt sich die App wieder.
 */
export const IDLE_LOCK_MS = 30 * 60_000;

type PinState = {
  pin: string | null;
  lastActive: number;
  unlock: (pin: string) => void;
  lock: () => void;
  touch: () => void;
};

export const usePinStore = create<PinState>((set) => ({
  pin: null,
  lastActive: 0,
  unlock: (pin) => set({ pin, lastActive: Date.now() }),
  lock: () => set({ pin: null }),
  touch: () => set({ lastActive: Date.now() }),
}));

/** PIN im entsperrten Bereich (dort ist sie immer gesetzt). */
export function usePin(): string {
  return usePinStore((s) => s.pin) ?? "";
}

/** Bedienung merken und nach langer Pause sperren – auch nach dem Zurückkehren in die App. */
export function useIdleLock() {
  useEffect(() => {
    let lastTouch = 0;
    const touch = () => {
      // Höchstens alle 5 s speichern – sonst würde jede Mausbewegung neu zeichnen.
      if (Date.now() - lastTouch < 5_000) return;
      lastTouch = Date.now();
      usePinStore.getState().touch();
    };
    const check = () => {
      const s = usePinStore.getState();
      if (s.pin && Date.now() - s.lastActive > IDLE_LOCK_MS) s.lock();
    };
    const events = ["pointerdown", "keydown", "scroll"] as const;
    for (const e of events) window.addEventListener(e, touch, { passive: true });
    document.addEventListener("visibilitychange", check);
    const id = window.setInterval(check, 30_000);
    return () => {
      for (const e of events) window.removeEventListener(e, touch);
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(id);
    };
  }, []);
}
