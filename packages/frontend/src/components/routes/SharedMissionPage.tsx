import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  MapPin,
  Crosshair,
  Route,
  ArrowUp,
  Plane,
  Calendar,
  Download,
  Copy,
  User,
  ArrowLeft,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Polygon,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { useMissionStore } from "@/store/missionStore";
import { useAuthStore } from "@/store/authStore";
import { useUnitSystem } from "@/store/unitsStore";
import { fmtAlt } from "@/lib/units";
import { api } from "@/lib/api";
import { DRONE_MODELS } from "@droneroute/shared";
import { getObstacleWarnings } from "@/lib/geo";
import type {
  Waypoint,
  MissionConfig,
  PointOfInterest,
  Obstacle,
} from "@droneroute/shared";
import "leaflet/dist/leaflet.css";

interface SharedMissionData {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  shareToken: string;
  ownerEmail?: string;
  config: MissionConfig;
  waypoints: Waypoint[];
  pois: PointOfInterest[];
  obstacles: Obstacle[];
}

function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
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
      waypoints[i].longitude,
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
      waypoints[i].longitude,
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
    (d) =>
      d.droneEnumValue === config.droneEnumValue &&
      d.droneSubEnumValue === config.droneSubEnumValue,
  );
  return model?.label ?? null;
}

interface SharedMissionPageProps {
  shareToken: string;
  onRequestAuth: () => void;
}

/** Fit map to show all waypoints, POIs, and obstacle vertices. */
function FitBounds({
  waypoints,
  pois,
  obstacles,
}: {
  waypoints: Waypoint[];
  pois: PointOfInterest[];
  obstacles: Obstacle[];
}) {
  const map = useMap();
  useEffect(() => {
    const points: L.LatLngExpression[] = [
      ...waypoints.map((wp) => [wp.latitude, wp.longitude] as [number, number]),
      ...pois.map((p) => [p.latitude, p.longitude] as [number, number]),
      ...obstacles.flatMap((o) =>
        o.vertices.map((v) => [v[0], v[1]] as [number, number]),
      ),
    ];
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
    }
  }, [waypoints, pois, obstacles, map]);
  return null;
}

