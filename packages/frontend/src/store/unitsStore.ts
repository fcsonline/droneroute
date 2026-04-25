import { create } from "zustand";
import type { UnitSystem } from "@/lib/units";

const LS_KEY = "droneroute_unit_system";

interface UnitsState {
  globalSystem: UnitSystem;
  setGlobalSystem: (sys: UnitSystem) => void;
}

export const useUnitsStore = create<UnitsState>((set) => ({
  globalSystem: (localStorage.getItem(LS_KEY) as UnitSystem | null) ?? "metric",

  setGlobalSystem: (sys) => {
    localStorage.setItem(LS_KEY, sys);
    set({ globalSystem: sys });
  },
}));

/** Returns the active unit system. */
export function useUnitSystem(): UnitSystem {
  return useUnitsStore((s) => s.globalSystem);
}
