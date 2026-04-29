import { useState, useCallback, useMemo, useEffect } from "react";
import { useMapEvents, Polyline, CircleMarker, Polygon } from "react-leaflet";
import { useMissionStore } from "@/store/missionStore";
import { TemplateConfigPanel } from "./TemplateConfigPanel";
import { TemplatePreview } from "./TemplatePreview";
import {
  generateAreaSurvey,
  DEFAULT_AREA_SURVEY_PARAMS,
  CAMERA_PRESETS,
  getCameraPresetForDrone,
  getDroneForCameraPreset,
  type AreaSurveyParams,
  type CameraPresetKey,
  type ObliqueSurveyResult,
} from "@/lib/templates";

export function AreaDrawHandler() {
  const templateMode = useMissionStore((s) => s.templateMode);
  const setTemplateMode = useMissionStore((s) => s.setTemplateMode);
  const appendWaypoints = useMissionStore((s) => s.appendWaypoints);
  const config = useMissionStore((s) => s.config);
  const setConfig = useMissionStore((s) => s.setConfig);

  const [vertices, setVertices] = useState<[number, number][]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [areaSurveyParams, setAreaSurveyParams] =
    useState<AreaSurveyParams | null>(null);

  const ALL_OBLIQUE_PATHS: Set<keyof ObliqueSurveyResult> = new Set(['nadir', 'a', 'b', 'c', 'd']);
  const [selectedObliquePaths, setSelectedObliquePaths] =
    useState<Set<keyof ObliqueSurveyResult>>(ALL_OBLIQUE_PATHS);

  const resetState = useCallback(() => {
    setVertices([]);
    setConfirmed(false);
    setAreaSurveyParams(null);
    setSelectedObliquePaths(new Set(['nadir', 'a', 'b', 'c', 'd']));
  }, []);

  useEffect(() => {
    if (templateMode !== "area") resetState();
  }, [templateMode, resetState]);

  useEffect(() => {
    if (templateMode !== "area") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        resetState();
        setTemplateMode(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [templateMode, resetState, setTemplateMode]);

  // Sync drone selection → survey camera whenever the mission config drone/payload changes.
  useEffect(() => {
    if (!areaSurveyParams) return;
    const presetKey = getCameraPresetForDrone(
      config.droneEnumValue,
      config.droneSubEnumValue,
      config.payloadEnumValue,
    );
    if (!presetKey) return;
    const newCamera = CAMERA_PRESETS[presetKey];
    if (newCamera.label !== areaSurveyParams.camera.label) {
      setAreaSurveyParams((prev) => (prev ? { ...prev, camera: newCamera } : prev));
    }
  }, [config.droneEnumValue, config.droneSubEnumValue, config.payloadEnumValue]);

  // Wraps setAreaSurveyParams: when the camera changes, syncs the mission config drone to match.
  const handleAreaSurveyChange = useCallback(
    (params: AreaSurveyParams) => {
      if (areaSurveyParams && params.camera.label !== areaSurveyParams.camera.label) {
        const presetKey = (Object.keys(CAMERA_PRESETS) as CameraPresetKey[]).find(
          (k) => CAMERA_PRESETS[k].label === params.camera.label,
        );
        if (presetKey) {
          const droneConfig = getDroneForCameraPreset(
            presetKey,
            config.droneEnumValue,
            config.droneSubEnumValue,
            config.payloadEnumValue,
          );
          if (droneConfig) setConfig(droneConfig);
        }
      }
      setAreaSurveyParams(params);
    },
    [areaSurveyParams, config, setConfig],
  );

  const closePolygon = useCallback(
    (verts: [number, number][]) => {
      if (verts.length < 3) return;
      setConfirmed(true);
      const presetKey = getCameraPresetForDrone(
        config.droneEnumValue,
        config.droneSubEnumValue,
        config.payloadEnumValue,
      );
      const camera = presetKey ? CAMERA_PRESETS[presetKey] : DEFAULT_AREA_SURVEY_PARAMS.camera;
      setAreaSurveyParams({ ...DEFAULT_AREA_SURVEY_PARAMS, vertices: verts, camera });
    },
    [config.droneEnumValue, config.droneSubEnumValue, config.payloadEnumValue],
  );

  useMapEvents({
    click(e) {
      if (templateMode !== "area" || confirmed) return;

      const newVertex: [number, number] = [e.latlng.lat, e.latlng.lng];

      if (vertices.length >= 3) {
        const [firstLat, firstLng] = vertices[0];
        const map = e.target;
        const firstPoint = map.latLngToContainerPoint([firstLat, firstLng]);
        const clickPoint = map.latLngToContainerPoint(e.latlng);
        if (firstPoint.distanceTo(clickPoint) < 15) {
          closePolygon(vertices);
          return;
        }
      }

      setVertices((prev) => [...prev, newVertex]);
    },
    dblclick(e) {
      if (templateMode !== "area" || confirmed) return;
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();
      if (vertices.length >= 3) closePolygon(vertices);
    },
  });

  const preview = useMemo(() => {
    if (!areaSurveyParams) return null;
    return generateAreaSurvey(areaSurveyParams);
  }, [areaSurveyParams]);

  const handleToggleObliquePath = useCallback((path: keyof ObliqueSurveyResult) => {
    setSelectedObliquePaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const obliquePathLabels = useMemo((): Record<keyof ObliqueSurveyResult, string> | undefined => {
    if (!preview?.oblique) return undefined;
    const rot = areaSurveyParams?.rotationDeg ?? (preview.metadata?.autoRotationDeg ?? 0);
    const brg = (offset: number) => Math.round(((rot + offset) % 360 + 360) % 360);
    return {
      nadir: 'Nadir — straight down',
      a: `Pass A — bearing ${brg(0)}°`,
      b: `Pass B — bearing ${brg(90)}°`,
      c: `Pass C — bearing ${brg(180)}°`,
      d: `Pass D — bearing ${brg(270)}°`,
    };
  }, [preview, areaSurveyParams]);

  if (templateMode !== "area") return null;

  const positions = vertices.map(([lat, lng]) => [lat, lng] as [number, number]);

  const handleApply = () => {
    if (!preview) return;

    if (!preview.oblique) {
      appendWaypoints(preview.waypoints, preview.pois);
    } else {
      const tag = (wps: typeof preview.waypoints, name: string) =>
        wps.length === 0 ? wps : [{ ...wps[0], name }, ...wps.slice(1)];

      const allEntries: [keyof ObliqueSurveyResult, string][] = [
        ['nadir', 'Area survey — nadir'],
        ['a',     obliquePathLabels?.a     ?? 'Oblique pass A'],
        ['b',     obliquePathLabels?.b     ?? 'Oblique pass B'],
        ['c',     obliquePathLabels?.c     ?? 'Oblique pass C'],
        ['d',     obliquePathLabels?.d     ?? 'Oblique pass D'],
      ];

      const selected = allEntries
        .filter(([key]) => selectedObliquePaths.has(key))
        .flatMap(([key, label]) => tag(preview.oblique![key], label));

      appendWaypoints(selected, preview.pois);
    }

    resetState();
  };

  const handleCancel = () => {
    resetState();
    setTemplateMode(null);
  };

  return (
    <>
      {/* Vertex markers while drawing */}
      {!confirmed &&
        positions.map((pos, i) => (
          <CircleMarker
            key={`area-v-${i}`}
            center={pos}
            radius={i === 0 ? 7 : 5}
            pathOptions={{
              color: "#a78bfa",
              fillColor: i === 0 ? "#c4b5fd" : "#ffffff",
              fillOpacity: 1,
              weight: 2,
            }}
          />
        ))}

      {/* Edges while drawing */}
      {!confirmed && positions.length >= 2 && (
        <Polyline
          positions={positions}
          pathOptions={{
            color: "#a78bfa",
            weight: 2,
            dashArray: "6, 4",
            opacity: 0.8,
          }}
        />
      )}

      {/* Closing-line preview */}
      {!confirmed && positions.length >= 3 && (
        <Polyline
          positions={[positions[positions.length - 1], positions[0]]}
          pathOptions={{
            color: "#a78bfa",
            weight: 1.5,
            dashArray: "4, 6",
            opacity: 0.4,
          }}
        />
      )}

      {/* Filled polygon boundary when confirmed */}
      {confirmed && positions.length >= 3 && (
        <Polygon
          positions={positions}
          pathOptions={{
            color: "#a78bfa",
            weight: 2,
            opacity: 0.6,
            fillColor: "#a78bfa",
            fillOpacity: 0.1,
            dashArray: "6, 4",
          }}
        />
      )}

      {/* Preview waypoints */}
      {confirmed && preview && (
        <TemplatePreview
          result={preview}
          selectedObliquePaths={areaSurveyParams?.oblique ? selectedObliquePaths : undefined}
        />
      )}

      {/* Config panel */}
      {confirmed && (
        <TemplateConfigPanel
          type="area"
          areaSurveyParams={areaSurveyParams}
          onAreaSurveyChange={handleAreaSurveyChange}
          onApply={handleApply}
          onCancel={handleCancel}
          waypointCount={
            preview?.oblique
              ? (preview.oblique.nadir.length + preview.oblique.a.length +
                 preview.oblique.b.length + preview.oblique.c.length +
                 preview.oblique.d.length)
              : (preview?.waypoints.length ?? 0)
          }
          selectedObliquePaths={areaSurveyParams?.oblique ? selectedObliquePaths : undefined}
          obliquePathLabels={obliquePathLabels}
          onObliquePathToggle={handleToggleObliquePath}
        />
      )}
    </>
  );
}
