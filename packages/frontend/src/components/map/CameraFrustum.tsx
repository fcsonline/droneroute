import { useMemo } from "react";
import { Source, Layer } from "react-map-gl/mapbox";
import type { Waypoint, PointOfInterest } from "@droneroute/shared";

interface CameraFrustumProps {
  waypoint: Waypoint;
  pois: PointOfInterest[];
  is3D: boolean;
}

/** Default camera FOV — typical DJI wide-angle lens. */
const H_FOV_DEG = 84;
const V_FOV_DEG = 63;
/** Distance from camera to image plane in meters. */
const PLANE_DIST = 15;

function deg2rad(d: number) {
  return (d * Math.PI) / 180;
}

/** Offset a [lat, lng] by meters in north/east directions. */
function offsetMeters(
  lat: number,
  lng: number,
  northM: number,
  eastM: number,
): [number, number] {
  const dLat = northM / 111320;
  const dLng = eastM / (111320 * Math.cos(deg2rad(lat)));
  return [lat + dLat, lng + dLng];
}

/** Bearing from point 1 to point 2 in degrees (0 = north, CW). */
function bearingTo(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const φ1 = deg2rad(lat1);
  const φ2 = deg2rad(lat2);
  const Δλ = deg2rad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function resolveHeading(wp: Waypoint, pois: PointOfInterest[]): number {
  if (wp.headingMode === "towardPOI" && wp.poiId) {
    const poi = pois.find((p) => p.id === wp.poiId);
    if (poi) {
      return bearingTo(wp.latitude, wp.longitude, poi.latitude, poi.longitude);
    }
  }
  return wp.headingAngle ?? 0;
}

/**
 * Compute the 4 corners of the image plane (near plane) at PLANE_DIST
 * from the camera. Returns [lat, lng, altitude] for each corner.
 */
function computePlaneCorners(
  lat: number,
  lng: number,
  altitudeM: number,
  headingDeg: number,
  gimbalPitchDeg: number,
): [number, number, number][] {
  const hHalf = Math.tan(deg2rad(H_FOV_DEG / 2)) * PLANE_DIST;
  const vHalf = Math.tan(deg2rad(V_FOV_DEG / 2)) * PLANE_DIST;

  const pitchRad = deg2rad(gimbalPitchDeg);
  const headingRad = deg2rad(headingDeg);

  const cosPitch = Math.cos(pitchRad);
  const sinPitch = Math.sin(pitchRad);

  // Forward (heading + pitch)
  const fwdE = Math.sin(headingRad) * cosPitch;
  const fwdN = Math.cos(headingRad) * cosPitch;
  const fwdU = sinPitch;

  // Right (horizontal, perpendicular to heading)
  const rightE = Math.cos(headingRad);
  const rightN = -Math.sin(headingRad);

  // Up (perpendicular to forward and right)
  const upE = -Math.sin(headingRad) * sinPitch;
  const upN = -Math.cos(headingRad) * sinPitch;
  const upU = cosPitch;

  // Center of the image plane
  const cE = fwdE * PLANE_DIST;
  const cN = fwdN * PLANE_DIST;
  const cU = fwdU * PLANE_DIST;

  // 4 corners: TL, TR, BR, BL
  const offsets = [
    { h: -hHalf, v: vHalf },
    { h: hHalf, v: vHalf },
    { h: hHalf, v: -vHalf },
    { h: -hHalf, v: -vHalf },
  ];

  return offsets.map(({ h, v }) => {
    const pE = cE + rightE * h + upE * v;
    const pN = cN + rightN * h + upN * v;
    const pU = cU + upU * v;
    const [pLat, pLng] = offsetMeters(lat, lng, pN, pE);
    return [pLat, pLng, altitudeM + pU];
  });
}

/**
 * Renders a camera FOV frustum for the selected waypoint.
 * Shows 4 lines from camera to image plane corners + the plane rectangle.
 */
export function CameraFrustum({ waypoint, pois, is3D }: CameraFrustumProps) {
  const heading = useMemo(
    () => resolveHeading(waypoint, pois),
    [waypoint, pois],
  );

  const corners = useMemo(
    () =>
      computePlaneCorners(
        waypoint.latitude,
        waypoint.longitude,
        waypoint.height,
        heading,
        waypoint.gimbalPitchAngle,
      ),
    [
      waypoint.latitude,
      waypoint.longitude,
      waypoint.height,
      waypoint.gimbalPitchAngle,
      heading,
    ],
  );

  // 4 edge lines from camera to each corner of the image plane
  const edgesGeojson = useMemo(() => {
    const wpCoord = [waypoint.longitude, waypoint.latitude];
    const features = corners.map((c) => ({
      type: "Feature" as const,
      properties: {
        zStart: waypoint.height,
        zEnd: c[2],
      },
      geometry: {
        type: "LineString" as const,
        coordinates: [wpCoord, [c[1], c[0]]],
      },
    }));
    return { type: "FeatureCollection" as const, features };
  }, [waypoint.longitude, waypoint.latitude, waypoint.height, corners]);

  // Image plane rectangle outline
  const planeGeojson = useMemo(() => {
    const coords = corners.map((c) => [c[1], c[0]]);
    // Close the ring and make 4 separate line segments for z-offset
    const features = corners.map((c, i) => {
      const next = corners[(i + 1) % 4];
      return {
        type: "Feature" as const,
        properties: {
          zStart: c[2],
          zEnd: next[2],
        },
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [c[1], c[0]],
            [next[1], next[0]],
          ],
        },
      };
    });

    return { type: "FeatureCollection" as const, features };
  }, [corners]);

  // 2D mode: rectangle fill + 4 edge lines from camera to corners
  const flatRectGeojson = useMemo(() => {
    const ring = [
      ...corners.map((c) => [c[1], c[0]]),
      [corners[0][1], corners[0][0]],
    ];
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "Polygon" as const,
        coordinates: [ring],
      },
    };
  }, [corners]);

  const flatEdgesGeojson = useMemo(() => {
    const wpCoord = [waypoint.longitude, waypoint.latitude];
    const features = corners.map((c) => ({
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: [wpCoord, [c[1], c[0]]],
      },
    }));
    return { type: "FeatureCollection" as const, features };
  }, [waypoint.longitude, waypoint.latitude, corners]);

  return (
    <>
      {/* 2D: image plane rectangle fill + outline */}
      <Source id="camera-frustum-2d" type="geojson" data={flatRectGeojson}>
        <Layer
          id="camera-frustum-2d-fill"
          type="fill"
          paint={{
            "fill-color": "#94a3b8",
            "fill-opacity": is3D ? 0 : 0.12,
          }}
        />
        <Layer
          id="camera-frustum-2d-outline"
          type="line"
          paint={{
            "line-color": "#94a3b8",
            "line-width": 1.5,
            "line-opacity": is3D ? 0 : 0.5,
          }}
        />
      </Source>

      {/* 2D: 4 edge lines from camera to corners */}
      <Source
        id="camera-frustum-2d-edges"
        type="geojson"
        data={flatEdgesGeojson}
      >
        <Layer
          id="camera-frustum-2d-edges-layer"
          type="line"
          paint={{
            "line-color": "#94a3b8",
            "line-width": 1.5,
            "line-opacity": is3D ? 0 : 0.5,
          }}
        />
      </Source>

      {/* 3D: 4 edge lines from camera to image plane corners */}
      <Source
        id="camera-frustum-edges"
        type="geojson"
        data={edgesGeojson}
        lineMetrics
      >
        <Layer
          id="camera-frustum-edges-layer"
          type="line"
          paint={{
            "line-color": "#94a3b8",
            "line-width": 2,
            "line-opacity": is3D ? 0.7 : 0,
          }}
          layout={
            is3D
              ? ({
                  "line-z-offset": [
                    "interpolate",
                    ["linear"],
                    ["line-progress"],
                    0,
                    ["get", "zStart"],
                    1,
                    ["get", "zEnd"],
                  ],
                } as any)
              : {}
          }
        />
      </Source>

      {/* 3D: image plane rectangle */}
      <Source
        id="camera-frustum-plane"
        type="geojson"
        data={planeGeojson}
        lineMetrics
      >
        <Layer
          id="camera-frustum-plane-layer"
          type="line"
          paint={{
            "line-color": "#94a3b8",
            "line-width": 2,
            "line-opacity": is3D ? 0.8 : 0,
          }}
          layout={
            is3D
              ? ({
                  "line-z-offset": [
                    "interpolate",
                    ["linear"],
                    ["line-progress"],
                    0,
                    ["get", "zStart"],
                    1,
                    ["get", "zEnd"],
                  ],
                } as any)
              : {}
          }
        />
      </Source>
    </>
  );
}
