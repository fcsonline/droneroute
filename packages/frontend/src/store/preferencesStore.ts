import { create } from "zustand";
import type { UserPreferences } from "@droneroute/shared";
import { DEFAULT_USER_PREFERENCES } from "@droneroute/shared";
import { api } from "@/lib/api";

interface PreferencesState {
  preferences: UserPreferences;
  loaded: boolean;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (prefs: UserPreferences) => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  preferences: { ...DEFAULT_USER_PREFERENCES },
  loaded: false,

  fetchPreferences: async () => {
    try {
      const prefs = await api.get<UserPreferences>("/preferences");
      set({ preferences: prefs, loaded: true });
    } catch {
      // Use defaults if fetch fails (e.g. not logged in)
      set({ loaded: true });
    }
  },

  updatePreferences: async (prefs: UserPreferences) => {
    set({ preferences: prefs });
    try {
      await api.put("/preferences", prefs);
    } catch {
      // Silently fail — preferences are still updated locally
    }
  },
}));
