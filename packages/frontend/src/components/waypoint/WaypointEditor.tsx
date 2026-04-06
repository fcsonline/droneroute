import { useMissionStore } from "@/store/missionStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ActionEditor } from "./ActionEditor";
import type { HeadingMode, TurnMode, Waypoint, PointOfInterest } from "@droneroute/shared";

/**
 * Calculate the horizontal distance in meters between two lat/lng points
 * using the Haversine formula.
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate the ideal gimbal pitch angle for a waypoint pointing at a POI.
 * Uses trigonometry: pitch = -atan2(heightDiff, horizontalDist)
 * Returns degrees where 0 = horizon, -90 = straight down, plus the distance.
 */
function calculateIdealGimbalPitch(wp: Waypoint, poi: PointOfInterest): { pitch: number; distance: number } {
  const horizontalDist = haversineDistance(wp.latitude, wp.longitude, poi.latitude, poi.longitude);
  const heightDiff = wp.height - poi.height; // positive = drone is above POI
  if (horizontalDist < 0.01) return { pitch: -90, distance: 0 }; // directly above → straight down
  const angleRad = Math.atan2(heightDiff, horizontalDist);
  const pitch = Math.round(-angleRad * (180 / Math.PI));
  const distance = Math.sqrt(horizontalDist ** 2 + heightDiff ** 2); // 3D slant distance
  return { pitch, distance };
}

/**
 * Calculate the bearing (heading) from one lat/lng point to another.
 * Returns degrees in -180..180 range where 0 = North, 90 = East, -90 = West.
 */
function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  let bearing = toDeg(Math.atan2(y, x));
  // Normalize to -180..180
  if (bearing > 180) bearing -= 360;
  if (bearing < -180) bearing += 360;
  return Math.round(bearing);
}

interface WaypointEditorInlineProps {
  waypointIndex: number;
}

