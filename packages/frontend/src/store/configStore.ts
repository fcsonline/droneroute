import { create } from "zustand";
import { api } from "@/lib/api";

interface ConfigState {
  selfHosted: boolean;
  googleClientId: string | null;
  loaded: boolean;
  fetchConfig: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  selfHosted: true,
  googleClientId: null,
  loaded: false,

  fetchConfig: async () => {
    try {
      const res = await api.get<{
        selfHosted: boolean;
        googleClientId?: string;
      }>("/config");
      set({
        selfHosted: res.selfHosted,
        googleClientId: res.googleClientId ?? null,
        loaded: true,
      });
    } catch {
      // Fallback to self-hosted if config endpoint fails
      set({ selfHosted: true, googleClientId: null, loaded: true });
    }
  },
}));
