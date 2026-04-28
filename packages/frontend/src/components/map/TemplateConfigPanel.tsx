import { useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
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
import { Check, X, MapPin, AlertTriangle } from "lucide-react";
import { useUnitSystem } from "@/store/unitsStore";
import {
  altUnit,
  speedUnit,
  displayAlt,
  displaySpeed,
  displayToM,
  displayToMs,
  fmtDist,
  SPEED_MIN,
  SPEED_MAX,
  SPEED_STEP,
} from "@/lib/units";
import {
  CAMERA_PRESETS,
  computeAreaSurveyMetrics,
} from "@/lib/templates";
import type {
  TemplateType,
  OrbitParams,
  GridParams,
  FacadeParams,
  PencilParams,
  AreaSurveyParams,
  CameraPresetKey,
  ObliqueSurveyResult,
} from "@/lib/templates";
import type { PointOfInterest } from "@droneroute/shared";

interface TemplateConfigPanelProps {
  type: TemplateType;
  orbitParams?: OrbitParams | null;
  gridParams?: GridParams | null;
  facadeParams?: FacadeParams | null;
  pencilParams?: PencilParams | null;
  areaSurveyParams?: AreaSurveyParams | null;
  onOrbitChange?: (params: OrbitParams) => void;
  onGridChange?: (params: GridParams) => void;
  onFacadeChange?: (params: FacadeParams) => void;
  onPencilChange?: (params: PencilParams) => void;
  onAreaSurveyChange?: (params: AreaSurveyParams) => void;
  onApply: () => void;
  onCancel: () => void;
  waypointCount: number;
  pois?: PointOfInterest[];
  selectedObliquePaths?: Set<keyof ObliqueSurveyResult>;
  obliquePathLabels?: Record<keyof ObliqueSurveyResult, string>;
  onObliquePathToggle?: (path: keyof ObliqueSurveyResult) => void;
}

export function TemplateConfigPanel({
  type,
  orbitParams,
  gridParams,
  facadeParams,
  pencilParams,
  areaSurveyParams,
  onOrbitChange,
  onGridChange,
  onFacadeChange,
  onPencilChange,
  onAreaSurveyChange,
  onApply,
  onCancel,
  waypointCount,
  pois,
  selectedObliquePaths,
  obliquePathLabels,
  onObliquePathToggle,
}: TemplateConfigPanelProps) {
  const title =
    type === "orbit"
      ? "Orbit"
      : type === "grid"
        ? "Grid survey"
        : type === "facade"
          ? "Facade scan"
          : type === "area"
            ? "Area survey"
            : "Pencil path";
  const description =
    type === "orbit"
      ? "Circular flight path around a center point. Adjust the radius, number of points, and enable POI to keep the camera focused on the center."
      : type === "grid"
        ? "Lawn-mower zigzag pattern for systematic area coverage. Control line spacing for overlap and rotation to align with the terrain."
        : type === "facade"
          ? "Vertical scanning pattern along a wall or building face. Set the standoff distance, altitude range, and grid density for full coverage."
          : type === "area"
            ? "Polygon-bounded lawnmower survey. Draw any shape on the map and generate a complete coverage grid clipped exactly to your boundary."
            : "Freehand flight path drawn on the map. Adjust the number of waypoints to control how closely the path is followed.";

  const areaSurveyMetrics =
    type === "area" && areaSurveyParams
      ? computeAreaSurveyMetrics(areaSurveyParams)
      : null;

  const presetKeys = Object.keys(CAMERA_PRESETS) as CameraPresetKey[];
  const currentPresetKey =
    areaSurveyParams
      ? (presetKeys.find(
          (k) => CAMERA_PRESETS[k].label === areaSurveyParams.camera.label,
        ) ?? null)
      : null;

  const sys = useUnitSystem();
  const altU = altUnit(sys);
  const spdU = speedUnit(sys);

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
          {waypointCount > 1000 && (
            <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/40 text-amber-500">
              <AlertTriangle className="h-3 w-3" />
              Points hidden
            </Badge>
          )}
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
            <Label className="text-[10px]">Radius ({altU})</Label>
            <Input
              type="number"
              value={displayAlt(orbitParams.radiusM, sys)}
              onChange={(e) =>
                onOrbitChange({
                  ...orbitParams,
                  radiusM: Math.max(
                    5,
                    displayToM(parseFloat(e.target.value) || 5, sys),
                  ),
                })
              }
              min={sys === "imperial" ? 16 : 5}
              step={sys === "imperial" ? 10 : 5}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Altitude ({altU})</Label>
            <Input
              type="number"
              value={displayAlt(orbitParams.altitude, sys)}
              onChange={(e) =>
                onOrbitChange({
                  ...orbitParams,
                  altitude: Math.max(
                    5,
                    displayToM(parseFloat(e.target.value) || 30, sys),
                  ),
                })
              }
              min={sys === "imperial" ? 16 : 5}
              step={sys === "imperial" ? 10 : 5}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Points</Label>
            <Input
              type="number"
              value={orbitParams.numPoints}
              onChange={(e) =>
                onOrbitChange({
                  ...orbitParams,
                  numPoints: Math.max(
                    3,
                    Math.min(72, parseInt(e.target.value) || 12),
                  ),
                })
              }
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
            <Label className="text-[10px]">Altitude ({altU})</Label>
            <Input
              type="number"
              value={displayAlt(gridParams.altitude, sys)}
              onChange={(e) =>
                onGridChange({
                  ...gridParams,
                  altitude: Math.max(
                    5,
                    displayToM(parseFloat(e.target.value) || 80, sys),
                  ),
                })
              }
              min={sys === "imperial" ? 16 : 5}
              step={sys === "imperial" ? 10 : 5}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Line spacing ({altU})</Label>
            <Input
              type="number"
              value={displayAlt(gridParams.spacingM, sys)}
              onChange={(e) =>
                onGridChange({
                  ...gridParams,
                  spacingM: Math.max(
                    3,
                    displayToM(parseFloat(e.target.value) || 30, sys),
                  ),
                })
              }
              min={sys === "imperial" ? 10 : 3}
              step={sys === "imperial" ? 5 : 5}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Rotation (°)</Label>
            <Input
              type="number"
              value={gridParams.rotationDeg}
              onChange={(e) =>
                onGridChange({
                  ...gridParams,
                  rotationDeg: Math.max(
                    -180,
                    Math.min(180, parseFloat(e.target.value) || 0),
                  ),
                })
              }
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
            <Label className="text-[10px]">Distance from wall ({altU})</Label>
            <Input
              type="number"
              value={displayAlt(facadeParams.distanceM, sys)}
              onChange={(e) =>
                onFacadeChange({
                  ...facadeParams,
                  distanceM: Math.max(
                    3,
                    displayToM(parseFloat(e.target.value) || 20, sys),
                  ),
                })
              }
              min={sys === "imperial" ? 10 : 3}
              step={sys === "imperial" ? 5 : 5}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Min altitude ({altU})</Label>
            <Input
              type="number"
              value={displayAlt(facadeParams.minAltitude, sys)}
              onChange={(e) => {
                const val = Math.max(
                  2,
                  displayToM(parseFloat(e.target.value) || 10, sys),
                );
                onFacadeChange({
                  ...facadeParams,
                  minAltitude: val,
                  maxAltitude: Math.max(val + 5, facadeParams.maxAltitude),
                });
              }}
              min={sys === "imperial" ? 7 : 2}
              step={sys === "imperial" ? 5 : 5}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Max altitude ({altU})</Label>
            <Input
              type="number"
              value={displayAlt(facadeParams.maxAltitude, sys)}
              onChange={(e) =>
                onFacadeChange({
                  ...facadeParams,
                  maxAltitude: Math.max(
                    facadeParams.minAltitude + 5,
                    displayToM(parseFloat(e.target.value) || 30, sys),
                  ),
                })
              }
              min={
                sys === "imperial"
                  ? displayAlt(facadeParams.minAltitude + 5, sys)
                  : facadeParams.minAltitude + 5
              }
              step={sys === "imperial" ? 5 : 5}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Rows</Label>
            <Input
              type="number"
              value={facadeParams.numRows}
              onChange={(e) =>
                onFacadeChange({
                  ...facadeParams,
                  numRows: Math.max(
                    1,
                    Math.min(20, parseInt(e.target.value) || 4),
                  ),
                })
              }
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
              onChange={(e) =>
                onFacadeChange({
                  ...facadeParams,
                  numColumns: Math.max(
                    2,
                    Math.min(30, parseInt(e.target.value) || 8),
                  ),
                })
              }
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
            <Input
              type="number"
              value={pencilParams.numPoints}
              onChange={(e) =>
                onPencilChange({
                  ...pencilParams,
                  numPoints: Math.max(
                    2,
                    Math.min(200, parseInt(e.target.value) || 10),
                  ),
                })
              }
              min={2}
              max={200}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Altitude ({altU})</Label>
            <Input
              type="number"
              value={displayAlt(pencilParams.altitude, sys)}
              onChange={(e) =>
                onPencilChange({
                  ...pencilParams,
                  altitude: Math.max(
                    5,
                    displayToM(parseFloat(e.target.value) || 30, sys),
                  ),
                })
              }
              min={sys === "imperial" ? 16 : 5}
              step={sys === "imperial" ? 10 : 5}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Speed ({spdU})</Label>
            <Input
              type="number"
              value={displaySpeed(pencilParams.speed, sys)}
              onChange={(e) =>
                onPencilChange({
                  ...pencilParams,
                  speed: Math.max(
                    1,
                    Math.min(
                      15,
                      displayToMs(parseFloat(e.target.value) || 7, sys),
                    ),
                  ),
                })
              }
              min={SPEED_MIN(sys)}
              max={SPEED_MAX(sys)}
              step={SPEED_STEP(sys)}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Gimbal pitch (°)</Label>
            <Input
              type="number"
              value={pencilParams.gimbalPitchAngle}
              onChange={(e) =>
                onPencilChange({
                  ...pencilParams,
                  gimbalPitchAngle: Math.max(
                    -90,
                    Math.min(45, parseFloat(e.target.value) || -45),
                  ),
                })
              }
              min={-90}
              max={45}
              step={5}
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

      {/* Area survey params */}
      {type === "area" && areaSurveyParams && onAreaSurveyChange && (() => {
        const obliquePitch = areaSurveyParams.obliquePitch ?? -45;
        const pitchOutOfRange = obliquePitch > -45 || obliquePitch < -90;
        const autoRot = areaSurveyMetrics?.autoRotationDeg ?? 0;
        const isAutoRotation = areaSurveyParams.rotationDeg === undefined;
        const displayedRotation = areaSurveyParams.rotationDeg ?? autoRot;
        return (
          <div className="space-y-2 mb-3">
            {/* Camera preset */}
            <div>
              <Label className="text-[10px]">Camera</Label>
              <Select
                value={currentPresetKey ?? presetKeys[0]}
                onValueChange={(v) =>
                  onAreaSurveyChange({
                    ...areaSurveyParams,
                    camera: CAMERA_PRESETS[v as CameraPresetKey],
                  })
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {presetKeys.map((k) => (
                    <SelectItem key={k} value={k}>
                      {CAMERA_PRESETS[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Altitude */}
              <div>
                <Label className="text-[10px]">Altitude ({altU})</Label>
                <Input
                  type="number"
                  value={displayAlt(areaSurveyParams.altitude, sys)}
                  onChange={(e) =>
                    onAreaSurveyChange({
                      ...areaSurveyParams,
                      altitude: Math.max(
                        5,
                        displayToM(parseFloat(e.target.value) || 80, sys),
                      ),
                    })
                  }
                  min={sys === "imperial" ? 16 : 5}
                  step={sys === "imperial" ? 10 : 5}
                  className="h-7 text-xs"
                />
              </div>

              {/* Speed */}
              <div>
                <Label className="text-[10px]">Speed ({spdU})</Label>
                <Input
                  type="number"
                  value={displaySpeed(areaSurveyParams.speedMs, sys)}
                  onChange={(e) =>
                    onAreaSurveyChange({
                      ...areaSurveyParams,
                      speedMs: Math.max(
                        1,
                        Math.min(
                          15,
                          displayToMs(parseFloat(e.target.value) || 7, sys),
                        ),
                      ),
                    })
                  }
                  min={SPEED_MIN(sys)}
                  max={SPEED_MAX(sys)}
                  step={SPEED_STEP(sys)}
                  className="h-7 text-xs"
                />
              </div>

              {/* Rotation — auto or manual */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <Label className="text-[10px]">Rotation (°)</Label>
                  <button
                    type="button"
                    className={`text-[9px] px-1 rounded leading-none ${isAutoRotation ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                    onClick={() =>
                      onAreaSurveyChange({
                        ...areaSurveyParams,
                        rotationDeg: isAutoRotation ? Math.round(autoRot) : undefined,
                      })
                    }
                    title={isAutoRotation ? "Using MBR auto-rotation — click to override" : "Click to restore MBR auto-rotation"}
                  >
                    auto
                  </button>
                </div>
                <Input
                  type="number"
                  value={Math.round(displayedRotation)}
                  onChange={(e) =>
                    onAreaSurveyChange({
                      ...areaSurveyParams,
                      rotationDeg: Math.max(
                        -180,
                        Math.min(180, parseFloat(e.target.value) || 0),
                      ),
                    })
                  }
                  min={-180}
                  max={180}
                  step={5}
                  className={`h-7 text-xs ${isAutoRotation ? "opacity-60" : ""}`}
                  readOnly={isAutoRotation}
                />
              </div>

              {/* Boundary margin */}
              <div>
                <Label className="text-[10px]">Boundary margin ({altU})</Label>
                <Input
                  type="number"
                  value={displayAlt(areaSurveyParams.marginM, sys)}
                  onChange={(e) =>
                    onAreaSurveyChange({
                      ...areaSurveyParams,
                      marginM: Math.max(
                        0,
                        displayToM(parseFloat(e.target.value) || 0, sys),
                      ),
                    })
                  }
                  min={0}
                  step={sys === "imperial" ? 5 : 5}
                  className="h-7 text-xs"
                />
              </div>

              {/* Front overlap */}
              <div>
                <Label className="text-[10px]">Front overlap (%)</Label>
                <Input
                  type="number"
                  value={Math.round(areaSurveyParams.frontOverlap * 100)}
                  onChange={(e) =>
                    onAreaSurveyChange({
                      ...areaSurveyParams,
                      frontOverlap:
                        Math.max(5, Math.min(95, parseInt(e.target.value) || 80)) /
                        100,
                    })
                  }
                  min={5}
                  max={95}
                  step={5}
                  className="h-7 text-xs"
                />
              </div>

              {/* Side overlap */}
              <div>
                <Label className="text-[10px]">Side overlap (%)</Label>
                <Input
                  type="number"
                  value={Math.round(areaSurveyParams.sideOverlap * 100)}
                  onChange={(e) =>
                    onAreaSurveyChange({
                      ...areaSurveyParams,
                      sideOverlap:
                        Math.max(5, Math.min(95, parseInt(e.target.value) || 70)) /
                        100,
                    })
                  }
                  min={5}
                  max={95}
                  step={5}
                  className="h-7 text-xs"
                />
              </div>

              {/* Oblique pitch — only shown when oblique is on */}
              {areaSurveyParams.oblique && (
                <div className="col-span-2">
                  <Label className="text-[10px]">Oblique pitch (°)</Label>
                  <Input
                    type="number"
                    value={obliquePitch}
                    onChange={(e) =>
                      onAreaSurveyChange({
                        ...areaSurveyParams,
                        obliquePitch: parseFloat(e.target.value) || -45,
                      })
                    }
                    step={5}
                    className="h-7 text-xs"
                  />
                  {pitchOutOfRange && (
                    <p className="text-[9px] text-amber-500 mt-0.5">
                      Recommended range: −90° to −45°. Values outside this range may produce unusable imagery.
                    </p>
                  )}
                </div>
              )}

              {/* Checkboxes */}
              <div className="col-span-2 flex items-center gap-3 flex-wrap pt-0.5">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={areaSurveyParams.addPhotos}
                    onChange={(e) =>
                      onAreaSurveyChange({
                        ...areaSurveyParams,
                        addPhotos: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  Photos
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={areaSurveyParams.reverse}
                    onChange={(e) =>
                      onAreaSurveyChange({
                        ...areaSurveyParams,
                        reverse: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  Reverse
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={areaSurveyParams.crossHatch}
                    onChange={(e) =>
                      onAreaSurveyChange({
                        ...areaSurveyParams,
                        crossHatch: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  Cross-hatch
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={areaSurveyParams.oblique}
                    onChange={(e) =>
                      onAreaSurveyChange({
                        ...areaSurveyParams,
                        oblique: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  Oblique
                </label>
              </div>
            </div>

            {/* Oblique path selector — shown when oblique is on */}
            {areaSurveyParams.oblique && selectedObliquePaths && obliquePathLabels && onObliquePathToggle && (
              <div className="border border-border rounded px-2 py-1.5">
                <div className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Paths to commit</div>
                <div className="flex flex-col gap-1">
                  {(Object.entries(obliquePathLabels) as [keyof ObliqueSurveyResult, string][]).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedObliquePaths.has(key)}
                        onChange={() => onObliquePathToggle(key)}
                        className="rounded"
                      />
                      <span className={selectedObliquePaths.has(key) ? "" : "text-muted-foreground line-through"}>
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Derived metrics */}
            {areaSurveyMetrics && (
              <div className="grid grid-cols-4 gap-1 bg-muted/40 rounded px-2 py-1.5">
                <div className="text-center">
                  <div className="text-[9px] text-muted-foreground">GSD</div>
                  <div className="text-xs font-mono">
                    {areaSurveyMetrics.gsdCm.toFixed(1)} cm/px
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-muted-foreground">
                    Line spacing
                  </div>
                  <div className="text-xs font-mono">
                    {fmtDist(areaSurveyMetrics.lineSpacingM, sys)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-muted-foreground">
                    Photo interval
                  </div>
                  <div className="text-xs font-mono">
                    {fmtDist(areaSurveyMetrics.photoIntervalM, sys)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-muted-foreground">
                    Auto rotation
                  </div>
                  <div className="text-xs font-mono">
                    {Math.round(areaSurveyMetrics.autoRotationDeg)}°
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

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