/** Read-only map preview showing the flight path, waypoints, POIs, and obstacle polygons. */
function SharedMissionMap({
  waypoints,
  pois,
  obstacles,
}: {
  waypoints: Waypoint[];
  pois: PointOfInterest[];
  obstacles: Obstacle[];
}) {
  const warnings = useMemo(
    () => getObstacleWarnings(waypoints, obstacles),
    [waypoints, obstacles],
  );
  const warningSegments = useMemo(() => {
    const set = new Set<number>();
    for (const w of warnings) {
      if (w.type === "crosses") set.add(w.waypointIndex);
    }
    return set;
  }, [warnings]);

  // Build flight path segments
  const segments =
    waypoints.length >= 2
      ? waypoints.slice(0, -1).map((wp, i) => {
          const next = waypoints[i + 1];
          const hasWarning = warningSegments.has(wp.index);
          return {
            key: `seg-${wp.index}-${next.index}`,
            positions: [
              [wp.latitude, wp.longitude] as [number, number],
              [next.latitude, next.longitude] as [number, number],
            ],
            hasWarning,
          };
        })
      : [];

  // Default center: first waypoint, or Barcelona
  const center: [number, number] =
    waypoints.length > 0
      ? [waypoints[0].latitude, waypoints[0].longitude]
      : [41.3874, 2.1686];

  return (
    <div className="h-[360px] w-full rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={center}
        zoom={14}
        className="h-full w-full z-0"
        zoomControl={true}
        dragging={true}
        scrollWheelZoom={true}
        doubleClickZoom={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds waypoints={waypoints} pois={pois} obstacles={obstacles} />

        {/* Flight path */}
        {segments.map((seg) => (
          <Polyline
            key={seg.key}
            positions={seg.positions}
            pathOptions={{
              color: seg.hasWarning ? "#ef4444" : "#3b82f6",
              weight: 3,
              opacity: 0.8,
              dashArray: "10, 6",
            }}
          />
        ))}

        {/* Obstacle polygons */}
        {obstacles.map((obs) => (
          <Polygon
            key={`obs-${obs.id}`}
            positions={obs.vertices.map(
              ([lat, lng]) => [lat, lng] as [number, number],
            )}
            pathOptions={{
              color: "#ef4444",
              fillColor: "#ef4444",
              fillOpacity: 0.12,
              weight: 2,
              opacity: 0.7,
            }}
          />
        ))}

        {/* Waypoint markers */}
        {waypoints.map((wp, i) => (
          <CircleMarker
            key={`wp-${wp.index}`}
            center={[wp.latitude, wp.longitude]}
            radius={6}
            pathOptions={{
              color: "#3b82f6",
              fillColor:
                i === 0
                  ? "#22c55e"
                  : i === waypoints.length - 1
                    ? "#ef4444"
                    : "#3b82f6",
              fillOpacity: 1,
              weight: 2,
            }}
          />
        ))}

        {/* POI markers */}
        {pois.map((poi) => (
          <CircleMarker
            key={`poi-${poi.id}`}
            center={[poi.latitude, poi.longitude]}
            radius={5}
            pathOptions={{
              color: "#f59e0b",
              fillColor: "#f59e0b",
              fillOpacity: 0.8,
              weight: 2,
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}

export function SharedMissionPage({
  shareToken,
  onRequestAuth,
}: SharedMissionPageProps) {
  const { loadMission, setCurrentPage } = useMissionStore();
  const { token } = useAuthStore();
  const unitSys = useUnitSystem();
  const [mission, setMission] = useState<SharedMissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    const fetchShared = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<SharedMissionData>(`/shared/${shareToken}`);
        setMission(data);
      } catch (e: any) {
        setError(e.message || "Mission not found");
      } finally {
        setLoading(false);
      }
    };
    fetchShared();
  }, [shareToken]);

  const handleLoadReadOnly = () => {
    if (!mission) return;
    loadMission({
      name: mission.name,
      config: mission.config,
      waypoints: mission.waypoints,
      pois: mission.pois,
      obstacles: mission.obstacles,
    });
    // Clear URL so we go back to normal editor
    window.history.pushState({}, "", "/");
    setCurrentPage("editor");
  };

  const handleClone = async () => {
    if (!token) {
      onRequestAuth();
      return;
    }
    setCloning(true);
    try {
      const result = await api.post<{ id: string; name: string }>(
        `/shared/${shareToken}/clone`,
      );
      if (!mission) return;
      loadMission({
        id: result.id,
        name: result.name,
        config: mission.config,
        waypoints: mission.waypoints,
        pois: mission.pois,
        obstacles: mission.obstacles,
      });
      window.history.pushState({}, "", "/");
      setCurrentPage("editor");
    } catch (e: any) {
      toast.error("Clone failed: " + (e.message || "Unknown error"));
    } finally {
      setCloning(false);
    }
  };

  const handleExportKmz = async () => {
    if (!mission || mission.waypoints.length < 2) return;
    try {
      const blob = await api.post<Blob>("/kmz/generate", {
        name: mission.name,
        config: mission.config,
        waypoints: mission.waypoints,
        pois: mission.pois,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(mission.name || "mission").replace(/[^a-zA-Z0-9_-]/g, "_")}.kmz`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    }
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
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  window.history.pushState({}, "", "/");
                  setCurrentPage("editor");
                }}
                className="h-9 w-9"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Route className="h-5 w-5 text-primary" />
                  Shared route
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Someone shared a drone mission with you
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            {loading && (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-sm">Loading shared route...</p>
                </div>
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Route className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">Route not found</p>
                <p className="text-sm mb-4">
                  This shared link may have expired or been revoked
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.history.pushState({}, "", "/");
                    setCurrentPage("editor");
                  }}
                >
                  Go to editor
                </Button>
              </div>
            )}

            {!loading &&
              !error &&
              mission &&
              (() => {
                const dist = estimateDistance(mission.waypoints);
                const flightTime = estimateFlightTime(mission.waypoints);
                const droneLabel = getDroneLabel(mission.config);
                const maxAlt =
                  mission.waypoints.length > 0
                    ? Math.max(...mission.waypoints.map((w) => w.height))
                    : 0;

                return (
                  <div className="bg-card border border-border rounded-lg overflow-hidden">
                    {/* Gradient header */}
                    <div className="h-2 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500" />

                    <div className="p-6">
                      {/* Mission name */}
                      <h2 className="text-2xl font-bold text-foreground mb-2">
                        {mission.name || "Untitled route"}
                      </h2>

                      {/* Owner + date */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                        {mission.ownerEmail && (
                          <span className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            {mission.ownerEmail}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(mission.updatedAt || mission.createdAt)}
                        </span>
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                        {droneLabel && (
                          <div className="bg-background rounded-lg p-3 border border-border">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                              <Plane className="h-3 w-3 text-purple-400" />
                              Drone
                            </div>
                            <div className="text-sm font-medium text-foreground">
                              {droneLabel}
                            </div>
                          </div>
                        )}
                        <div className="bg-background rounded-lg p-3 border border-border">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <MapPin className="h-3 w-3 text-blue-400" />
                            Waypoints
                          </div>
                          <div className="text-sm font-medium text-foreground">
                            {mission.waypoints.length}
                            {mission.pois.length > 0 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                + {mission.pois.length} POI
                              </span>
                            )}
                          </div>
                        </div>
                        {dist > 0 && (
                          <div className="bg-background rounded-lg p-3 border border-border">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                              <Route className="h-3 w-3 text-emerald-400" />
                              Distance
                            </div>
                            <div className="text-sm font-medium text-foreground">
                              {dist >= 1000
                                ? `${(dist / 1000).toFixed(1)} km`
                                : `${Math.round(dist)} m`}
                            </div>
                          </div>
                        )}
                        {maxAlt > 0 && (
                          <div className="bg-background rounded-lg p-3 border border-border">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                              <ArrowUp className="h-3 w-3 text-sky-400" />
                              Max altitude
                            </div>
                            <div className="text-sm font-medium text-foreground">
                              {fmtAlt(maxAlt, unitSys)}
                            </div>
                          </div>
                        )}
                        {flightTime > 0 && (
                          <div className="bg-background rounded-lg p-3 border border-border">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                              <Crosshair className="h-3 w-3 text-orange-400" />
                              Est. time
                            </div>
                            <div className="text-sm font-medium text-foreground">
                              {formatFlightTime(flightTime)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Map preview */}
                      {mission.waypoints.length > 0 && (
                        <div className="mb-6">
                          <SharedMissionMap
                            waypoints={mission.waypoints}
                            pois={mission.pois}
                            obstacles={mission.obstacles}
                          />
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={handleLoadReadOnly} className="gap-2">
                          <Route className="h-4 w-4" />
                          Open in editor
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleClone}
                          disabled={cloning}
                          className="gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          {cloning
                            ? "Cloning..."
                            : token
                              ? "Clone to my routes"
                              : "Sign in to clone"}
                        </Button>
                        {mission.waypoints.length >= 2 && (
                          <Button
                            variant="outline"
                            onClick={handleExportKmz}
                            className="gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Export KMZ
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      </div>
    </div>
  );
}
