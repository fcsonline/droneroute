import { useState, useEffect } from "react";
import { MapPin, Crosshair, Trash2, ArrowLeft, Plus, Calendar, Route, ArrowUp, Plane, Download, Share2, Link, Link2Off, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMissionStore } from "@/store/missionStore";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { DRONE_MODELS } from "@droneroute/shared";
import type { Waypoint, MissionConfig, PointOfInterest } from "@droneroute/shared";

interface SavedMission {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  config: string;
  waypoints: string;
  pois: string;
  share_token: string | null;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateDistance(waypoints: Waypoint[]): number {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += haversine(
      waypoints[i - 1].latitude,
      waypoints[i - 1].longitude,
      waypoints[i].latitude,
      waypoints[i].longitude
    );
  }
  return total;
}

function estimateFlightTime(waypoints: Waypoint[]): number {
  let seconds = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const dist = haversine(
      waypoints[i - 1].latitude,
      waypoints[i - 1].longitude,
      waypoints[i].latitude,
      waypoints[i].longitude
    );
    seconds += dist / (waypoints[i - 1].speed || 7);
  }
  return Math.round(seconds);
}

function formatFlightTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

function getDroneLabel(config: MissionConfig): string | null {
  const model = DRONE_MODELS.find(
    (d) => d.droneEnumValue === config.droneEnumValue && d.droneSubEnumValue === config.droneSubEnumValue
  );
  return model?.label ?? null;
}

interface RoutesPageProps {
  onRequestAuth: () => void;
}

