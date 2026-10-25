import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ThemeMode } from "@/lib/theme";

/** Einstellungen der Team-App – nur auf diesem Gerät, nie die PIN. */
type TeamState = {
  theme: ThemeMode;
  /** Mitteilungen auf diesem Gerät erlaubt und abonniert. */
  pushEnabled: boolean;
  setTheme: (t: ThemeMode) => void;
  setPushEnabled: (v: boolean) => void;
};

export const TEAM_STORE_KEY = "kicktime-2028-team";

export const useTeamStore = create<TeamState>()(
  persist(
    (set) => ({
      theme: "dark",
      pushEnabled: false,
      setTheme: (theme) => set({ theme }),
      setPushEnabled: (pushEnabled) => set({ pushEnabled }),
    }),
    { name: TEAM_STORE_KEY, storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
