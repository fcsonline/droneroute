import { create } from "zustand";
import type { Waypoint, MissionConfig, WaypointAction, PointOfInterest } from "@droneroute/shared";
import { DEFAULT_MISSION_CONFIG, DEFAULT_WAYPOINT } from "@droneroute/shared";
import type { TemplateType } from "@/lib/templates";

export type SelectionMode = "replace" | "toggle" | "range";

interface MissionState {
  // Mission metadata
  missionId: string | null;
  missionName: string;
  dirty: boolean;

  // Config
  config: MissionConfig;

  // Waypoints
  waypoints: Waypoint[];
  selectedWaypointIndices: Set<number>;
  lastSelectedWaypointIndex: number | null;

  // POIs
  pois: PointOfInterest[];
  selectedPoiId: string | null;

  // UI state
  isAddingWaypoint: boolean;
  isAddingPoi: boolean;
  templateMode: TemplateType | null;
  currentPage: "editor" | "routes" | "shared";
  shareToken: string | null;
  setCurrentPage: (page: "editor" | "routes" | "shared") => void;
  setShareToken: (token: string | null) => void;

  // Waypoint actions
  setMissionName: (name: string) => void;
  setMissionId: (id: string | null) => void;
  setConfig: (config: Partial<MissionConfig>) => void;
  addWaypoint: (lat: number, lng: number) => void;
  updateWaypoint: (index: number, updates: Partial<Waypoint>) => void;
  removeWaypoint: (index: number) => void;
  moveWaypoint: (index: number, lat: number, lng: number) => void;
  selectWaypoint: (index: number | null, mode?: SelectionMode) => void;
  selectAllWaypoints: () => void;
  clearWaypointSelection: () => void;
  removeSelectedWaypoints: () => void;
  updateSelectedWaypoints: (updates: Partial<Waypoint>) => void;
  reorderWaypoints: (fromIndex: number, toIndex: number) => void;
  setIsAddingWaypoint: (adding: boolean) => void;
  addAction: (waypointIndex: number, action: WaypointAction) => void;
  updateAction: (waypointIndex: number, actionId: number, updates: Partial<WaypointAction>) => void;
  removeAction: (waypointIndex: number, actionId: number) => void;

  // POI actions
  addPoi: (lat: number, lng: number) => void;
  updatePoi: (id: string, updates: Partial<PointOfInterest>) => void;
  removePoi: (id: string) => void;
  movePoi: (id: string, lat: number, lng: number) => void;
  selectPoi: (id: string | null) => void;
  setIsAddingPoi: (adding: boolean) => void;
  setTemplateMode: (mode: TemplateType | null) => void;
  appendWaypoints: (waypoints: Omit<Waypoint, "index" | "name">[], pois?: Omit<PointOfInterest, "id">[]) => void;

  // Mission actions
  loadMission: (data: {
    id?: string;
    name: string;
    config: MissionConfig;
    waypoints: Waypoint[];
    pois?: PointOfInterest[];
  }) => void;
  clearMission: () => void;
  setDirty: (dirty: boolean) => void;
}

