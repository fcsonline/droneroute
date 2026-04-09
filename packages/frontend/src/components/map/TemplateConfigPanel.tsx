import { useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, MapPin } from "lucide-react";
import type { TemplateType, OrbitParams, GridParams, FacadeParams, PencilParams } from "@/lib/templates";

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
}: TemplateConfigPanelProps) {

  const title = type === "orbit" ? "Orbit" : type === "grid" ? "Grid Survey" : type === "facade" ? "Facade Scan" : "Pencil Path";
  const description = type === "orbit"
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
    const events = ["mousedown", "mouseup", "click", "dblclick", "wheel", "keydown", "keyup", "pointerdown", "pointerup", "touchstart", "touchend"];
    for (const evt of events) el.addEventListener(evt, stop);
    return () => { for (const evt of events) el.removeEventListener(evt, stop); };
  }, []);

  return (
    <div
      ref={panelRef}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-2xl p-3 min-w-[320px] max-w-[420px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">{title}</span>
          <Badge variant="secondary" className="text-[10px] gap-1">
            <MapPin className="h-3 w-3" />
            {waypointCount} waypoints
          </Badge>
        </div>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground mb-3">{description}</p>

      {/* Orbit params */}
      {type === "orbit" && orbitParams && onOrbitChange && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <Label className="text-[10px]">Radius (m)</Label>
            <Input
              type="number"
              value={orbitParams.radiusM}
              onChange={(e) => onOrbitChange({ ...orbitParams, radiusM: Math.max(5, parseFloat(e.target.value) || 5) })}
              min={5}
              step={5}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Altitude (m)</Label>
            <Input
              type="number"
              value={orbitParams.altitude}
              onChange={(e) => onOrbitChange({ ...orbitParams, altitude: Math.max(5, parseFloat(e.target.value) || 50) })}
              min={5}
              step={5}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Points</Label>
            <Input
              type="number"
              value={orbitParams.numPoints}
              onChange={(e) => onOrbitChange({ ...orbitParams, numPoints: Math.max(3, Math.min(72, parseInt(e.target.value) || 12)) })}
              min={3}
              max={72}
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={orbitParams.clockwise}
                onChange={(e) => onOrbitChange({ ...orbitParams, clockwise: e.target.checked })}
                className="rounded"
              />
              CW
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={orbitParams.createPoi}
                onChange={(e) => onOrbitChange({ ...orbitParams, createPoi: e.target.checked })}
                className="rounded"
              />
              POI
            </label>
          </div>
        </div>
      )}

      {/* Grid params */}
      {type === "grid" && gridParams && onGridChange && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <Label className="text-[10px]">Altitude (m)</Label>
            <Input
              type="number"
              value={gridParams.altitude}
              onChange={(e) => onGridChange({ ...gridParams, altitude: Math.max(5, parseFloat(e.target.value) || 80) })}
              min={5}
              step={5}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Line Spacing (m)</Label>
            <Input
              type="number"
              value={gridParams.spacingM}
              onChange={(e) => onGridChange({ ...gridParams, spacingM: Math.max(3, parseFloat(e.target.value) || 30) })}
              min={3}
              step={5}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Rotation (°)</Label>
            <Input
              type="number"
              value={gridParams.rotationDeg}
              onChange={(e) => onGridChange({ ...gridParams, rotationDeg: Math.max(-180, Math.min(180, parseFloat(e.target.value) || 0)) })}
              min={-180}
              max={180}
              step={5}
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-end gap-2 pb-1">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={gridParams.addPhotos}
                onChange={(e) => onGridChange({ ...gridParams, addPhotos: e.target.checked })}
                className="rounded"
              />
              Photos
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={gridParams.reverse}
                onChange={(e) => onGridChange({ ...gridParams, reverse: e.target.checked })}
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
            <Input
              type="number"
              value={facadeParams.distanceM}
              onChange={(e) => onFacadeChange({ ...facadeParams, distanceM: Math.max(3, parseFloat(e.target.value) || 20) })}
              min={3}
              step={5}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Min Altitude (m)</Label>
            <Input
              type="number"
              value={facadeParams.minAltitude}
              onChange={(e) => {
                const val = Math.max(2, parseFloat(e.target.value) || 10);
                onFacadeChange({ ...facadeParams, minAltitude: val, maxAltitude: Math.max(val + 5, facadeParams.maxAltitude) });
              }}
              min={2}
              step={5}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Max Altitude (m)</Label>
            <Input
              type="number"
              value={facadeParams.maxAltitude}
              onChange={(e) => onFacadeChange({ ...facadeParams, maxAltitude: Math.max(facadeParams.minAltitude + 5, parseFloat(e.target.value) || 50) })}
              min={facadeParams.minAltitude + 5}
              step={5}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Rows</Label>
            <Input
              type="number"
              value={facadeParams.numRows}
              onChange={(e) => onFacadeChange({ ...facadeParams, numRows: Math.max(1, Math.min(20, parseInt(e.target.value) || 4)) })}
              min={1}
              max={20}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Columns</Label>
            <Input
              type="number"
              value={facadeParams.numColumns}
              onChange={(e) => onFacadeChange({ ...facadeParams, numColumns: Math.max(2, Math.min(30, parseInt(e.target.value) || 8)) })}
              min={2}
              max={30}
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={facadeParams.addPhotos}
                onChange={(e) => onFacadeChange({ ...facadeParams, addPhotos: e.target.checked })}
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
            <Input
              type="number"
              value={pencilParams.numPoints}
              onChange={(e) => onPencilChange({ ...pencilParams, numPoints: Math.max(2, Math.min(200, parseInt(e.target.value) || 10)) })}
              min={2}
              max={200}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Altitude (m)</Label>
            <Input
              type="number"
              value={pencilParams.altitude}
              onChange={(e) => onPencilChange({ ...pencilParams, altitude: Math.max(5, parseFloat(e.target.value) || 50) })}
              min={5}
              step={5}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Speed (m/s)</Label>
            <Input
              type="number"
              value={pencilParams.speed}
              onChange={(e) => onPencilChange({ ...pencilParams, speed: Math.max(1, Math.min(15, parseFloat(e.target.value) || 7)) })}
              min={1}
              max={15}
              step={0.5}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Gimbal Pitch (°)</Label>
            <Input
              type="number"
              value={pencilParams.gimbalPitchAngle}
              onChange={(e) => onPencilChange({ ...pencilParams, gimbalPitchAngle: Math.max(-90, Math.min(45, parseFloat(e.target.value) || -45)) })}
              min={-90}
              max={45}
              step={5}
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={pencilParams.reverse}
                onChange={(e) => onPencilChange({ ...pencilParams, reverse: e.target.checked })}
                className="rounded"
              />
              Reverse
            </label>
          </div>
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
