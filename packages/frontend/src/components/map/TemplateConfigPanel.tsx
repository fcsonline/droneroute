import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, MapPin } from "lucide-react";
import type { TemplateType, OrbitParams, GridParams, FacadeParams } from "@/lib/templates";

interface TemplateConfigPanelProps {
  type: TemplateType;
  orbitParams: OrbitParams | null;
  gridParams: GridParams | null;
  facadeParams: FacadeParams | null;
  onOrbitChange: (params: OrbitParams) => void;
  onGridChange: (params: GridParams) => void;
  onFacadeChange: (params: FacadeParams) => void;
  onApply: () => void;
  onCancel: () => void;
  waypointCount: number;
}

export function TemplateConfigPanel({
  type,
  orbitParams,
  gridParams,
  facadeParams,
  onOrbitChange,
  onGridChange,
  onFacadeChange,
  onApply,
  onCancel,
  waypointCount,
}: TemplateConfigPanelProps) {

  const title = type === "orbit" ? "Orbit" : type === "grid" ? "Grid Survey" : "Facade Scan";

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-2xl p-3 min-w-[320px] max-w-[420px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
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

      {/* Orbit params */}
      {type === "orbit" && orbitParams && (
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
      {type === "grid" && gridParams && (
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
      {type === "facade" && facadeParams && (
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