export function RoutesPage({ onRequestAuth }: RoutesPageProps) {
  const { loadMission, setCurrentPage } = useMissionStore();
  const { token } = useAuthStore();
  const [missions, setMissions] = useState<SavedMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<SavedMission[]>("/missions");
      setMissions(data);
    } catch (e: any) {
      setError(e.message || "Failed to load missions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMissions();
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleLoad = async (mission: SavedMission) => {
    try {
      const waypoints = JSON.parse(mission.waypoints);
      const config = JSON.parse(mission.config);
      const pois = mission.pois ? JSON.parse(mission.pois) : [];
      loadMission({
        id: mission.id,
        name: mission.name,
        config,
        waypoints,
        pois,
      });
      setCurrentPage("editor");
    } catch (e) {
      console.error("Failed to load mission:", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this route permanently?")) return;
    try {
      await api.delete(`/missions/${id}`);
      setMissions((prev) => prev.filter((m) => m.id !== id));
    } catch (e: any) {
      alert("Failed to delete: " + (e.message || "Unknown error"));
    }
  };

  const [exportingId, setExportingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShare = async (mission: SavedMission) => {
    setSharingId(mission.id);
    try {
      if (mission.share_token) {
        // Already shared — copy the link
        const shareUrl = `${window.location.origin}/shared/${mission.share_token}`;
        await navigator.clipboard.writeText(shareUrl);
        setCopiedId(mission.id);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        // Enable sharing
        const result = await api.post<{ shareToken: string; shareUrl: string }>(
          `/missions/${mission.id}/share`
        );
        // Update local state
        setMissions((prev) =>
          prev.map((m) =>
            m.id === mission.id ? { ...m, share_token: result.shareToken } : m
          )
        );
        await navigator.clipboard.writeText(result.shareUrl);
        setCopiedId(mission.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (e: any) {
      alert("Failed to share: " + (e.message || "Unknown error"));
    } finally {
      setSharingId(null);
    }
  };

  const handleUnshare = async (mission: SavedMission) => {
    if (!confirm("Revoke sharing? Anyone with the link will lose access.")) return;
    try {
      await api.delete(`/missions/${mission.id}/share`);
      setMissions((prev) =>
        prev.map((m) =>
          m.id === mission.id ? { ...m, share_token: null } : m
        )
      );
    } catch (e: any) {
      alert("Failed to unshare: " + (e.message || "Unknown error"));
    }
  };

  const handleExportKmz = async (mission: SavedMission) => {
    setExportingId(mission.id);
    try {
      const waypoints: Waypoint[] = JSON.parse(mission.waypoints);
      const config: MissionConfig = JSON.parse(mission.config);
      const pois: PointOfInterest[] = mission.pois ? JSON.parse(mission.pois) : [];

      if (waypoints.length < 2) {
        alert("Need at least 2 waypoints to export");
        return;
      }

      const blob = await api.post<Blob>("/kmz/generate", {
        name: mission.name,
        config,
        waypoints,
        pois,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(mission.name || "mission").replace(/[^a-zA-Z0-9_-]/g, "_")}.kmz`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExportingId(null);
    }
  };

  const handleNewRoute = () => {
    useMissionStore.getState().clearMission();
    setCurrentPage("editor");
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage("editor")}
                className="h-9 w-9"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Route className="h-5 w-5 text-primary" />
                  My Routes
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {missions.length} saved route{missions.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <Button onClick={handleNewRoute} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Route
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            {loading && (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-sm">Loading routes...</p>
                </div>
              </div>
            )}

            {!loading && !token && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Route className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">Sign in to view your routes</p>
                <p className="text-sm mb-4">Create an account to save and manage drone missions</p>
                <Button size="sm" className="gap-1.5" onClick={onRequestAuth}>
                  Sign in
                </Button>
              </div>
            )}

            {error && token && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <p className="text-sm text-destructive mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchMissions}>
                  Retry
                </Button>
              </div>
            )}

            {!loading && !error && token && missions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Route className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">No saved routes yet</p>
                <p className="text-sm mb-4">Create your first drone waypoint mission</p>
                <Button onClick={handleNewRoute} size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Create Route
                </Button>
              </div>
            )}

            {!loading && !error && token && missions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {missions.map((mission) => {
                  const waypoints: Waypoint[] = (() => {
                    try {
                      return JSON.parse(mission.waypoints);
                    } catch {
                      return [];
                    }
                  })();
                  const pois = (() => {
                    try {
                      return mission.pois ? JSON.parse(mission.pois) : [];
                    } catch {
                      return [];
                    }
                  })();
                  const config: MissionConfig | null = (() => {
                    try {
                      return JSON.parse(mission.config);
                    } catch {
                      return null;
                    }
                  })();
                  const dist = estimateDistance(waypoints);
                  const flightTime = estimateFlightTime(waypoints);
                  const droneLabel = config ? getDroneLabel(config) : null;
                  const maxAlt = waypoints.length > 0
                    ? Math.max(...waypoints.map((w) => w.height))
                    : 0;

                  return (
                    <div
                      key={mission.id}
                      className="group bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
                      onClick={() => handleLoad(mission)}
                    >
                      {/* Card gradient header */}
                      <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500" />

                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-sm font-semibold text-foreground truncate flex-1 mr-2 group-hover:text-primary transition-colors">
                            {mission.name || "Untitled Route"}
                          </h3>
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${mission.share_token ? "text-emerald-400 hover:text-emerald-300" : "text-muted-foreground hover:text-foreground"}`}
                              disabled={sharingId === mission.id}
                              title={mission.share_token ? (copiedId === mission.id ? "Link copied!" : "Copy share link") : "Share route"}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShare(mission);
                              }}
                            >
                              {copiedId === mission.id ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : mission.share_token ? (
                                <Link className="h-3.5 w-3.5" />
                              ) : (
                                <Share2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            {mission.share_token && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                title="Revoke sharing"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnshare(mission);
                                }}
                              >
                                <Link2Off className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              disabled={exportingId === mission.id}
                              title="Download KMZ"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportKmz(mission);
                              }}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              title="Delete route"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(mission.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Drone model + shared badge */}
                        <div className="flex items-center gap-2 mb-2">
                          {droneLabel && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Plane className="h-3 w-3 text-purple-400" />
                              {droneLabel}
                            </div>
                          )}
                          {mission.share_token && (
                            <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                              <Share2 className="h-3 w-3" />
                              Shared
                            </div>
                          )}
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-blue-400" />
                            {waypoints.length} WP
                          </span>
                          {pois.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Crosshair className="h-3 w-3 text-amber-400" />
                              {pois.length} POI
                            </span>
                          )}
                          {maxAlt > 0 && (
                            <span className="flex items-center gap-1">
                              <ArrowUp className="h-3 w-3 text-sky-400" />
                              {maxAlt}m
                            </span>
                          )}
                        </div>

                        {/* Distance + time row */}
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
                          {dist > 0 && (
                            <span className="flex items-center gap-1">
                              <Route className="h-3 w-3 text-emerald-400" />
                              {dist >= 1000
                                ? `${(dist / 1000).toFixed(1)}km`
                                : `${Math.round(dist)}m`}
                            </span>
                          )}
                          {flightTime > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="text-orange-400 text-[10px]">~</span>
                              {formatFlightTime(flightTime)}
                            </span>
                          )}
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                          <Calendar className="h-3 w-3" />
                          {formatDate(mission.updated_at || mission.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
