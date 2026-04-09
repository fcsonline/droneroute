import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useMapEvents, Polyline } from "react-leaflet";
import { useMissionStore } from "@/store/missionStore";
import { TemplateConfigPanel } from "./TemplateConfigPanel";
import { TemplatePreview } from "./TemplatePreview";
import type { PencilParams } from "@/lib/templates";
import { generatePencil, pathLength, DEFAULT_PENCIL_PARAMS } from "@/lib/templates";

const MIN_PATH_LENGTH_M = 10; // minimum path length in meters to accept

export function PencilDrawHandler() {
  const templateMode = useMissionStore((s) => s.templateMode);
  const setTemplateMode = useMissionStore((s) => s.setTemplateMode);
  const appendWaypoints = useMissionStore((s) => s.appendWaypoints);
  const pois = useMissionStore((s) => s.pois);

  const [rawPath, setRawPath] = useState<[number, number][]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [pencilParams, setPencilParams] = useState<PencilParams | null>(null);

  // Use refs for values accessed inside Leaflet event handlers (avoids stale closures)
  const drawingRef = useRef(false);
  const pathRef = useRef<[number, number][]>([]);
  const lastPointTime = useRef(0);

  const resetState = useCallback(() => {
    drawingRef.current = false;
    pathRef.current = [];
    lastPointTime.current = 0;
    setRawPath([]);
    setConfirmed(false);
    setPencilParams(null);
  }, []);

  // Reset when templateMode changes (e.g. Escape, switching type)
  useEffect(() => {
    resetState();
  }, [templateMode, resetState]);

  useMapEvents({
    mousedown(e) {
      if (templateMode !== "pencil" || confirmed) return;
      e.originalEvent.preventDefault();
      e.target.dragging?.disable();
      const pos: [number, number] = [e.latlng.lat, e.latlng.lng];
      drawingRef.current = true;
      pathRef.current = [pos];
      lastPointTime.current = Date.now();
      setRawPath([pos]);
    },
    mousemove(e) {
      if (!drawingRef.current) return;
      // Throttle to ~60fps (16ms) to avoid excessive re-renders
      const now = Date.now();
      if (now - lastPointTime.current < 16) return;
      lastPointTime.current = now;
      const pos: [number, number] = [e.latlng.lat, e.latlng.lng];
      pathRef.current = [...pathRef.current, pos];
      setRawPath([...pathRef.current]);
    },
    mouseup(e) {
      if (!drawingRef.current || templateMode !== "pencil") return;
      e.target.dragging?.enable();
      drawingRef.current = false;

      // Add the final point
      const finalPos: [number, number] = [e.latlng.lat, e.latlng.lng];
      const finalPath = [...pathRef.current, finalPos];
      pathRef.current = finalPath;
      setRawPath(finalPath);

      // Check minimum path length
      const totalLen = pathLength(finalPath);
      if (totalLen < MIN_PATH_LENGTH_M) {
        resetState();
        return;
      }

      // Create initial params
      setPencilParams({
        ...DEFAULT_PENCIL_PARAMS,
        path: finalPath,
      });
      setConfirmed(true);
    },
  });

  // Generate preview from current params
  const preview = useMemo(() => {
    if (!pencilParams) return null;
    return generatePencil(pencilParams);
  }, [pencilParams]);

  if (templateMode !== "pencil") return null;

  const handleApply = () => {
    if (preview) {
      appendWaypoints(preview.waypoints, preview.pois);
    }
    resetState();
  };

  const handleCancel = () => {
    resetState();
    setTemplateMode(null);
  };

  return (
    <>
      {/* Raw path while drawing (live feedback) */}
      {drawingRef.current && rawPath.length >= 2 && (
        <Polyline
          positions={rawPath}
          pathOptions={{
            color: "#a78bfa",
            weight: 3,
            opacity: 0.8,
          }}
        />
      )}

      {/* Original drawn path (faded) after confirming, behind the preview */}
      {confirmed && rawPath.length >= 2 && (
        <Polyline
          positions={rawPath}
          pathOptions={{
            color: "#a78bfa",
            weight: 2,
            opacity: 0.25,
          }}
        />
      )}

      {/* Preview waypoints */}
      {confirmed && preview && <TemplatePreview result={preview} />}

      {/* Config panel (shown after drawing completes) */}
      {confirmed && pencilParams && (
         <TemplateConfigPanel
          type="pencil"
          pencilParams={pencilParams}
          onPencilChange={setPencilParams}
          onApply={handleApply}
          onCancel={handleCancel}
          waypointCount={preview?.waypoints.length ?? 0}
          pois={pois}
        />
      )}
    </>
  );
}
