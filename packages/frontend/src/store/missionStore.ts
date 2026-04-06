import { create } from "zustand";
import type { Waypoint, MissionConfig, WaypointAction, PointOfInterest } from "@droneroute/shared";
import { DEFAULT_MISSION_CONFIG, DEFAULT_WAYPOINT } from "@droneroute/shared";

interface MissionState {
  // Mission metadata
  missionId: string | null;
  missionName: string;

  // Config
  config: MissionConfig;

  // Waypoints
  waypoints: Waypoint[];
  selectedWaypointIndex: number | null;

  // POIs
  pois: PointOfInterest[];
  selectedPoiId: string | null;

  // UI state
  isAddingWaypoint: boolean;
  isAddingPoi: boolean;
  currentPage: "editor" | "routes";
  setCurrentPage: (page: "editor" | "routes") => void;

  // Waypoint actions
  setMissionName: (name: string) => void;
  setMissionId: (id: string | null) => void;
  setConfig: (config: Partial<MissionConfig>) => void;
  addWaypoint: (lat: number, lng: number) => void;
  updateWaypoint: (index: number, updates: Partial<Waypoint>) => void;
  removeWaypoint: (index: number) => void;
  moveWaypoint: (index: number, lat: number, lng: number) => void;
  selectWaypoint: (index: number | null) => void;
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

  // Mission actions
  loadMission: (data: {
    id?: string;
    name: string;
    config: MissionConfig;
    waypoints: Waypoint[];
    pois?: PointOfInterest[];
  }) => void;
  clearMission: () => void;
}

export const useMissionStore = create<MissionState>((set, get) => ({
  missionId: null,
  missionName: "New Mission",
  config: { ...DEFAULT_MISSION_CONFIG },
  waypoints: [],
  selectedWaypointIndex: null,
  pois: [],
  selectedPoiId: null,
  isAddingWaypoint: true,
  isAddingPoi: false,
  currentPage: "editor",
  setCurrentPage: (page) => set({ currentPage: page }),

  setMissionName: (name) => set({ missionName: name }),
  setMissionId: (id) => set({ missionId: id }),

  setConfig: (updates) =>
    set((state) => ({
      config: { ...state.config, ...updates },
    })),

  addWaypoint: (lat, lng) =>
    set((state) => {
      const index = state.waypoints.length;
      const newWaypoint: Waypoint = {
        ...DEFAULT_WAYPOINT,
        index,
        name: `WP ${index + 1}`,
        latitude: lat,
        longitude: lng,
        actions: [],
      };
      return {
        waypoints: [...state.waypoints, newWaypoint],
        selectedWaypointIndex: index,
      };
    }),

  updateWaypoint: (index, updates) =>
    set((state) => ({
      waypoints: state.waypoints.map((wp) =>
        wp.index === index ? { ...wp, ...updates } : wp
      ),
    })),

  removeWaypoint: (index) =>
    set((state) => {
      const filtered = state.waypoints
        .filter((wp) => wp.index !== index)
        .map((wp, i) => ({ ...wp, index: i }));
      return {
        waypoints: filtered,
        selectedWaypointIndex:
          state.selectedWaypointIndex === index
            ? null
            : state.selectedWaypointIndex !== null &&
                state.selectedWaypointIndex > index
              ? state.selectedWaypointIndex - 1
              : state.selectedWaypointIndex,
      };
    }),

  moveWaypoint: (index, lat, lng) =>
    set((state) => ({
      waypoints: state.waypoints.map((wp) =>
        wp.index === index ? { ...wp, latitude: lat, longitude: lng } : wp
      ),
    })),

  selectWaypoint: (index) => set({ selectedWaypointIndex: index }),

  reorderWaypoints: (fromIndex, toIndex) =>
    set((state) => {
      const items = [...state.waypoints];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      // Re-index after reorder
      const reindexed = items.map((wp, i) => ({ ...wp, index: i }));
      return {
        waypoints: reindexed,
        selectedWaypointIndex:
          state.selectedWaypointIndex === fromIndex
            ? toIndex
            : state.selectedWaypointIndex,
      };
    }),

  setIsAddingWaypoint: (adding) =>
    set((state) => ({ isAddingWaypoint: adding, isAddingPoi: adding ? false : state.isAddingPoi })),

  addAction: (waypointIndex, action) =>
    set((state) => ({
      waypoints: state.waypoints.map((wp) =>
        wp.index === waypointIndex
          ? { ...wp, actions: [...wp.actions, action] }
          : wp
      ),
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
      };
    }),

  updatePoi: (id, updates) =>
    set((state) => ({
      pois: state.pois.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),

  removePoi: (id) =>
    set((state) => ({
      pois: state.pois.filter((p) => p.id !== id),
      selectedPoiId: state.selectedPoiId === id ? null : state.selectedPoiId,
      // Clear poiId references on waypoints
      waypoints: state.waypoints.map((wp) =>
        wp.poiId === id ? { ...wp, poiId: undefined } : wp
      ),
    })),

  movePoi: (id, lat, lng) =>
    set((state) => ({
      pois: state.pois.map((p) =>
        p.id === id ? { ...p, latitude: lat, longitude: lng } : p
      ),
    })),

  selectPoi: (id) => set({ selectedPoiId: id }),

  setIsAddingPoi: (adding) =>
    set((state) => ({ isAddingPoi: adding, isAddingWaypoint: adding ? false : state.isAddingWaypoint })),

  loadMission: (data) =>
    set({
      missionId: data.id || null,
      missionName: data.name,
      config: data.config,
      waypoints: data.waypoints,
      pois: data.pois || [],
      selectedWaypointIndex: null,
      selectedPoiId: null,
    }),

  clearMission: () =>
    set({
      missionId: null,
      missionName: "New Mission",
      config: { ...DEFAULT_MISSION_CONFIG },
      waypoints: [],
      pois: [],
      selectedWaypointIndex: null,
      selectedPoiId: null,
    }),
}));
