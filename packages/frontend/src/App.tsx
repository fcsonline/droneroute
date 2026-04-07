import { useState, useRef, useEffect } from "react";
import {
  Download,
  Upload,
  Save,
  Settings,
  MapPin,
  ChevronDown,
  ChevronRight,
  Crosshair,
  FolderOpen,
  Route,
  Clock,
  User,
  LogOut,
  Camera,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapView } from "@/components/map/MapView";
import { WaypointList } from "@/components/waypoint/WaypointList";
import { BulkActionToolbar } from "@/components/waypoint/BulkActionToolbar";
import { MissionConfig } from "@/components/mission/MissionConfig";
import { PoiList } from "@/components/mission/PoiList";
import { RoutesPage } from "@/components/routes/RoutesPage";
import { AuthModal } from "@/components/auth/AuthModal";
import { useMissionStore } from "@/store/missionStore";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";

type SidebarSection = "waypoints" | "pois" | "config";

export default function App() {
  const {
    missionName,
    setMissionName,
    missionId,
    setMissionId,
    config,
    waypoints,
    pois,
    loadMission,
    currentPage,
    setCurrentPage,
  } = useMissionStore();

  const [expandedSections, setExpandedSections] = useState<Record<SidebarSection, boolean>>({
    waypoints: true,
    pois: false,
    config: false,
  });

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { token, email: userEmail, logout, restore } = useAuthStore();

  // Restore auth session on mount
  useEffect(() => {
    restore();
  }, []);

  const toggleSection = (section: SidebarSection) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleExport = async () => {
    if (waypoints.length < 2) {
      alert("Need at least 2 waypoints to export");
      return;
    }

    setExporting(true);
    try {
      const blob = await api.post<Blob>("/kmz/generate", {
        name: missionName,
        config,
        waypoints,
        pois,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${missionName.replace(/[^a-zA-Z0-9_-]/g, "_")}.kmz`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleSave = async () => {
    if (!token) {
      setShowAuthModal(true);
      return;
    }
    setSaving(true);
    try {
      if (missionId) {
        await api.put(`/missions/${missionId}`, { name: missionName, config, waypoints, pois });
      } else {
        const result = await api.post<{ id: string }>("/missions", {
          name: missionName,
          config,
          waypoints,
          pois,
        });
        setMissionId(result.id);
      }
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await api.post<{ config: any; waypoints: any[]; pois?: any[] }>("/kmz/import", formData);
      loadMission({
        name: file.name.replace(/\.kmz$/i, ""),
        config: result.config,
        waypoints: result.waypoints,
        pois: result.pois,
      });
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs/selects
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const {
        setIsAddingWaypoint,
        setIsAddingPoi,
        clearWaypointSelection,
        removeSelectedWaypoints,
        selectAllWaypoints,
        selectedWaypointIndices,
      } = useMissionStore.getState();

      switch (e.key.toLowerCase()) {
        case "w":
          e.preventDefault();
          setIsAddingWaypoint(true);
          break;
        case "p":
          if (e.metaKey || e.ctrlKey) return; // don't intercept Cmd+P
          e.preventDefault();
          setIsAddingPoi(true);
          break;
        case "a":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            selectAllWaypoints();
          }
          break;
        case "escape":
          e.preventDefault();
          clearWaypointSelection();
          setIsAddingWaypoint(false);
          setIsAddingPoi(false);
          break;
        case "delete":
        case "backspace":
          if (selectedWaypointIndices.size > 0) {
            e.preventDefault();
            if (selectedWaypointIndices.size > 1) {
              if (confirm(`Delete ${selectedWaypointIndices.size} waypoints?`)) {
                removeSelectedWaypoints();
              }
            } else {
              removeSelectedWaypoints();
            }
          }
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Show routes page
  if (currentPage === "routes") {
    return (
      <>
        <RoutesPage onRequestAuth={() => setShowAuthModal(true)} />
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-80 flex flex-col border-r border-border bg-card shrink-0">
        {/* Header */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <img src="/favicon.svg" alt="DroneRoute" className="h-5 w-5" />
              <span className="font-bold text-sm">DroneRoute</span>
            </div>
            <div className="flex items-center gap-1">
              {token ? (
                <>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[100px]" title={userEmail || ""}>
                    {userEmail}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={logout}
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    title="Sign out"
                  >
                    <LogOut className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAuthModal(true)}
                  className="h-6 text-[10px] text-muted-foreground hover:text-foreground gap-1 px-1.5"
                >
                  <User className="h-3 w-3" />
                  Sign in
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage("routes")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="My Routes"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Input
            value={missionName}
            onChange={(e) => setMissionName(e.target.value)}
            className="h-8 text-xs font-medium"
            placeholder="Mission name"
          />
        </div>

        {/* Toolbar */}
        <div className="flex gap-1 p-2 border-b border-border">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="flex-1 text-xs h-7">
            <Save className="h-3 w-3" />
            {saving ? "..." : "Save"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || waypoints.length < 2} className="flex-1 text-xs h-7">
            <Download className="h-3 w-3" />
            {exporting ? "..." : "KMZ"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex-1 text-xs h-7">
            <Upload className="h-3 w-3" />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".kmz"
            className="hidden"
            onChange={handleImport}
          />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Waypoints section — BLUE accent */}
          <div className="border-l-2 border-blue-500/70">
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-blue-500/10 text-blue-400"
              onClick={() => toggleSection("waypoints")}
            >
              {expandedSections.waypoints ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <MapPin className="h-3 w-3" />
              Waypoints ({waypoints.length})
            </button>
            {expandedSections.waypoints && <WaypointList />}
          </div>

          {/* POIs section — AMBER/ORANGE accent */}
          <div className="border-l-2 border-amber-500/70">
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-amber-500/10 text-amber-400"
              onClick={() => toggleSection("pois")}
            >
              {expandedSections.pois ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Crosshair className="h-3 w-3" />
              Points of Interest ({pois.length})
            </button>
            {expandedSections.pois && <PoiList />}
          </div>

          {/* Mission Config section — PURPLE accent */}
          <div className="border-l-2 border-purple-500/70">
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-purple-500/10 text-purple-400"
              onClick={() => toggleSection("config")}
            >
              {expandedSections.config ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Settings className="h-3 w-3" />
              Mission Config
            </button>
            {expandedSections.config && <MissionConfig />}
          </div>
        </div>

        {/* Footer stats with colored icons */}
        <div className="px-3 py-2 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px]">
              <MapPin className="h-3 w-3 text-blue-400" />
              <span className="text-blue-300 font-medium">{waypoints.length}</span>
            </span>
            {pois.length > 0 && (
              <span className="flex items-center gap-1 text-[11px]">
                <Crosshair className="h-3 w-3 text-amber-400" />
                <span className="text-amber-300 font-medium">{pois.length}</span>
              </span>
            )}
            {(() => {
              const photoCount = waypoints.reduce((sum, wp) => sum + wp.actions.filter((a) => a.actionType === "takePhoto").length, 0);
              const videoCount = waypoints.reduce((sum, wp) => sum + wp.actions.filter((a) => a.actionType === "startRecord").length, 0);
              return (
                <>
                  {photoCount > 0 && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Camera className="h-3 w-3 text-sky-400" />
                      <span className="text-sky-300 font-medium">{photoCount}</span>
                    </span>
                  )}
                  {videoCount > 0 && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Video className="h-3 w-3 text-red-400" />
                      <span className="text-red-300 font-medium">{videoCount}</span>
                    </span>
                  )}
                </>
              );
            })()}
          </div>
          <div className="flex items-center gap-3">
            {waypoints.length >= 2
              ? (() => {
                  const { distance, time } = estimateFlightStats(waypoints, config.autoFlightSpeed);
                  return (
                    <>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Route className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-300 font-medium">
                          {distance >= 1000
                            ? `${(distance / 1000).toFixed(1)}km`
                            : `~${distance.toFixed(0)}m`}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="h-3 w-3 text-yellow-400" />
                        <span className="text-yellow-300 font-medium">{formatDuration(time)}</span>
                      </span>
                    </>
                  );
                })()
              : (
                <span className="text-[10px] text-muted-foreground">Add 2+ waypoints</span>
              )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapView />
        <BulkActionToolbar />
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}

// Haversine distance between two points (meters)
function haversine(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Estimate total distance (m) and flight time (s) using per-segment speeds
function estimateFlightStats(
  waypoints: { latitude: number; longitude: number; speed: number; useGlobalSpeed: boolean }[],
  globalSpeed: number
): { distance: number; time: number } {
  let distance = 0;
  let time = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const segDist = haversine(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    const speed = curr.useGlobalSpeed ? globalSpeed : curr.speed;
    distance += segDist;
    time += speed > 0 ? segDist / speed : 0;
  }
  return { distance, time };
}

// Format seconds into human-readable duration
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return `${mins}m${secs > 0 ? ` ${secs}s` : ""}`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h${remainMins > 0 ? ` ${remainMins}m` : ""}`;
}
