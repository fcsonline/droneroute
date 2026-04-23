import { useState, useRef, useEffect, useMemo } from "react";
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
  TrendingUp,
  UserCog,
  CircleHelp,
  Triangle,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapView } from "@/components/map/MapView";
import { WaypointList } from "@/components/waypoint/WaypointList";
import { BulkActionToolbar } from "@/components/waypoint/BulkActionToolbar";
import { MissionConfig } from "@/components/mission/MissionConfig";
import { PoiList } from "@/components/mission/PoiList";
import { ObstacleList } from "@/components/mission/ObstacleList";
import { RoutesPage } from "@/components/routes/RoutesPage";
import { SharedMissionPage } from "@/components/routes/SharedMissionPage";
import { AdminPage } from "@/pages/AdminPage";
import { ElevationGraph } from "@/components/mission/ElevationGraph";
import { WarningsPanel } from "@/components/mission/WarningsPanel";
import type { Warning } from "@/components/mission/WarningsPanel";
import { AuthModal } from "@/components/auth/AuthModal";
import { AccountModal } from "@/components/auth/AccountModal";
import { AboutDialog } from "@/components/AboutDialog";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import { useMissionStore } from "@/store/missionStore";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { getObstacleWarnings } from "@/lib/geo";

type SidebarSection = "waypoints" | "pois" | "obstacles" | "config";

