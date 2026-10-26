import { useCallback, useEffect, useRef } from "react";
import { create } from "zustand";
import { usePinStore } from "./pin";

/**
 * Daten der Bereiche – außerhalb der Seiten gespeichert. Ein Bereich lädt nur
 * beim ersten Öffnen; beim Zurückwechseln ist alles sofort wieder da. Neu
 * geladen wird nur über den Aktualisieren-Knopf (oder nach eigenen Änderungen).
 * Ausdrücklicher Wunsch des Betreibers. Beim Sperren wird alles vergessen.
 */
type Cache = { values: Record<string, unknown>; loaded: Record<string, true> };
const useCache = create<Cache>(() => ({ values: {}, loaded: {} }));

usePinStore.subscribe((s, prev) => {
  if (prev.pin && !s.pin) useCache.setState({ values: {}, loaded: {} });
});

/** Wie `useState`, aber der Wert bleibt über Seitenwechsel erhalten (Schlüssel = `key`). */
export function useCachedState<T>(
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  // Fester Startwert – sonst sähe der Speicher bei jedem Zeichnen einen neuen Wert.
  const start = useRef(initial).current;
  const value = useCache((s) => (key in s.values ? (s.values[key] as T) : start));
  const set = useCallback(
    (next: T | ((prev: T) => T)) =>
      useCache.setState((s) => {
        const prev = (key in s.values ? s.values[key] : start) as T;
        const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        return { values: { ...s.values, [key]: v } };
      }),
    [key, start],
  );
  return [value, set];
}

/** Lädt nur, wenn `key` seit dem Entsperren noch nie geladen wurde. */
export function useLoadOnce(key: string, load: () => unknown) {
  useEffect(() => {
    if (useCache.getState().loaded[key]) return;
    useCache.setState((s) => ({ loaded: { ...s.loaded, [key]: true } }));
    void load();
  }, [key, load]);
}
