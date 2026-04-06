import { useState, useEffect } from "react";
import { MapPin, Crosshair, Trash2, ArrowLeft, Plus, Calendar, Route, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMissionStore } from "@/store/missionStore";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";

interface SavedMission {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  config: string;
  waypoints: string;
  pois: string;
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

function estimateDistance(waypoints: any[]): number {
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

  const handleNewRoute = () => {
    useMissionStore.getState().clearMission();
    setCurrentPage("editor");
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
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
                <User className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">Sign in to view your routes</p>
                <p className="text-sm mb-4">Create an account to save and manage drone missions</p>
                <Button size="sm" className="gap-1.5" onClick={onRequestAuth}>
                  <User className="h-4 w-4" />
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
                  const waypoints = (() => {
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
                  const dist = estimateDistance(waypoints);

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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(mission.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
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
                          {dist > 0 && (
                            <span className="flex items-center gap-1">
                              <Route className="h-3 w-3 text-emerald-400" />
                              {dist >= 1000
                                ? `${(dist / 1000).toFixed(1)}km`
                                : `${Math.round(dist)}m`}
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