export default function App() {
  const {
    missionName,
    setMissionName,
    missionId,
    setMissionId,
    config,
    waypoints,
    pois,
    obstacles,
    loadMission,
    currentPage,
    setCurrentPage,
    shareToken,
    setShareToken,
    dirty,
    setDirty,
  } = useMissionStore();

  const [expandedSections, setExpandedSections] = useState<
    Record<SidebarSection, boolean>
  >({
    waypoints: true,
    pois: false,
    obstacles: false,
    config: false,
  });

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { token, email: userEmail, logout, restore, isAdmin } = useAuthStore();
  const [gravatarUrl, setGravatarUrl] = useState<string | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  // Restore auth session on mount
  useEffect(() => {
    restore();
  }, []);

  // Detect /shared/:token URL on mount
  useEffect(() => {
    const match = window.location.pathname.match(/^\/shared\/([^/]+)$/);
    if (match) {
      setShareToken(match[1]);
      setCurrentPage("shared");
    }
  }, []);

  // Warn before closing/navigating away with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (
        dirty &&
        (waypoints.length > 1 || pois.length > 0 || obstacles.length > 0)
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, waypoints.length, pois.length, obstacles.length]);

  // Obstacle warnings
  const obstacleWarnings = useMemo(
    () => getObstacleWarnings(waypoints, obstacles),
    [waypoints, obstacles],
  );

  // Compute flight stats for warnings
  const flightStats = useMemo(
    () =>
      waypoints.length >= 2
        ? estimateFlightStats(waypoints, config.autoFlightSpeed)
        : null,
    [waypoints, config.autoFlightSpeed],
  );

  // Aggregated warnings for overlay
  const warnings = useMemo(() => {
    const result: Warning[] = [];
    if (obstacles.length > 0 && obstacleWarnings.length > 0) {
      result.push({
        id: "obstacle",
        type: "obstacle",
        message: `${obstacleWarnings.length} obstacle warning${obstacleWarnings.length > 1 ? "s" : ""} — waypoints conflict with restricted zones`,
      });
    }
    if (flightStats && flightStats.time > config.maxBatteryMinutes * 60) {
      result.push({
        id: "battery",
        type: "battery",
        message: `Flight time (${formatDuration(flightStats.time)}) exceeds max battery (${config.maxBatteryMinutes}min)`,
      });
    }
    return result;
  }, [
    obstacleWarnings,
    obstacles.length,
    flightStats,
    config.maxBatteryMinutes,
  ]);

  // Compute Gravatar URL when email changes
  useEffect(() => {
    if (!userEmail) {
      setGravatarUrl(null);
      return;
    }
    const trimmed = userEmail.trim().toLowerCase();
    crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(trimmed))
      .then((buf) => {
        const hex = Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        setGravatarUrl(`https://www.gravatar.com/avatar/${hex}?s=64&d=mp`);
      });
  }, [userEmail]);

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
        await api.put(`/missions/${missionId}`, {
          name: missionName,
          config,
          waypoints,
          pois,
          obstacles,
        });
      } else {
        const result = await api.post<{ id: string }>("/missions", {
          name: missionName,
          config,
          waypoints,
          pois,
          obstacles,
        });
        setMissionId(result.id);
      }
      setDirty(false);
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
      const result = await api.post<{
        config: any;
        waypoints: any[];
        pois?: any[];
      }>("/kmz/import", formData);
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
      // Ignore when typing in inputs/selects (except Escape which should always work)
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        e.key !== "Escape" &&
        (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT")
      )
        return;

      const {
        setIsAddingWaypoint,
        setIsAddingPoi,
        setIsDrawingObstacle,
        setTemplateMode,
        clearWaypointSelection,
        removeSelectedWaypoints,
        selectAllWaypoints,
        selectedWaypointIndices,
        templateMode,
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
        case "o":
          if (e.metaKey || e.ctrlKey) return;
          e.preventDefault();
          setTemplateMode(templateMode === "orbit" ? null : "orbit");
          break;
        case "g":
          if (e.metaKey || e.ctrlKey) return;
          e.preventDefault();
          setTemplateMode(templateMode === "grid" ? null : "grid");
          break;
        case "f":
          if (e.metaKey || e.ctrlKey) return;
          e.preventDefault();
          setTemplateMode(templateMode === "facade" ? null : "facade");
          break;
        case "z":
          if (e.metaKey || e.ctrlKey) return; // don't intercept Cmd+Z (undo)
          e.preventDefault();
          setTemplateMode(templateMode === "pencil" ? null : "pencil");
          break;
        case "b":
          if (e.metaKey || e.ctrlKey) return;
          e.preventDefault();
          setIsDrawingObstacle(!useMissionStore.getState().isDrawingObstacle);
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
          setIsDrawingObstacle(false);
          setTemplateMode(null);
          break;
        case "delete":
        case "backspace":
          if (selectedWaypointIndices.size > 0) {
            e.preventDefault();
            if (selectedWaypointIndices.size > 1) {
              if (
                confirm(`Delete ${selectedWaypointIndices.size} waypoints?`)
              ) {
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

  // Show admin page
  if (currentPage === "admin") {
    return <AdminPage />;
  }

  // Show routes page
  if (currentPage === "routes") {
    return (
      <>
        <RoutesPage onRequestAuth={() => setShowAuthModal(true)} />
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </>
    );
  }

  // Show shared mission page
  if (currentPage === "shared" && shareToken) {
    return (
      <>
        <SharedMissionPage
          shareToken={shareToken}
          onRequestAuth={() => setShowAuthModal(true)}
        />
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </>
    );
  }

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-88 flex flex-col border-r border-border bg-card shrink-0 tabular-nums">
        {/* Header */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <img src="/droneroute.png" alt="DroneRoute" className="h-5 w-5" />
              <span className="font-bold text-sm">DroneRoute</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAbout(true)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Help & shortcuts"
              >
                <CircleHelp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage("routes")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="My routes"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPage("admin")}
                  className="h-7 w-7 text-purple-400 hover:text-purple-300"
                  title="User management"
                >
                  <Shield className="h-4 w-4" />
                </Button>
              )}
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 text-xs h-7"
            title="Save mission to your account"
          >
            <Save className="h-3 w-3" />
            {saving ? "..." : "Save"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || waypoints.length < 2}
            className="flex-1 text-xs h-7"
            title={
              waypoints.length < 2
                ? "Add at least 2 waypoints to export"
                : "Export mission as DJI KMZ file"
            }
          >
            <Download className="h-3 w-3" />
            {exporting ? "..." : "Export KMZ"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 text-xs h-7"
            title="Import a DJI KMZ file"
          >
            <Upload className="h-3 w-3" />
            Import KMZ
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
          <div className="border-l-2 border-blue-500/70 bg-blue-500/[0.03]">
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-blue-500/10 text-blue-400"
              onClick={() => toggleSection("waypoints")}
            >
              {expandedSections.waypoints ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <MapPin className="h-3 w-3" />
              Waypoints ({waypoints.length})
            </button>
            {expandedSections.waypoints && (
              <div className="max-h-[40vh] overflow-y-auto">
                <WaypointList />
              </div>
            )}
          </div>

          {/* POIs section — AMBER/ORANGE accent */}
          <div className="border-l-2 border-amber-500/70 bg-amber-500/[0.03]">
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-amber-500/10 text-amber-400"
              onClick={() => toggleSection("pois")}
            >
              {expandedSections.pois ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <Crosshair className="h-3 w-3" />
              Points of interest ({pois.length})
            </button>
            {expandedSections.pois && (
              <div className="max-h-[30vh] overflow-y-auto">
                <PoiList />
              </div>
            )}
          </div>

          {/* Obstacles section — RED accent */}
          <div className="border-l-2 border-red-500/70 bg-red-500/[0.03]">
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-red-500/10 text-red-400"
              onClick={() => toggleSection("obstacles")}
            >
              {expandedSections.obstacles ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <Triangle className="h-3 w-3" />
              Obstacles ({obstacles.length})
            </button>
            {expandedSections.obstacles && (
              <div className="max-h-[30vh] overflow-y-auto">
                <ObstacleList />
              </div>
            )}
          </div>

          {/* Mission Settings section — PURPLE accent */}
          <div className="border-l-2 border-purple-500/70 bg-purple-500/[0.03]">
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-purple-500/10 text-purple-400"
              onClick={() => toggleSection("config")}
            >
              {expandedSections.config ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <Settings className="h-3 w-3" />
              Mission settings
            </button>
            {expandedSections.config && (
              <div className="max-h-[40vh] overflow-y-auto">
                <MissionConfig />
              </div>
            )}
          </div>
        </div>

        {/* Elevation graph */}
        <ElevationGraph />

        {/* Footer stats with colored icons */}
        <div className="px-3 py-2 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(() => {
              const photoCount = waypoints.reduce(
                (sum, wp) =>
                  sum +
                  wp.actions.filter((a) => a.actionType === "takePhoto").length,
                0,
              );
              const videoCount = waypoints.reduce(
                (sum, wp) =>
                  sum +
                  wp.actions.filter((a) => a.actionType === "startRecord")
                    .length,
                0,
              );
              return (
                <>
                  {photoCount > 0 && (
                    <span
                      className="flex items-center gap-1 text-[11px]"
                      title="Photo actions"
                    >
                      <Camera className="h-3 w-3 text-sky-400" />
                      <span className="text-sky-300 font-medium">
                        {photoCount}
                      </span>
                    </span>
                  )}
                  {videoCount > 0 && (
                    <span
                      className="flex items-center gap-1 text-[11px]"
                      title="Video actions"
                    >
                      <Video className="h-3 w-3 text-red-400" />
                      <span className="text-red-300 font-medium">
                        {videoCount}
                      </span>
                    </span>
                  )}
                </>
              );
            })()}
          </div>
          <div className="flex items-center gap-3">
            {waypoints.length >= 2 && flightStats
              ? (() => {
                  const { distance, time } = flightStats;
                  const elevGain = waypoints.reduce((sum, wp, i) => {
                    if (i === 0) return 0;
                    const diff = wp.height - waypoints[i - 1].height;
                    return sum + (diff > 0 ? diff : 0);
                  }, 0);
                  const exceedsBattery = time > config.maxBatteryMinutes * 60;
                  return (
                    <>
                      {elevGain > 0 && (
                        <span
                          className="flex items-center gap-1 text-[11px]"
                          title="Elevation gain"
                        >
                          <TrendingUp className="h-3 w-3 text-orange-400" />
                          <span className="text-orange-300 font-medium">
                            {elevGain}m
                          </span>
                        </span>
                      )}
                      <span
                        className="flex items-center gap-1 text-[11px]"
                        title="Total distance"
                      >
                        <Route className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-300 font-medium">
                          {distance >= 1000
                            ? `${(distance / 1000).toFixed(1)}km`
                            : `~${distance.toFixed(0)}m`}
                        </span>
                      </span>
                      <span
                        className="flex items-center gap-1 text-[11px]"
                        title={
                          exceedsBattery
                            ? `Exceeds max battery (${config.maxBatteryMinutes}min)`
                            : "Estimated flight time"
                        }
                      >
                        <Clock
                          className={`h-3 w-3 ${exceedsBattery ? "text-orange-400" : "text-yellow-400"}`}
                        />
                        <span
                          className={`font-medium ${exceedsBattery ? "text-orange-300" : "text-yellow-300"}`}
                        >
                          {formatDuration(time)}
                        </span>
                      </span>
                    </>
                  );
                })()
              : null}
          </div>
        </div>

        {/* Auth row */}
        <div className="px-3 py-2 border-t border-border">
          {token ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {gravatarUrl ? (
                  <img
                    src={gravatarUrl}
                    alt=""
                    className="h-6 w-6 rounded-full shrink-0"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
                <span
                  className="text-[11px] text-muted-foreground truncate"
                  title={userEmail || ""}
                >
                  {userEmail}
                </span>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAccountMenu(true)}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  title="Account settings"
                >
                  <UserCog className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAuthModal(true)}
              className="w-full h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1.5 justify-start px-1"
            >
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-3 w-3 text-muted-foreground" />
              </div>
              Guest mode. Sign in to save missions
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 relative">
        <MapView />
        <BulkActionToolbar />
        <WarningsPanel warnings={warnings} />
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showAccountMenu && (
        <AccountModal onClose={() => setShowAccountMenu(false)} />
      )}
      {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
      <WelcomeDialog />
    </div>
  );
}

// Haversine distance between two points (meters)
function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
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
  waypoints: {
    latitude: number;
    longitude: number;
    speed: number;
    useGlobalSpeed: boolean;
  }[],
  globalSpeed: number,
): { distance: number; time: number } {
  let distance = 0;
  let time = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const segDist = haversine(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude,
    );
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
