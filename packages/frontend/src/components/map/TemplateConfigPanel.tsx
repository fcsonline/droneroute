import { useRef, useEffect, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X, MapPin, Lock, Unlock, Save } from "lucide-react";
import { LocationSearch } from "@/components/ui/location-search";
import { useMissionStore } from "@/store/missionStore";
import { usePreferencesStore } from "@/store/preferencesStore";
import { useAuthStore } from "@/store/authStore";
import { useTemplatePresetsStore } from "@/store/templatePresetsStore";
import {
  heightLabel,
  speedLabel,
  distanceLabel,
  toDisplayHeight,
  fromDisplayHeight,
  toDisplaySpeed,
  fromDisplaySpeed,
  toDisplayDistance,
  fromDisplayDistance,
  speedRange,
} from "@/lib/units";
import {
  computeGimbalPitch,
  computeAltitudeForPitch,
  computeFramedForRadius,
  computeFramedForAltitude,
  type TemplateType,
  type OrbitParams,
  type GridParams,
  type FacadeParams,
  type PencilParams,
  type SolarParams,
  type CaptureMode,
} from "@/lib/templates";
import {
  recommendSolarSpacing,
  recommendGridSpacing,
  computeGsdCm,
  THERMAL_CAMERA_FOV,
  WIDE_CAMERA_FOV,
} from "@/lib/solarCamera";
import type { PointOfInterest, HeightMode } from "@droneroute/shared";

function heightModeLabel(mode: HeightMode): string {
  switch (mode) {
    case "relativeToStartPoint":
      return "relativně od vzletového bodu";
    case "aboveGroundLevel":
      return "nad terénem";
    case "EGM96":
      return "nad mořem (EGM96)";
    default:
      return mode;
  }
}

/** Photo (a shot at every waypoint) vs. video (record continuously start-to-finish) capture-mode picker, shared by all five templates. */
function CaptureModeToggle({
  value,
  onChange,
}: {
  value: CaptureMode;
  onChange: (mode: CaptureMode) => void;
}) {
  const optionClass = (mode: CaptureMode) =>
    `flex-1 h-7 rounded text-xs border transition-colors ${
      value === mode
        ? "bg-[#00c2ff]/15 border-[#00c2ff]/50 text-[#33cfff]"
        : "border-border text-muted-foreground hover:bg-muted"
    }`;
  return (
    <div>
      <Label
        className="text-[10px]"
        title="Foto: fotka na každém bodě trasy. Video: nahrávání se spustí na prvním bodě a zastaví na posledním, dron mezitím jen prolétá."
      >
        Záznam
      </Label>
      <div className="flex gap-1 mt-0.5">
        <button
          type="button"
          onClick={() => onChange("photo")}
          className={optionClass("photo")}
        >
          Foto
        </button>
        <button
          type="button"
          onClick={() => onChange("video")}
          className={optionClass("video")}
        >
          Video
        </button>
      </div>
    </div>
  );
}

