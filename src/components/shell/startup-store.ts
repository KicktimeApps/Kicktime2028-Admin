import { create } from "zustand";
import { usePinStore } from "@/lib/pin";

/** Ob nach dem Entsperren schon vorgeladen wurde – beim Sperren wieder zurück. */
export const useStartup = create<{ ready: boolean }>(() => ({ ready: false }));
usePinStore.subscribe((s, prev) => {
  if (prev.pin && !s.pin) useStartup.setState({ ready: false });
});