export function WaypointEditorInline({ waypointIndex }: WaypointEditorInlineProps) {
  const { waypoints, updateWaypoint, config, pois } = useMissionStore();

  const wp = waypoints.find((w) => w.index === waypointIndex);
  if (!wp) return null;

  const update = (updates: Record<string, any>) => {
    updateWaypoint(wp.index, updates);
  };

  return (
    <div className="p-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Altitude (m)</Label>
          <Input
            type="number"
            value={wp.height}
            onChange={(e) => update({ height: parseFloat(e.target.value) || 0 })}
            min={1}
            max={1500}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Speed (m/s)</Label>
          <Input
            type="number"
            value={wp.speed}
            onChange={(e) => update({ speed: parseFloat(e.target.value) || 1, useGlobalSpeed: false })}
            min={1}
            max={15}
            step={0.5}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1">
          <Label className="text-xs">Gimbal Pitch (&deg;)</Label>
          {(() => {
            const targetPoi = !wp.useGlobalHeadingParam && wp.headingMode === "towardPOI" && wp.poiId
              ? pois.find((p) => p.id === wp.poiId)
              : null;
            if (!targetPoi) return null;
            const { pitch: suggested, distance } = calculateIdealGimbalPitch(wp, targetPoi);
            const isAlreadyApplied = wp.gimbalPitchAngle === suggested;
            const heightDiff = wp.height - targetPoi.height;
            const distLabel = distance >= 1000 ? `${(distance / 1000).toFixed(1)}km` : `${Math.round(distance)}m`;
            const heightDesc = heightDiff > 0 ? `${Math.round(heightDiff)}m above` : heightDiff < 0 ? `${Math.round(Math.abs(heightDiff))}m below` : "level with";
            const tooltip = `Point your camera right at ${targetPoi.name} — the perfect angle for the shot.\n\n${distLabel} away, ${heightDesc}. Click to apply ${suggested}°.`;
            return (
              <button
                type="button"
                title={tooltip}
                onClick={() => { if (!isAlreadyApplied) update({ gimbalPitchAngle: suggested }); }}
                className={`text-[10px] font-medium transition-colors ${
                  isAlreadyApplied
                    ? "text-yellow-400 cursor-default"
                    : "text-yellow-400/60 hover:text-yellow-400 cursor-pointer"
                }`}
              >
                Perfect pitch: {suggested}&deg;
              </button>
            );
          })()}
        </div>
        <Input
          type="number"
          value={wp.gimbalPitchAngle}
          onChange={(e) => update({ gimbalPitchAngle: parseFloat(e.target.value) || 0 })}
          min={-120}
          max={45}
          step={5}
          className="h-8 text-xs"
        />
        <div className="text-[10px] text-muted-foreground mt-0.5">
          -90&deg; = straight down, 0&deg; = horizon
        </div>
      </div>

      <div>
        <Label className="text-xs">Heading Mode</Label>
        <Select
          value={wp.useGlobalHeadingParam ? "global" : (wp.headingMode || "followWayline")}
          onValueChange={(v) => {
            if (v === "global") {
              update({ useGlobalHeadingParam: true });
            } else {
              const updates: Record<string, any> = { useGlobalHeadingParam: false, headingMode: v as HeadingMode };
              // Auto-set heading angle toward the POI when switching to fixed/manual and there's exactly one POI
              if ((v === "fixed" || v === "manually") && pois.length === 1) {
                const poi = pois[0];
                updates.headingAngle = calculateBearing(wp.latitude, wp.longitude, poi.latitude, poi.longitude);
              }
              update(updates);
            }
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Use Global ({config.globalHeadingMode})</SelectItem>
            <SelectItem value="followWayline">Follow Wayline</SelectItem>
            <SelectItem value="manually">Manual</SelectItem>
            <SelectItem value="fixed">Fixed</SelectItem>
            <SelectItem value="smoothTransition">Smooth Transition</SelectItem>
            <SelectItem value="towardPOI">Toward POI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!wp.useGlobalHeadingParam && (wp.headingMode === "manually" || wp.headingMode === "fixed" || wp.headingMode === "smoothTransition") && (
        <div>
          <Label className="text-xs">Heading Angle (&deg;)</Label>
          <Input
            type="number"
            value={wp.headingAngle ?? 0}
            onChange={(e) => update({ headingAngle: parseFloat(e.target.value) || 0 })}
            min={-180}
            max={180}
            className="h-8 text-xs"
          />
          <div className="text-[10px] text-muted-foreground mt-0.5">
            0&deg; = North, 90&deg; = East, -90&deg; = West
          </div>
        </div>
      )}

      {!wp.useGlobalHeadingParam && wp.headingMode === "towardPOI" && (
        <div>
          <Label className="text-xs">Target POI</Label>
          <Select
            value={wp.poiId || "none"}
            onValueChange={(v) => update({ poiId: v === "none" ? undefined : v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select POI..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {pois.map((poi) => (
                <SelectItem key={poi.id} value={poi.id}>
                  {poi.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {pois.length === 0 && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Add POIs on the map first
            </div>
          )}
        </div>
      )}

      <div>
        <Label className="text-xs">Turn Mode</Label>
        <Select
          value={wp.useGlobalTurnParam ? "global" : (wp.turnMode || config.globalTurnMode)}
          onValueChange={(v) => {
            if (v === "global") {
              update({ useGlobalTurnParam: true });
            } else {
              update({ useGlobalTurnParam: false, turnMode: v as TurnMode });
            }
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Use Global</SelectItem>
            <SelectItem value="coordinateTurn">Coordinated Turn</SelectItem>
            <SelectItem value="toPointAndStopWithDiscontinuityCurvature">Stop at Point (sharp)</SelectItem>
            <SelectItem value="toPointAndStopWithContinuityCurvature">Stop at Point (curve)</SelectItem>
            <SelectItem value="toPointAndPassWithContinuityCurvature">Pass Point (curve)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <ActionEditor waypointIndex={wp.index} />
    </div>
  );
}