interface TemplateConfigPanelProps {
  type: TemplateType;
  orbitParams?: OrbitParams | null;
  gridParams?: GridParams | null;
  facadeParams?: FacadeParams | null;
  pencilParams?: PencilParams | null;
  solarParams?: SolarParams | null;
  onOrbitChange?: (params: OrbitParams) => void;
  onGridChange?: (params: GridParams) => void;
  onFacadeChange?: (params: FacadeParams) => void;
  onPencilChange?: (params: PencilParams) => void;
  onSolarChange?: (params: SolarParams) => void;
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
  solarParams,
  onOrbitChange,
  onGridChange,
  onFacadeChange,
  onPencilChange,
  onSolarChange,
  onApply,
  onCancel,
  waypointCount,
  pois,
}: TemplateConfigPanelProps) {
  const unitSystem = usePreferencesStore((s) => s.preferences.unitSystem);
  const setFlyToTarget = useMissionStore((s) => s.setFlyToTarget);
  const heightMode = useMissionStore((s) => s.config.heightMode);
  const payloadEnumValue = useMissionStore((s) => s.config.payloadEnumValue);
  const wideFov = WIDE_CAMERA_FOV[payloadEnumValue];
  const heightModeText = heightModeLabel(heightMode);
  const title =
    type === "orbit"
      ? "Orbit"
      : type === "grid"
        ? "Mřížkový průzkum"
        : type === "facade"
          ? "Sken fasády"
          : type === "solar"
            ? "Solární panelový průzkum"
            : "Volná křivka";
  const description =
    type === "orbit"
      ? "Kruhová letová trasa kolem středového bodu. Upravte radius, počet bodů a zapněte POI, aby kamera zůstala zaměřená na střed. Nastavte koncový úhel pod 360° pro otevřený oblouk mezi počátečním a koncovým směrem místo celého kruhu."
      : type === "grid"
        ? "Cik-cak vzor pro systematické pokrytí plochy. Nastavte rozestup řádků pro překryv a rotaci pro zarovnání s terénem."
        : type === "facade"
          ? "Svislý skenovací vzor podél stěny nebo fasády budovy. Nastavte odstup od stěny, rozsah výšky a hustotu mřížky pro úplné pokrytí."
          : type === "solar"
            ? "Cik-cak trasa oříznutá přesně podle tvaru, který jste obkreslili kolem pole panelů — dron nikdy nepřeletí za jeho okraje. Letové řádky vedou pod úhlem, který jste nastavili nakreslením referenční čáry podél řady panelů."
            : "Letová trasa nakreslená od ruky na mapě. Upravte počet bodů trasy pro řízení toho, jak přesně se trasa dodrží.";

  // Must stay in sync with MAX_WAYPOINTS in
  // packages/backend/src/services/missionValidation.ts — surfaced here so
  // a template that would exceed the mission's hard waypoint limit (e.g. a
  // large solar array with tight line/photo spacing) is caught before
  // Apply, not at save/export time.
  const MAX_WAYPOINTS = 5000;
  const exceedsWaypointLimit = waypointCount > MAX_WAYPOINTS;

  // "Save as preset" — reusable across missions, e.g. the same recurring
  // orbit around a fixed site. Works generically for whichever template
  // type/params this panel currently shows.
  const currentParams =
    orbitParams || gridParams || facadeParams || pencilParams || solarParams;
  const token = useAuthStore((s) => s.token);
  const createPreset = useTemplatePresetsStore((s) => s.createPreset);
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetSaveInFlight, setPresetSaveInFlight] = useState(false);

  // Grid overlap-%/GSD calculator inputs — ephemeral (not part of GridParams
  // itself), used only to compute a spacingM/photoSpacingM recommendation.
  // 75%/65% are common photogrammetry defaults (front/side overlap).
  const [gridFrontOverlapPct, setGridFrontOverlapPct] = useState(75);
  const [gridSideOverlapPct, setGridSideOverlapPct] = useState(65);

  const handleSavePreset = async () => {
    const name = presetName.trim();
    if (!name || !currentParams) return;
    setPresetSaveInFlight(true);
    try {
      await createPreset(
        name,
        type,
        currentParams as unknown as Record<string, unknown>,
      );
      toast.success(`Šablona "${name}" byla uložena`);
      setSavingPreset(false);
      setPresetName("");
    } catch (err: any) {
      toast.error(`Uložení šablony se nezdařilo: ${err.message}`);
    } finally {
      setPresetSaveInFlight(false);
    }
  };

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

  // Drag-to-reposition, grabbed by the title/badge area of the header (not
  // the close button). The panel defaults to bottom-center over the map,
  // which can sit right on top of the area the user is working on — this
  // lets it be moved out of the way instead of forcing a zoom-out to see
  // underneath it. Plain native listeners (not React's onPointerDown), same
  // as the stopPropagation effect above, since a native pointerdown fired on
  // this panel never reaches React's root-delegated listener once
  // `stop()` above calls stopPropagation on it.
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const [dragPosition, setDragPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  useEffect(() => {
    const handle = dragHandleRef.current;
    const panel = panelRef.current;
    if (!handle || !panel) return;

    // Tracks the in-progress drag's own listeners so they can be torn down
    // if the panel unmounts mid-drag (e.g. Apply/Cancel fires while the
    // pointer is still down) — otherwise they'd linger on `window` until
    // the next pointerup, harmlessly but needlessly.
    let activeDrag: {
      move: (e: PointerEvent) => void;
      up: () => void;
    } | null = null;

    const handlePointerDown = (e: PointerEvent) => {
      // The whole header row is the drag handle, but the close button
      // lives inside it too — let its own click work normally instead of
      // starting a drag underneath it.
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      // Track via movementX/movementY (per-event relative deltas), not
      // absolute clientX/clientY — a real machine hit a browser-level bug
      // where clientX jumped far more than the actual mouse movement under
      // 125% Windows display scaling (devicePixelRatio reported as 1).
      // Only the drag's starting position comes from getBoundingClientRect(),
      // which is unaffected by that clientX inconsistency.
      const panelRect = panel.getBoundingClientRect();
      let currentLeft = panelRect.left;
      let currentTop = panelRect.top;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault();
        currentLeft += moveEvent.movementX;
        currentTop += moveEvent.movementY;
        // Clamp the accumulator itself, not just what gets rendered —
        // otherwise it keeps summing past the visual edge while the panel
        // looks stuck there, and reversing direction wouldn't move it again
        // until the accumulator drifted back past the boundary.
        const maxLeft = Math.max(window.innerWidth - panel.offsetWidth, 0);
        const maxTop = Math.max(window.innerHeight - panel.offsetHeight, 0);
        currentLeft = Math.min(Math.max(currentLeft, 0), maxLeft);
        currentTop = Math.min(Math.max(currentTop, 0), maxTop);
        setDragPosition({ left: currentLeft, top: currentTop });
      };

      const handlePointerUp = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp, true);
        window.removeEventListener("pointercancel", handlePointerUp, true);
        activeDrag = null;
      };

      activeDrag = { move: handlePointerMove, up: handlePointerUp };
      window.addEventListener("pointermove", handlePointerMove);
      // Capture phase, not bubble: the stopPropagation effect above (guarding
      // Leaflet/Mapbox) calls stopPropagation on this same panel for
      // pointerup during the BUBBLE phase, which — since the pointer is
      // almost always released back over the panel itself while dragging —
      // would otherwise stop this pointerup from ever reaching a
      // bubble-phase window listener, leaving the drag stuck following the
      // cursor forever with no way to "let go" short of unmounting the
      // whole panel. A capture-phase listener runs top-down, before the
      // event ever reaches the panel and before that stopPropagation call.
      window.addEventListener("pointerup", handlePointerUp, true);
      window.addEventListener("pointercancel", handlePointerUp, true);
    };

    handle.addEventListener("pointerdown", handlePointerDown);
    return () => {
      handle.removeEventListener("pointerdown", handlePointerDown);
      if (activeDrag) {
        window.removeEventListener("pointermove", activeDrag.move);
        window.removeEventListener("pointerup", activeDrag.up, true);
        window.removeEventListener("pointercancel", activeDrag.up, true);
      }
    };
  }, []);

  // Root cause of the drag-jump bug, confirmed via the diagnostic overlay:
  // Tailwind's `-translate-x-1/2` utility sets the `transform` property via
  // its own class, and an inline `style.transform = "none"` did NOT
  // override it (measured actual rendered position was consistently offset
  // from the intended state position by exactly half the panel's own
  // width — the signature of translateX(-50%) still being applied on top
  // of the new `left`). Rather than fight that specificity/cascade
  // question, the default-position classes (`bottom-4 left-1/2
  // -translate-x-1/2`) are simply omitted from the className once dragging
  // has set an explicit position, so there's no competing rule to override
  // in the first place.
  const positionStyle: CSSProperties = dragPosition
    ? {
        position: "fixed",
        left: dragPosition.left,
        top: dragPosition.top,
      }
    : {};
  const positionClassName = dragPosition
    ? ""
    : "absolute bottom-4 left-1/2 -translate-x-1/2";

  return (
    <div
      ref={panelRef}
      style={positionStyle}
      className={`${positionClassName} z-20 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-2xl p-3 min-w-[320px] max-w-[420px]`}
    >
      {/* Header — the whole row is the drag handle (see the pointerdown
          guard below that excludes the close button specifically) */}
      <div
        ref={dragHandleRef}
        className="flex items-center justify-between mb-1 cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: "none" }}
        title="Přetažením přesunete panel"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
            {title}
          </span>
          <Badge
            variant={exceedsWaypointLimit ? "destructive" : "secondary"}
            className="text-[10px] gap-1"
          >
            <MapPin className="h-3 w-3" />
            {waypointCount}{" "}
            {waypointCount === 1
              ? "bod trasy"
              : waypointCount >= 2 && waypointCount <= 4
                ? "body trasy"
                : "bodů trasy"}
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
          <div className="col-span-2">
            <Label className="text-[10px]">
              Vystředit na adresu nebo souřadnice
            </Label>
            <LocationSearch
              onLocationFound={(lat, lng) => {
                onOrbitChange({ ...orbitParams, center: [lat, lng] });
                setFlyToTarget([lat, lng]);
              }}
            />
          </div>
          <div>
            <Label
              className="text-[10px]"
              title="Vodorovná vzdálenost od středového bodu k letové trase."
            >
              Radius ({distanceLabel(unitSystem)})
            </Label>
            <NumericInput
              value={toDisplayDistance(orbitParams.radiusM, unitSystem)}
              onChange={(v) => {
                const radiusM = fromDisplayDistance(v, unitSystem);
                if (orbitParams.altitudeGimbalLinked) {
                  const framed = wideFov
                    ? computeFramedForRadius(
                        radiusM,
                        orbitParams.poiHeight,
                        wideFov.vfovDeg,
                        orbitParams.altitude,
                      )
                    : null;
                  onOrbitChange(
                    framed
                      ? {
                          ...orbitParams,
                          radiusM,
                          altitude: framed.altitude,
                          gimbalPitchDeg: framed.gimbalPitchDeg,
                        }
                      : {
                          ...orbitParams,
                          radiusM,
                          gimbalPitchDeg: computeGimbalPitch(
                            orbitParams.altitude,
                            orbitParams.poiHeight,
                            radiusM,
                          ),
                        },
                  );
                } else {
                  onOrbitChange({ ...orbitParams, radiusM });
                }
              }}
              min={5}
              step={5}
              fallback={5}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Body</Label>
            <NumericInput
              value={orbitParams.numPoints}
              onChange={(v) => onOrbitChange({ ...orbitParams, numPoints: v })}
              min={3}
              fallback={12}
              integer
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label
              className="text-[10px]"
              title={`Jak vysoko dron letí, ${heightModeText} (referenční výška této mise).`}
            >
              Výška letu ({heightLabel(unitSystem)})
            </Label>
            <NumericInput
              value={toDisplayHeight(orbitParams.altitude, unitSystem)}
              onChange={(v) => {
                const altitude = fromDisplayHeight(v, unitSystem);
                if (orbitParams.altitudeGimbalLinked) {
                  const framed = wideFov
                    ? computeFramedForAltitude(
                        altitude,
                        orbitParams.poiHeight,
                        wideFov.vfovDeg,
                        orbitParams.radiusM,
                      )
                    : null;
                  onOrbitChange(
                    framed
                      ? {
                          ...orbitParams,
                          altitude,
                          radiusM: framed.radiusM,
                          gimbalPitchDeg: framed.gimbalPitchDeg,
                        }
                      : {
                          ...orbitParams,
                          altitude,
                          gimbalPitchDeg: computeGimbalPitch(
                            altitude,
                            orbitParams.poiHeight,
                            orbitParams.radiusM,
                          ),
                        },
                  );
                } else {
                  onOrbitChange({ ...orbitParams, altitude });
                }
              }}
              min={5}
              step={5}
              fallback={30}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label
              className="text-[10px]"
              title={`Skutečná výška bodu, na který má kamera mířit (např. střecha), ${heightModeText} — stejná reference jako výška letu.`}
            >
              Výška POI ({heightLabel(unitSystem)})
            </Label>
            <NumericInput
              value={toDisplayHeight(orbitParams.poiHeight, unitSystem)}
              onChange={(v) => {
                const poiHeight = fromDisplayHeight(v, unitSystem);
                if (orbitParams.altitudeGimbalLinked) {
                  const framed = wideFov
                    ? computeFramedForRadius(
                        orbitParams.radiusM,
                        poiHeight,
                        wideFov.vfovDeg,
                        orbitParams.altitude,
                      )
                    : null;
                  onOrbitChange(
                    framed
                      ? {
                          ...orbitParams,
                          poiHeight,
                          altitude: framed.altitude,
                          gimbalPitchDeg: framed.gimbalPitchDeg,
                        }
                      : {
                          ...orbitParams,
                          poiHeight,
                          gimbalPitchDeg: computeGimbalPitch(
                            orbitParams.altitude,
                            poiHeight,
                            orbitParams.radiusM,
                          ),
                        },
                  );
                } else {
                  onOrbitChange({ ...orbitParams, poiHeight });
                }
              }}
              min={0}
              step={1}
              fallback={0}
              className="h-7 text-xs"
            />
          </div>
          <div className="col-span-2">
            <div className="flex items-center justify-between">
              <Label
                className="text-[10px]"
                title="Náklon kamery. -90° = přímo dolů, 0° = horizont."
              >
                Náklon gimbalu (°)
              </Label>
              <button
                type="button"
                onClick={() =>
                  onOrbitChange({
                    ...orbitParams,
                    altitudeGimbalLinked: !orbitParams.altitudeGimbalLinked,
                  })
                }
                title={
                  orbitParams.altitudeGimbalLinked
                    ? "Výška a náklon gimbalu se vzájemně automaticky aktualizují. Kliknutím uzamknete a upravíte je nezávisle."
                    : "Výška a náklon gimbalu jsou uzamčeny nezávisle. Kliknutím je znovu propojíte."
                }
                className="text-muted-foreground hover:text-foreground"
              >
                {orbitParams.altitudeGimbalLinked ? (
                  <Unlock className="h-3 w-3" />
                ) : (
                  <Lock className="h-3 w-3 text-amber-400" />
                )}
              </button>
            </div>
            <NumericInput
              value={orbitParams.gimbalPitchDeg}
              onChange={(v) => {
                if (orbitParams.altitudeGimbalLinked) {
                  const altitude = computeAltitudeForPitch(
                    v,
                    orbitParams.poiHeight,
                    orbitParams.radiusM,
                  );
                  // Re-derive pitch from the (possibly floor/ceiling-clamped)
                  // altitude so the displayed pitch never silently diverges
                  // from what the stored altitude actually produces.
                  onOrbitChange({
                    ...orbitParams,
                    altitude,
                    gimbalPitchDeg: computeGimbalPitch(
                      altitude,
                      orbitParams.poiHeight,
                      orbitParams.radiusM,
                    ),
                  });
                } else {
                  onOrbitChange({ ...orbitParams, gimbalPitchDeg: v });
                }
              }}
              min={-120}
              max={45}
              step={1}
              fallback={-45}
              className="h-7 text-xs"
            />
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {orbitParams.altitudeGimbalLinked
                ? wideFov
                  ? "Propojeno — úprava radiusu, výšky letu nebo výšky POI přepočítá zbylé hodnoty tak, aby byl celý objekt v záběru vybrané kamery."
                  : "Propojeno s výškou — změna kteréhokoliv přepočítá druhý z radiusu a výšky POI. FOV vybrané kamery není známé, přesné zarovnání na celý objekt není k dispozici."
                : "Uzamčeno — výška a náklon gimbalu se už vzájemně automaticky neaktualizují."}
            </div>
          </div>
          <div>
            <Label className="text-[10px]">Počáteční úhel (°)</Label>
            <NumericInput
              value={orbitParams.startAngleDeg}
              onChange={(v) =>
                onOrbitChange({ ...orbitParams, startAngleDeg: v })
              }
              min={-360}
              max={360}
              step={5}
              fallback={0}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">
              Koncový úhel (°, 360 = celý kruh)
            </Label>
            <NumericInput
              value={orbitParams.endAngleDeg}
              onChange={(v) =>
                onOrbitChange({ ...orbitParams, endAngleDeg: v })
              }
              min={orbitParams.startAngleDeg}
              max={720}
              step={5}
              fallback={360}
              className="h-7 text-xs"
            />
          </div>
          <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={orbitParams.clockwise}
                onChange={(e) =>
                  onOrbitChange({ ...orbitParams, clockwise: e.target.checked })
                }
                className="rounded"
              />
              Po směru hodin
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
              Středový POI
            </label>
            <label
              className="flex items-center gap-1.5 text-xs cursor-pointer"
              title="Zafixuje cíl kamery na aktuálním středu — přesun nebo změna radiusu orbitu pak s ním nehne, náklon gimbalu se dopočítá zvlášť pro každý bod trasy."
            >
              <input
                type="checkbox"
                checked={!!orbitParams.poiCenter}
                onChange={(e) =>
                  onOrbitChange({
                    ...orbitParams,
                    poiCenter: e.target.checked
                      ? orbitParams.center
                      : undefined,
                  })
                }
                className="rounded"
              />
              Uzamknout POI
            </label>
          </div>
          <div className="col-span-2">
            <CaptureModeToggle
              value={orbitParams.captureMode === "video" ? "video" : "photo"}
              onChange={(mode) =>
                onOrbitChange({ ...orbitParams, captureMode: mode })
              }
            />
          </div>
        </div>
      )}

      {/* Grid params */}
      {type === "grid" && gridParams && onGridChange && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <Label className="text-[10px]">
              Výška ({heightLabel(unitSystem)})
            </Label>
            <NumericInput
              value={toDisplayHeight(gridParams.altitude, unitSystem)}
              onChange={(v) =>
                onGridChange({
                  ...gridParams,
                  altitude: fromDisplayHeight(v, unitSystem),
                })
              }
              min={5}
              step={5}
              fallback={80}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">
              Rozestup řádků ({distanceLabel(unitSystem)})
            </Label>
            <NumericInput
              value={toDisplayDistance(gridParams.spacingM, unitSystem)}
              onChange={(v) =>
                onGridChange({
                  ...gridParams,
                  spacingM: fromDisplayDistance(v, unitSystem),
                })
              }
              min={3}
              step={5}
              fallback={30}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label
              className="text-[10px]"
              title="Vzdálenost mezi fotkami podél každého letového řádku (podél trati). Bez toho by byly vyfoceny jen oba konce každé řady."
            >
              Rozestup fotek ({distanceLabel(unitSystem)})
            </Label>
            <NumericInput
              value={toDisplayDistance(
                gridParams.photoSpacingM ?? gridParams.spacingM,
                unitSystem,
              )}
              onChange={(v) =>
                onGridChange({
                  ...gridParams,
                  photoSpacingM: fromDisplayDistance(v, unitSystem),
                })
              }
              min={1}
              step={1}
              fallback={20}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Rotace (°)</Label>
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
          <div>
            <Label className="text-[10px]">Podélný překryv (%)</Label>
            <NumericInput
              value={gridFrontOverlapPct}
              onChange={setGridFrontOverlapPct}
              min={10}
              max={95}
              step={5}
              fallback={75}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Boční překryv (%)</Label>
            <NumericInput
              value={gridSideOverlapPct}
              onChange={setGridSideOverlapPct}
              min={10}
              max={95}
              step={5}
              fallback={65}
              className="h-7 text-xs"
            />
          </div>
          {(() => {
            const rec = recommendGridSpacing(
              gridParams.altitude,
              payloadEnumValue,
              gridFrontOverlapPct,
              gridSideOverlapPct,
            );
            if (!rec) {
              return (
                <div className="col-span-2 text-[10px] text-muted-foreground">
                  Zorné pole aktuální kamery není známé — nastavte rozestup
                  ručně.
                </div>
              );
            }
            const gsdCm = computeGsdCm(gridParams.altitude, payloadEnumValue);
            return (
              <div className="col-span-2 flex flex-col gap-1 text-[10px] text-muted-foreground bg-muted/20 rounded-md px-2 py-1">
                <div className="flex items-center justify-between gap-2">
                  <span>
                    Doporučeno pro {wideFov?.label} v této výšce:{" "}
                    {Math.round(
                      toDisplayDistance(rec.lineSpacingM, unitSystem),
                    )}
                    {distanceLabel(unitSystem)} řádek /{" "}
                    {Math.round(
                      toDisplayDistance(rec.photoSpacingM, unitSystem),
                    )}
                    {distanceLabel(unitSystem)} fotka
                    {gsdCm !== null && ` · GSD ${gsdCm.toFixed(1)} cm/px`}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-5 text-[10px] px-2 shrink-0"
                    onClick={() =>
                      onGridChange({
                        ...gridParams,
                        spacingM: rec.lineSpacingM,
                        photoSpacingM: rec.photoSpacingM,
                      })
                    }
                  >
                    Použít
                  </Button>
                </div>
                {gsdCm === null && (
                  <div>
                    Rozlišení kamery není známé — GSD nelze spočítat, ale
                    doporučený rozestup podle zorného pole platí.
                  </div>
                )}
                {wideFov?.experimental && (
                  <div className="text-amber-500">
                    Identita tohoto dronu/kamery není potvrzená (žádná
                    zveřejněná specifikace DJI) — považujte toto doporučení za
                    orientační, dokud nebude ověřeno na reálném hardwaru.
                  </div>
                )}
              </div>
            );
          })()}
          <div>
            <CaptureModeToggle
              value={gridParams.captureMode === "video" ? "video" : "photo"}
              onChange={(mode) =>
                onGridChange({
                  ...gridParams,
                  captureMode: mode,
                  addPhotos: mode === "photo",
                })
              }
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={gridParams.reverse}
                onChange={(e) =>
                  onGridChange({ ...gridParams, reverse: e.target.checked })
                }
                className="rounded"
              />
              Obrátit směr
            </label>
          </div>
        </div>
      )}

      {/* Facade params */}
      {type === "facade" && facadeParams && onFacadeChange && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <Label className="text-[10px]">
              Vzdálenost od stěny ({distanceLabel(unitSystem)})
            </Label>
            <NumericInput
              value={toDisplayDistance(facadeParams.distanceM, unitSystem)}
              onChange={(v) =>
                onFacadeChange({
                  ...facadeParams,
                  distanceM: fromDisplayDistance(v, unitSystem),
                })
              }
              min={3}
              step={5}
              fallback={20}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">
              Min. výška ({heightLabel(unitSystem)})
            </Label>
            <NumericInput
              value={toDisplayHeight(facadeParams.minAltitude, unitSystem)}
              onChange={(v) => {
                const metricV = fromDisplayHeight(v, unitSystem);
                onFacadeChange({
                  ...facadeParams,
                  minAltitude: metricV,
                  maxAltitude: Math.max(metricV + 5, facadeParams.maxAltitude),
                });
              }}
              min={2}
              step={5}
              fallback={10}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">
              Max. výška ({heightLabel(unitSystem)})
            </Label>
            <NumericInput
              value={toDisplayHeight(facadeParams.maxAltitude, unitSystem)}
              onChange={(v) =>
                onFacadeChange({
                  ...facadeParams,
                  maxAltitude: Math.max(
                    facadeParams.minAltitude + 5,
                    fromDisplayHeight(v, unitSystem),
                  ),
                })
              }
              min={toDisplayHeight(facadeParams.minAltitude + 5, unitSystem)}
              step={5}
              fallback={30}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Řady</Label>
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
            <Label className="text-[10px]">Sloupce</Label>
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
          <div>
            <CaptureModeToggle
              value={facadeParams.captureMode === "video" ? "video" : "photo"}
              onChange={(mode) =>
                onFacadeChange({
                  ...facadeParams,
                  captureMode: mode,
                  addPhotos: mode === "photo",
                })
              }
            />
          </div>
        </div>
      )}

      {/* Pencil params */}
      {type === "pencil" && pencilParams && onPencilChange && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <Label className="text-[10px]">Body trasy</Label>
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
            <Label className="text-[10px]">
              Výška ({heightLabel(unitSystem)})
            </Label>
            <NumericInput
              value={toDisplayHeight(pencilParams.altitude, unitSystem)}
              onChange={(v) =>
                onPencilChange({
                  ...pencilParams,
                  altitude: fromDisplayHeight(v, unitSystem),
                })
              }
              min={5}
              step={5}
              fallback={30}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">
              Rychlost ({speedLabel(unitSystem)})
            </Label>
            <NumericInput
              value={toDisplaySpeed(pencilParams.speed, unitSystem)}
              onChange={(v) =>
                onPencilChange({
                  ...pencilParams,
                  speed: fromDisplaySpeed(v, unitSystem),
                })
              }
              min={speedRange(unitSystem).min}
              max={speedRange(unitSystem).max}
              step={speedRange(unitSystem).step}
              fallback={7}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Náklon gimbalu (°)</Label>
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
              Obrátit směr
            </label>
          </div>
          <div>
            <CaptureModeToggle
              value={pencilParams.captureMode === "video" ? "video" : "photo"}
              onChange={(mode) =>
                onPencilChange({ ...pencilParams, captureMode: mode })
              }
            />
          </div>
          {pois && pois.length > 0 && (
            <div>
              <Label className="text-[10px]">Mířit na POI</Label>
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
                  <SelectItem value="none">Žádný (sledovat trasu)</SelectItem>
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

      {/* Solar params */}
      {type === "solar" && solarParams && onSolarChange && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <Label
              className="text-[10px]"
              title={`Jak vysoko dron letí, ${heightModeText} (referenční výška této mise).`}
            >
              Výška ({heightLabel(unitSystem)})
            </Label>
            <NumericInput
              value={toDisplayHeight(solarParams.altitude, unitSystem)}
              onChange={(v) =>
                onSolarChange({
                  ...solarParams,
                  altitude: fromDisplayHeight(v, unitSystem),
                })
              }
              min={5}
              step={5}
              fallback={30}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label
              className="text-[10px]"
              title="Kompasový směr, ve kterém vedou letové řádky, nastavený referenční čárou nakreslenou podél řady panelů."
            >
              Úhel řady
            </Label>
            <div className="h-7 flex items-center text-xs px-2 rounded-md border border-input bg-muted/30">
              {Math.round(solarParams.rowAngleDeg)}&deg;
            </div>
          </div>
          <div>
            <Label
              className="text-[10px]"
              title="Vzdálenost mezi letovými řádky (napříč tratí). Menší rozestup dává větší překryv termálních snímků, ale delší let."
            >
              Rozestup řádků ({distanceLabel(unitSystem)})
            </Label>
            <NumericInput
              value={toDisplayDistance(solarParams.spacingM, unitSystem)}
              onChange={(v) =>
                onSolarChange({
                  ...solarParams,
                  spacingM: fromDisplayDistance(v, unitSystem),
                })
              }
              min={2}
              step={1}
              fallback={10}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label
              className="text-[10px]"
              title="Vzdálenost mezi fotkami podél každého letového řádku (podél trati). Bez toho by byly vyfoceny jen oba konce každé řady."
            >
              Rozestup fotek ({distanceLabel(unitSystem)})
            </Label>
            <NumericInput
              value={toDisplayDistance(solarParams.photoSpacingM, unitSystem)}
              onChange={(v) =>
                onSolarChange({
                  ...solarParams,
                  photoSpacingM: fromDisplayDistance(v, unitSystem),
                })
              }
              min={1}
              step={1}
              fallback={8}
              className="h-7 text-xs"
            />
          </div>
          {(() => {
            const fov = THERMAL_CAMERA_FOV[payloadEnumValue];
            const rec = fov
              ? recommendSolarSpacing(solarParams.altitude, payloadEnumValue)
              : null;
            if (!rec) {
              return (
                <div className="col-span-2 text-[10px] text-muted-foreground">
                  Zorné pole aktuální kamery není známé — nastavte rozestup
                  ručně. (Doporučený rozestup je k dispozici pro termální kamery
                  DJI: H20T, M30T, M3T, M3TD, Matrice 4T.)
                </div>
              );
            }
            return (
              <div className="col-span-2 flex flex-col gap-1 text-[10px] text-muted-foreground bg-muted/20 rounded-md px-2 py-1">
                <div className="flex items-center justify-between gap-2">
                  <span>
                    Doporučeno pro {fov.label} v této výšce:{" "}
                    {Math.round(
                      toDisplayDistance(rec.lineSpacingM, unitSystem),
                    )}
                    {distanceLabel(unitSystem)} řádek /{" "}
                    {Math.round(
                      toDisplayDistance(rec.photoSpacingM, unitSystem),
                    )}
                    {distanceLabel(unitSystem)} fotka
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-5 text-[10px] px-2 shrink-0"
                    onClick={() =>
                      onSolarChange({
                        ...solarParams,
                        spacingM: rec.lineSpacingM,
                        photoSpacingM: rec.photoSpacingM,
                      })
                    }
                  >
                    Použít
                  </Button>
                </div>
                {fov.experimental && (
                  <div className="text-amber-500">
                    Identita tohoto dronu/kamery není potvrzená (žádná
                    zveřejněná specifikace DJI) — považujte toto doporučení za
                    orientační, dokud nebude ověřeno na reálném hardwaru.
                  </div>
                )}
              </div>
            );
          })()}
          <div className="col-span-2">
            <CaptureModeToggle
              value={solarParams.captureMode === "video" ? "video" : "photo"}
              onChange={(mode) =>
                onSolarChange({
                  ...solarParams,
                  captureMode: mode,
                  addPhotos: mode === "photo",
                })
              }
            />
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Foto: termální (IR) fotka na každém bodu trasy. Video: termální
              záznam od prvního do posledního bodu trasy.
            </div>
          </div>
          <div className="col-span-2 text-[10px] text-muted-foreground">
            Gimbal je pevně nastaven přímo dolů (nadir) — standardní kompozice
            pro fotografování ploché plochy panelů shora.
          </div>
        </div>
      )}

      {exceedsWaypointLimit && (
        <div className="text-[10px] text-destructive mb-2">
          Tímto by vzniklo {waypointCount} bodů trasy, nad limit mise{" "}
          {MAX_WAYPOINTS} — před použitím zvyšte rozestup.
        </div>
      )}

      {/* Save as reusable preset */}
      {currentParams &&
        (savingPreset ? (
          <div className="flex items-center gap-1.5 mb-2">
            <Input
              autoFocus
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSavePreset();
                if (e.key === "Escape") {
                  setSavingPreset(false);
                  setPresetName("");
                }
              }}
              placeholder="Název šablony"
              className="h-7 text-xs flex-1"
            />
            <Button
              size="icon"
              className="h-7 w-7 shrink-0"
              disabled={!presetName.trim() || presetSaveInFlight}
              onClick={handleSavePreset}
              title="Uložit šablonu"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => {
                setSavingPreset(false);
                setPresetName("");
              }}
              title="Zrušit"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={!token}
            title={
              token
                ? "Uložit aktuální nastavení jako znovupoužitelnou šablonu"
                : "Přihlaste se pro ukládání šablon"
            }
            onClick={() => setSavingPreset(true)}
            className="w-full h-7 text-xs mb-2"
          >
            <Save className="h-3 w-3 mr-1" />
            Uložit jako šablonu
          </Button>
        ))}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onApply}
          disabled={exceedsWaypointLimit}
          className="flex-1 h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
        >
          <Check className="h-3 w-3 mr-1" />
          Použít
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="h-7 text-xs"
        >
          Zrušit
        </Button>
      </div>
    </div>
  );
}
