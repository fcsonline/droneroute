import { useRef, useEffect } from "react";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X, MapPin } from "lucide-react";
import type {
  TemplateType,
  OrbitParams,
  GridParams,
  FacadeParams,
  PencilParams,
} from "@/lib/templates";
import type { PointOfInterest } from "@droneroute/shared";

interface TemplateConfigPanelProps {
  type: TemplateType;
  orbitParams?: OrbitParams | null;
  gridParams?: GridParams | null;
  facadeParams?: FacadeParams | null;
  pencilParams?: PencilParams | null;
  onOrbitChange?: (params: OrbitParams) => void;
  onGridChange?: (params: GridParams) => void;
  onFacadeChange?: (params: FacadeParams) => void;
  onPencilChange?: (params: PencilParams) => void;
  onApply: () => void;
  onCancel: () => void;
  waypointCount: number;
  pois?: PointOfInterest[];
}

export function TemplateConfigPanel({
  type,
  orbitParams,
  gridParams,
  facadeParams,
  pencilParams,
  onOrbitChange,
  onGridChange,
  onFacadeChange,
  onPencilChange,
  onApply,
  onCancel,
  waypointCount,
  pois,
}: TemplateConfigPanelProps) {
  const title =
    type === "orbit"
      ? "Orbit"
      : type === "grid"
        ? "Grid survey"
        : type === "facade"
          ? "Facade scan"
          : "Pencil path";
  const description =
    type === "orbit"
      ? "Circular flight path around a center point. Adjust the radius, number of points, and enable POI to keep the camera focused on the center."
      : type === "grid"
        ? "Lawn-mower zigzag pattern for systematic area coverage. Control line spacing for overlap and rotation to align with the terrain."
        : type === "facade"
          ? "Vertical scanning pattern along a wall or building face. Set the standoff distance, altitude range, and grid density for full coverage."
          : "Freehand flight path drawn on the map. Adjust the number of waypoints to control how closely the path is followed.";

  // Stop all pointer/keyboard/wheel events from reaching Leaflet (native DOM level)
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const stop = (e: Event) => e.stopPropagation();
    const events = [
      "mousedown",
      "mouseup",
      "dblclick",
      "wheel",
      "keydown",
      "keyup",
      "pointerdown",
      "pointerup",
      "touchstart",
      "touchend",
    ];
    for (const evt of events) el.addEventListener(evt, stop);
    return () => {
      for (const evt of events) el.removeEventListener(evt, stop);
    };
  }, []);

  return (
    <div
      ref={panelRef}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-2xl p-3 min-w-[320px] max-w-[420px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
            {title}
          </span>
          <Badge variant="secondary" className="text-[10px] gap-1">
            <MapPin className="h-3 w-3" />
            {waypointCount} waypoints
          </Badge>
        </div>
        <button
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground mb-3">{description}</p>

      {/* Orbit params */}
      {type === "orbit" && orbitParams && onOrbitChange && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <Label className="text-[10px]">Radius (m)</Label>
            <NumericInput
              value={orbitParams.radiusM}
              onChange={(v) => onOrbitChange({ ...orbitParams, radiusM: v })}
              min={5}
              step={5}
              fallback={5}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Altitude (m)</Label>
            <NumericInput
              value={orbitParams.altitude}
              onChange={(v) => onOrbitChange({ ...orbitParams, altitude: v })}
              min={5}
              step={5}
              fallback={30}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Points</Label>
            <NumericInput
              value={orbitParams.numPoints}
              onChange={(v) => onOrbitChange({ ...orbitParams, numPoints: v })}
              min={3}
              max={72}
              fallback={12}
              integer
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={orbitParams.clockwise}
                onChange={(e) =>
                  onOrbitChange({ ...orbitParams, clockwise: e.target.checked })
                }
                className="rounded"
              />
              Clockwise
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={orbitParams.createPoi}
                onChange={(e) =>
                  onOrbitChange({ ...orbitParams, createPoi: e.target.checked })
                }
                className="rounded"
              />
              Center POI
            </label>
          </div>
        </div>
      )}

      {/* Grid params */}
      {type === "grid" && gridParams && onGridChange && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <Label className="text-[10px]">Altitude (m)</Label>
            <NumericInput
              value={gridParams.altitude}
              onChange={(v) => onGridChange({ ...gridParams, altitude: v })}
              min={5}
              step={5}
              fallback={80}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Line spacing (m)</Label>
            <NumericInput
              value={gridParams.spacingM}
              onChange={(v) => onGridChange({ ...gridParams, spacingM: v })}
              min={3}
              step={5}
              fallback={30}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Rotation (°)</Label>
            <NumericInput
              value={gridParams.rotationDeg}
              onChange={(v) => onGridChange({ ...gridParams, rotationDeg: v })}
              min={-180}
              max={180}
              step={5}
              fallback={0}
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-end gap-2 pb-1">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={gridParams.addPhotos}
                onChange={(e) =>
                  onGridChange({ ...gridParams, addPhotos: e.target.checked })
                }
                className="rounded"
              />
              Photos
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={gridParams.reverse}
                onChange={(e) =>
                  onGridChange({ ...gridParams, reverse: e.target.checked })
                }
                className="rounded"
              />
              Reverse
            </label>
          </div>
        </div>
      )}

      {/* Facade params */}
      {type === "facade" && facadeParams && onFacadeChange && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <Label className="text-[10px]">Distance from wall (m)</Label>
            <NumericInput
              value={facadeParams.distanceM}
              onChange={(v) =>
                onFacadeChange({ ...facadeParams, distanceM: v })
              }
              min={3}
              step={5}
              fallback={20}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Min altitude (m)</Label>
            <NumericInput
              value={facadeParams.minAltitude}
              onChange={(v) => {
                onFacadeChange({
                  ...facadeParams,
                  minAltitude: v,
                  maxAltitude: Math.max(v + 5, facadeParams.maxAltitude),
                });
              }}
              min={2}
              step={5}
              fallback={10}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Max altitude (m)</Label>
            <NumericInput
              value={facadeParams.maxAltitude}
              onChange={(v) =>
                onFacadeChange({
                  ...facadeParams,
                  maxAltitude: Math.max(facadeParams.minAltitude + 5, v),
                })
              }
              min={facadeParams.minAltitude + 5}
              step={5}
              fallback={30}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Rows</Label>
            <NumericInput
              value={facadeParams.numRows}
              onChange={(v) => onFacadeChange({ ...facadeParams, numRows: v })}
              min={1}
              max={20}
              fallback={4}
              integer
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Columns</Label>
            <NumericInput
              value={facadeParams.numColumns}
              onChange={(v) =>
                onFacadeChange({ ...facadeParams, numColumns: v })
              }
              min={2}
              max={30}
              fallback={8}
              integer
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={facadeParams.addPhotos}
                onChange={(e) =>
                  onFacadeChange({
                    ...facadeParams,
                    addPhotos: e.target.checked,
                  })
                }
                className="rounded"
              />
              Photos
            </label>
          </div>
        </div>
      )}

      {/* Pencil params */}
      {type === "pencil" && pencilParams && onPencilChange && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <Label className="text-[10px]">Waypoints</Label>
            <NumericInput
              value={pencilParams.numPoints}
              onChange={(v) =>
                onPencilChange({ ...pencilParams, numPoints: v })
              }
              min={2}
              max={200}
              fallback={10}
              integer
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Altitude (m)</Label>
            <NumericInput
              value={pencilParams.altitude}
              onChange={(v) => onPencilChange({ ...pencilParams, altitude: v })}
              min={5}
              step={5}
              fallback={30}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Speed (m/s)</Label>
            <NumericInput
              value={pencilParams.speed}
              onChange={(v) => onPencilChange({ ...pencilParams, speed: v })}
              min={1}
              max={15}
              step={0.5}
              fallback={7}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Gimbal pitch (°)</Label>
            <NumericInput
              value={pencilParams.gimbalPitchAngle}
              onChange={(v) =>
                onPencilChange({ ...pencilParams, gimbalPitchAngle: v })
              }
              min={-90}
              max={45}
              step={5}
              fallback={-45}
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-end pb-1 gap-3">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={pencilParams.reverse}
                onChange={(e) =>
                  onPencilChange({ ...pencilParams, reverse: e.target.checked })
                }
                className="rounded"
              />
              Reverse
            </label>
          </div>
          {pois && pois.length > 0 && (
            <div>
              <Label className="text-[10px]">Face POI</Label>
              <Select
                value={pencilParams.poiId || "none"}
                onValueChange={(v) =>
                  onPencilChange({
                    ...pencilParams,
                    poiId: v === "none" ? undefined : v,
                  })
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (follow path)</SelectItem>
                  {pois.map((poi) => (
                    <SelectItem key={poi.id} value={poi.id}>
                      {poi.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onApply}
          className="flex-1 h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Check className="h-3 w-3 mr-1" />
          Apply
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="h-7 text-xs"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
