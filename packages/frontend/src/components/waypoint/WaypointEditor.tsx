import { useMissionStore } from "@/store/missionStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ActionEditor } from "./ActionEditor";
import type { HeadingMode, TurnMode } from "@droneroute/shared";

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
        <Label className="text-xs">Gimbal Pitch (&deg;)</Label>
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
              update({ useGlobalHeadingParam: false, headingMode: v as HeadingMode });
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

      {!wp.useGlobalHeadingParam && wp.headingMode === "smoothTransition" && (
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

      <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
        <div>Lat: {wp.latitude.toFixed(6)}</div>
        <div>Lng: {wp.longitude.toFixed(6)}</div>
      </div>

      <Separator />

      <ActionEditor waypointIndex={wp.index} />
    </div>
  );
}
