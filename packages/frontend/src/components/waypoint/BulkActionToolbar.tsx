import { Trash2, X, Crosshair, ArrowUp, Gauge, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMissionStore } from "@/store/missionStore";
import type { HeadingMode, TurnMode, Waypoint } from "@droneroute/shared";

/**
 * Returns the common value for a field across selected waypoints,
 * or undefined if values differ (mixed).
 */
function getCommonValue<K extends keyof Waypoint>(
  waypoints: Waypoint[],
  indices: Set<number>,
  field: K
): Waypoint[K] | undefined {
  const selected = waypoints.filter((wp) => indices.has(wp.index));
  if (selected.length === 0) return undefined;
  const first = selected[0][field];
  return selected.every((wp) => wp[field] === first) ? first : undefined;
}

export function BulkActionToolbar() {
  const {
    waypoints,
    pois,
    config,
    selectedWaypointIndices,
    clearWaypointSelection,
    removeSelectedWaypoints,
    updateSelectedWaypoints,
  } = useMissionStore();

  const [showEditor, setShowEditor] = useState(false);

  const count = selectedWaypointIndices.size;
  if (count < 2) return null;

  const handleDelete = () => {
    if (confirm(`Delete ${count} waypoints?`)) {
      removeSelectedWaypoints();
    }
  };

  const handleAssignPoi = (poiId: string) => {
    updateSelectedWaypoints({
      headingMode: "towardPOI",
      poiId,
      useGlobalHeadingParam: false,
    });
  };

  // Common values for bulk editor
  const commonHeight = getCommonValue(waypoints, selectedWaypointIndices, "height");
  const commonSpeed = getCommonValue(waypoints, selectedWaypointIndices, "speed");
  const commonGimbal = getCommonValue(waypoints, selectedWaypointIndices, "gimbalPitchAngle");
  const commonUseGlobalHeading = getCommonValue(waypoints, selectedWaypointIndices, "useGlobalHeadingParam");
  const commonHeadingMode = getCommonValue(waypoints, selectedWaypointIndices, "headingMode");
  const commonUseGlobalTurn = getCommonValue(waypoints, selectedWaypointIndices, "useGlobalTurnParam");
  const commonTurnMode = getCommonValue(waypoints, selectedWaypointIndices, "turnMode");
  const commonPoiId = getCommonValue(waypoints, selectedWaypointIndices, "poiId");

  const headingSelectValue =
    commonUseGlobalHeading === true
      ? "global"
      : commonUseGlobalHeading === false && commonHeadingMode !== undefined
        ? commonHeadingMode
        : "mixed";

  const turnSelectValue =
    commonUseGlobalTurn === true
      ? "global"
      : commonUseGlobalTurn === false && commonTurnMode !== undefined
        ? commonTurnMode
        : "mixed";

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200 tabular-nums">
      <div className="bg-card border border-border rounded-xl shadow-2xl shadow-black/30 overflow-hidden">
        {/* Action bar */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Badge variant="default" className="text-xs px-2 py-0.5">
            {count} selected
          </Badge>

          <div className="h-4 w-px bg-border" />

          {/* Point to POI */}
          {pois.length > 0 && (
            <Select onValueChange={handleAssignPoi}>
              <SelectTrigger className="h-7 w-auto gap-1.5 text-xs border-0 bg-transparent hover:bg-secondary px-2">
                <Crosshair className="h-3 w-3" />
                <span>Point to POI</span>
              </SelectTrigger>
              <SelectContent>
                {pois.map((poi) => (
                  <SelectItem key={poi.id} value={poi.id}>
                    {poi.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Toggle bulk editor */}
          <Button
            variant={showEditor ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowEditor(!showEditor)}
            className="h-7 text-xs gap-1.5 px-2"
            title="Edit properties"
          >
            <SlidersHorizontal className="h-3 w-3" />
            Edit
          </Button>

          <div className="h-4 w-px bg-border" />

          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-7 text-xs gap-1.5 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>

          <div className="h-4 w-px bg-border" />

          {/* Clear selection */}
          <Button
            variant="ghost"
            size="icon"
            onClick={clearWaypointSelection}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            title="Clear selection (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Bulk editor panel */}
        {showEditor && (
          <div className="border-t border-border px-4 py-3 space-y-3 max-w-lg">
            <div className="grid grid-cols-3 gap-3">
              {/* Height */}
              <div>
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <ArrowUp className="h-2.5 w-2.5" />
                  Altitude (m)
                </Label>
                <Input
                  type="number"
                  placeholder={commonHeight !== undefined ? String(commonHeight) : "Mixed"}
                  defaultValue={commonHeight !== undefined ? commonHeight : ""}
                  key={`h-${commonHeight}`}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) updateSelectedWaypoints({ height: v });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = parseFloat(e.currentTarget.value);
                      if (!isNaN(v)) updateSelectedWaypoints({ height: v });
                    }
                  }}
                  min={1}
                   max={500}
                  className="h-7 text-xs mt-0.5"
                />
              </div>

              {/* Speed */}
              <div>
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Gauge className="h-2.5 w-2.5" />
                  Speed (m/s)
                </Label>
                <Input
                  type="number"
                  placeholder={commonSpeed !== undefined ? String(commonSpeed) : "Mixed"}
                  defaultValue={commonSpeed !== undefined ? commonSpeed : ""}
                  key={`s-${commonSpeed}`}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) updateSelectedWaypoints({ speed: v, useGlobalSpeed: false });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = parseFloat(e.currentTarget.value);
                      if (!isNaN(v)) updateSelectedWaypoints({ speed: v, useGlobalSpeed: false });
                    }
                  }}
                  min={1}
                  max={15}
                  step={0.5}
                  className="h-7 text-xs mt-0.5"
                />
              </div>

              {/* Gimbal */}
              <div>
                <Label className="text-[10px] text-muted-foreground">Gimbal (&deg;)</Label>
                <Input
                  type="number"
                  placeholder={commonGimbal !== undefined ? String(commonGimbal) : "Mixed"}
                  defaultValue={commonGimbal !== undefined ? commonGimbal : ""}
                  key={`g-${commonGimbal}`}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) updateSelectedWaypoints({ gimbalPitchAngle: v });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = parseFloat(e.currentTarget.value);
                      if (!isNaN(v)) updateSelectedWaypoints({ gimbalPitchAngle: v });
                    }
                  }}
                  min={-120}
                  max={45}
                  step={5}
                  className="h-7 text-xs mt-0.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Heading mode */}
              <div>
                <Label className="text-[10px] text-muted-foreground">Heading mode</Label>
                <Select
                  value={headingSelectValue}
                  onValueChange={(v) => {
                    if (v === "mixed") return;
                    if (v === "global") {
                      updateSelectedWaypoints({ useGlobalHeadingParam: true });
                    } else {
                      updateSelectedWaypoints({
                        useGlobalHeadingParam: false,
                        headingMode: v as HeadingMode,
                      });
                    }
                  }}
                >
                  <SelectTrigger className="h-7 text-xs mt-0.5">
                    <SelectValue placeholder="Mixed" />
                  </SelectTrigger>
                  <SelectContent>
                    {headingSelectValue === "mixed" && (
                      <SelectItem value="mixed" disabled>Mixed</SelectItem>
                    )}
                    <SelectItem value="global">Use global ({config.globalHeadingMode})</SelectItem>
                    <SelectItem value="followWayline">Follow wayline</SelectItem>
                    <SelectItem value="manually">Manual</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="smoothTransition">Smooth transition</SelectItem>
                    <SelectItem value="towardPOI">Toward POI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target POI (visible when heading mode is towardPOI) */}
              {headingSelectValue === "towardPOI" && pois.length > 0 && (
                <div>
                  <Label className="text-[10px] text-muted-foreground">Target POI</Label>
                  <Select
                    value={commonPoiId || "none"}
                    onValueChange={(v) =>
                      updateSelectedWaypoints({ poiId: v === "none" ? undefined : v })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs mt-0.5">
                      <SelectValue placeholder={commonPoiId === undefined ? "Mixed" : "Select POI..."} />
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
                </div>
              )}

              {/* Turn mode (when heading is not towardPOI or when there are no POIs) */}
              {(headingSelectValue !== "towardPOI" || pois.length === 0) && (
                <div>
                  <Label className="text-[10px] text-muted-foreground">Turn mode</Label>
                  <Select
                    value={turnSelectValue}
                    onValueChange={(v) => {
                      if (v === "mixed") return;
                      if (v === "global") {
                        updateSelectedWaypoints({ useGlobalTurnParam: true });
                      } else {
                        updateSelectedWaypoints({
                          useGlobalTurnParam: false,
                          turnMode: v as TurnMode,
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs mt-0.5">
                      <SelectValue placeholder="Mixed" />
                    </SelectTrigger>
                    <SelectContent>
                      {turnSelectValue === "mixed" && (
                        <SelectItem value="mixed" disabled>Mixed</SelectItem>
                      )}
                      <SelectItem value="global">Use global</SelectItem>
                      <SelectItem value="coordinateTurn">Coordinated turn</SelectItem>
                      <SelectItem value="toPointAndStopWithDiscontinuityCurvature">Stop at point (sharp)</SelectItem>
                      <SelectItem value="toPointAndStopWithContinuityCurvature">Stop at point (curve)</SelectItem>
                      <SelectItem value="toPointAndPassWithContinuityCurvature">Pass point (curve)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