export const useMissionStore = create<MissionState>((set, get) => ({
  missionId: null,
  missionName: "New Mission",
  dirty: false,
  config: { ...DEFAULT_MISSION_CONFIG },
  waypoints: [],
  selectedWaypointIndices: new Set<number>(),
  lastSelectedWaypointIndex: null,
  pois: [],
  selectedPoiId: null,
  isAddingWaypoint: true,
  isAddingPoi: false,
  templateMode: null,
  currentPage: "editor",
  shareToken: null,
  setCurrentPage: (page) => set({ currentPage: page }),
  setShareToken: (token) => set({ shareToken: token }),

  setMissionName: (name) => set({ missionName: name, dirty: true }),
  setMissionId: (id) => set({ missionId: id }),

  setConfig: (updates) =>
    set((state) => ({
      config: { ...state.config, ...updates },
      dirty: true,
    })),

  addWaypoint: (lat, lng) =>
    set((state) => {
      const index = state.waypoints.length;
      const newWaypoint: Waypoint = {
        ...DEFAULT_WAYPOINT,
        index,
        name: `Waypoint ${index + 1}`,
        latitude: lat,
        longitude: lng,
        actions: [],
      };
      return {
        waypoints: [...state.waypoints, newWaypoint],
        selectedWaypointIndices: new Set([index]),
        lastSelectedWaypointIndex: index,
        dirty: true,
      };
    }),

  updateWaypoint: (index, updates) =>
    set((state) => ({
      waypoints: state.waypoints.map((wp) =>
        wp.index === index ? { ...wp, ...updates } : wp
      ),
      dirty: true,
    })),

  removeWaypoint: (index) =>
    set((state) => {
      const filtered = state.waypoints
        .filter((wp) => wp.index !== index)
        .map((wp, i) => ({ ...wp, index: i }));

      // Rebuild selection: remove the deleted index, adjust indices above it
      const newSelection = new Set<number>();
      for (const idx of state.selectedWaypointIndices) {
        if (idx === index) continue;
        newSelection.add(idx > index ? idx - 1 : idx);
      }

      return {
        waypoints: filtered,
        selectedWaypointIndices: newSelection,
        lastSelectedWaypointIndex:
          state.lastSelectedWaypointIndex === index
            ? null
            : state.lastSelectedWaypointIndex !== null && state.lastSelectedWaypointIndex > index
              ? state.lastSelectedWaypointIndex - 1
              : state.lastSelectedWaypointIndex,
        dirty: true,
      };
    }),

  moveWaypoint: (index, lat, lng) =>
    set((state) => ({
      waypoints: state.waypoints.map((wp) =>
        wp.index === index ? { ...wp, latitude: lat, longitude: lng } : wp
      ),
      dirty: true,
    })),

  selectWaypoint: (index, mode = "replace") =>
    set((state) => {
      if (index === null) {
        return {
          selectedWaypointIndices: new Set<number>(),
          lastSelectedWaypointIndex: null,
        };
      }

      switch (mode) {
        case "replace":
          return {
            selectedWaypointIndices: new Set([index]),
            lastSelectedWaypointIndex: index,
          };

        case "toggle": {
          const next = new Set(state.selectedWaypointIndices);
          if (next.has(index)) {
            next.delete(index);
          } else {
            next.add(index);
          }
          return {
            selectedWaypointIndices: next,
            lastSelectedWaypointIndex: next.size > 0 ? index : null,
          };
        }

        case "range": {
          const anchor = state.lastSelectedWaypointIndex;
          if (anchor === null) {
            return {
              selectedWaypointIndices: new Set([index]),
              lastSelectedWaypointIndex: index,
            };
          }
          const start = Math.min(anchor, index);
          const end = Math.max(anchor, index);
          const rangeSet = new Set(state.selectedWaypointIndices);
          for (let i = start; i <= end; i++) {
            rangeSet.add(i);
          }
          return {
            selectedWaypointIndices: rangeSet,
            // Keep the anchor so subsequent Shift+clicks extend from the same origin
            lastSelectedWaypointIndex: anchor,
          };
        }
      }
    }),

  selectAllWaypoints: () =>
    set((state) => ({
      selectedWaypointIndices: new Set(state.waypoints.map((wp) => wp.index)),
      lastSelectedWaypointIndex: state.waypoints.length > 0 ? 0 : null,
    })),

  clearWaypointSelection: () =>
    set({
      selectedWaypointIndices: new Set<number>(),
      lastSelectedWaypointIndex: null,
    }),

  removeSelectedWaypoints: () =>
    set((state) => {
      if (state.selectedWaypointIndices.size === 0) return state;
      const filtered = state.waypoints
        .filter((wp) => !state.selectedWaypointIndices.has(wp.index))
        .map((wp, i) => ({ ...wp, index: i }));
      return {
        waypoints: filtered,
        selectedWaypointIndices: new Set<number>(),
        lastSelectedWaypointIndex: null,
        dirty: true,
      };
    }),

  updateSelectedWaypoints: (updates) =>
    set((state) => ({
      waypoints: state.waypoints.map((wp) =>
        state.selectedWaypointIndices.has(wp.index) ? { ...wp, ...updates } : wp
      ),
      dirty: true,
    })),

  reorderWaypoints: (fromIndex, toIndex) =>
    set((state) => {
      const items = [...state.waypoints];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      // Re-index after reorder
      const reindexed = items.map((wp, i) => ({ ...wp, index: i }));
      return {
        waypoints: reindexed,
        selectedWaypointIndices: new Set([toIndex]),
        lastSelectedWaypointIndex: toIndex,
        dirty: true,
      };
    }),

  setIsAddingWaypoint: (adding) =>
    set((state) => ({ isAddingWaypoint: adding, isAddingPoi: adding ? false : state.isAddingPoi, templateMode: adding ? null : state.templateMode })),

  addAction: (waypointIndex, action) =>
    set((state) => ({
      waypoints: state.waypoints.map((wp) =>
        wp.index === waypointIndex
          ? { ...wp, actions: [...wp.actions, action] }
          : wp
      ),
      dirty: true,
    })),

  updateAction: (waypointIndex, actionId, updates) =>
    set((state) => ({
      waypoints: state.waypoints.map((wp) =>
        wp.index === waypointIndex
          ? {
              ...wp,
              actions: wp.actions.map((a) =>
                a.actionId === actionId ? { ...a, ...updates } : a
              ),
            }
          : wp
      ),
      dirty: true,
    })),

  removeAction: (waypointIndex, actionId) =>
    set((state) => ({
      waypoints: state.waypoints.map((wp) =>
        wp.index === waypointIndex
          ? {
              ...wp,
              actions: wp.actions.filter((a) => a.actionId !== actionId),
            }
          : wp
      ),
      dirty: true,
    })),

  // POI actions
  addPoi: (lat, lng) =>
    set((state) => {
      const poi: PointOfInterest = {
        id: crypto.randomUUID(),
        name: `POI ${state.pois.length + 1}`,
        latitude: lat,
        longitude: lng,
        height: 0,
      };
      return {
        pois: [...state.pois, poi],
        selectedPoiId: poi.id,
        dirty: true,
      };
    }),

  updatePoi: (id, updates) =>
    set((state) => ({
      pois: state.pois.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      dirty: true,
    })),

  removePoi: (id) =>
    set((state) => ({
      pois: state.pois.filter((p) => p.id !== id),
      selectedPoiId: state.selectedPoiId === id ? null : state.selectedPoiId,
      // Clear poiId references on waypoints
      waypoints: state.waypoints.map((wp) =>
        wp.poiId === id ? { ...wp, poiId: undefined } : wp
      ),
      dirty: true,
    })),

  movePoi: (id, lat, lng) =>
    set((state) => ({
      pois: state.pois.map((p) =>
        p.id === id ? { ...p, latitude: lat, longitude: lng } : p
      ),
      dirty: true,
    })),

  selectPoi: (id) => set({ selectedPoiId: id }),

  setIsAddingPoi: (adding) =>
    set((state) => ({ isAddingPoi: adding, isAddingWaypoint: adding ? false : state.isAddingWaypoint, templateMode: adding ? null : state.templateMode })),

  setTemplateMode: (mode) =>
    set({ templateMode: mode, isAddingWaypoint: false, isAddingPoi: false, selectedWaypointIndices: new Set(), selectedPoiId: null }),

  appendWaypoints: (newWps, newPois) =>
    set((state) => {
      const startIndex = state.waypoints.length;
      const fullWaypoints: Waypoint[] = newWps.map((wp, i) => ({
        ...wp,
        index: startIndex + i,
        name: `Waypoint ${startIndex + i + 1}`,
      }));

      const fullPois: PointOfInterest[] = (newPois || []).map((p) => ({
        ...p,
        id: crypto.randomUUID(),
      }));

      // If orbit template created a POI, link the waypoints to it
      if (fullPois.length === 1) {
        const poiId = fullPois[0].id;
        for (const wp of fullWaypoints) {
          if (wp.headingMode === "fixed") {
            // Convert to towardPOI mode for orbit waypoints
            wp.headingMode = "towardPOI";
            wp.poiId = poiId;
          }
        }
      }

      return {
        waypoints: [...state.waypoints, ...fullWaypoints],
        pois: [...state.pois, ...fullPois],
        selectedWaypointIndices: new Set(fullWaypoints.map((wp) => wp.index)),
        lastSelectedWaypointIndex: fullWaypoints.length > 0 ? fullWaypoints[fullWaypoints.length - 1].index : state.lastSelectedWaypointIndex,
        templateMode: null,
        dirty: true,
      };
    }),

  loadMission: (data) =>
    set({
      missionId: data.id || null,
      missionName: data.name,
      config: data.config,
      waypoints: data.waypoints,
      pois: data.pois || [],
      selectedWaypointIndices: new Set<number>(),
      lastSelectedWaypointIndex: null,
      selectedPoiId: null,
      dirty: false,
    }),

  clearMission: () =>
    set({
      missionId: null,
      missionName: "New Mission",
      config: { ...DEFAULT_MISSION_CONFIG },
      waypoints: [],
      pois: [],
      selectedWaypointIndices: new Set<number>(),
      lastSelectedWaypointIndex: null,
      selectedPoiId: null,
      dirty: false,
    }),

  setDirty: (dirty) => set({ dirty }),
}));
