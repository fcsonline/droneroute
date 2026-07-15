import { describe, it, expect } from "vitest";
import {
  generateOrbit,
  DEFAULT_ORBIT_PARAMS,
  computeGimbalPitch,
  computeAltitudeForPitch,
  computeFramedForRadius,
  computeFramedForAltitude,
  computeOrbitSeedForBuilding,
  orbitParamsForBuilding,
  generateSolarSurvey,
  DEFAULT_SOLAR_PARAMS,
  generateGrid,
  DEFAULT_GRID_PARAMS,
  generateFacade,
  DEFAULT_FACADE_PARAMS,
  generatePencil,
  DEFAULT_PENCIL_PARAMS,
  bearing,
  destinationPoint,
} from "./templates";
import type {
  OrbitParams,
  SolarParams,
  GridParams,
  FacadeParams,
} from "./templates";
import {
  recommendSolarSpacing,
  recommendGridSpacing,
  computeGsdCm,
  computeAltitudeForGsd,
  THERMAL_CAMERA_FOV,
} from "@/lib/solarCamera";
import { haversineDistance } from "@/lib/geo";

const CENTER: [number, number] = [50.06, 14.43];

describe("generateOrbit", () => {
  it("closed loop (360°) is unaffected by direction beyond a mirror", () => {
    const cw = generateOrbit({
      ...DEFAULT_ORBIT_PARAMS,
      center: CENTER,
      radiusM: 70,
      numPoints: 8,
      clockwise: true,
    } satisfies OrbitParams);
    const ccw = generateOrbit({
      ...DEFAULT_ORBIT_PARAMS,
      center: CENTER,
      radiusM: 70,
      numPoints: 8,
      clockwise: false,
    } satisfies OrbitParams);
    expect(cw.waypoints).toHaveLength(8);
    expect(ccw.waypoints).toHaveLength(8);
  });

  it("open arc: both clockwise and counter-clockwise end exactly on endAngleDeg (regression — CCW used to backtrack and miss it)", () => {
    for (const clockwise of [true, false]) {
      const result = generateOrbit({
        ...DEFAULT_ORBIT_PARAMS,
        center: CENTER,
        radiusM: 70,
        numPoints: 4,
        startAngleDeg: 0,
        endAngleDeg: 270,
        clockwise,
      } satisfies OrbitParams);

      const last = result.waypoints[result.waypoints.length - 1];
      const lastBearing = bearing(
        CENTER[0],
        CENTER[1],
        last.latitude,
        last.longitude,
      );
      // Allow a small tolerance for the local-flat-earth approximation.
      expect(Math.abs(lastBearing - 270)).toBeLessThan(1);
    }
  });

  it("open arc: first waypoint always lands on startAngleDeg", () => {
    const result = generateOrbit({
      ...DEFAULT_ORBIT_PARAMS,
      center: CENTER,
      radiusM: 70,
      numPoints: 5,
      startAngleDeg: 45,
      endAngleDeg: 200,
      clockwise: true,
    } satisfies OrbitParams);
    const first = result.waypoints[0];
    const firstBearing = bearing(
      CENTER[0],
      CENTER[1],
      first.latitude,
      first.longitude,
    );
    expect(Math.abs(firstBearing - 45)).toBeLessThan(1);
  });

  it("with poiCenter undefined, output is unchanged (byte-identical) from the original flat-pitch/center-heading behavior (regression guard)", () => {
    const withoutPoiCenter = generateOrbit({
      ...DEFAULT_ORBIT_PARAMS,
      center: CENTER,
      radiusM: 70,
      numPoints: 8,
      altitudeGimbalLinked: false,
      // An arbitrary stored pitch that does NOT equal computeGimbalPitch's
      // output — this must still be used as-is when poiCenter is absent.
      gimbalPitchDeg: -12,
    } satisfies OrbitParams);

    expect(
      withoutPoiCenter.waypoints.every((wp) => wp.gimbalPitchAngle === -12),
    ).toBe(true);
    withoutPoiCenter.waypoints.forEach((wp) => {
      const expectedHeading = bearing(
        wp.latitude,
        wp.longitude,
        CENTER[0],
        CENTER[1],
      );
      const normalized =
        expectedHeading > 180 ? expectedHeading - 360 : expectedHeading;
      expect(wp.headingAngle).toBe(Math.round(normalized));
    });
  });

  it("with poiCenter set to an offset point, heading points at poiCenter (not center) and gimbal pitch varies per waypoint", () => {
    const poiCenter = destinationPoint(CENTER[0], CENTER[1], 40, 0);
    const result = generateOrbit({
      ...DEFAULT_ORBIT_PARAMS,
      center: CENTER,
      radiusM: 70,
      numPoints: 8,
      poiHeight: 20,
      altitude: 60,
      poiCenter,
    } satisfies OrbitParams);

    const pitches = new Set(result.waypoints.map((wp) => wp.gimbalPitchAngle));
    // An off-center orbit has varying distance to the fixed aim point, so
    // pitch should not be flat across every waypoint.
    expect(pitches.size).toBeGreaterThan(1);

    result.waypoints.forEach((wp) => {
      const expectedHeading = bearing(
        wp.latitude,
        wp.longitude,
        poiCenter[0],
        poiCenter[1],
      );
      const normalized =
        expectedHeading > 180 ? expectedHeading - 360 : expectedHeading;
      expect(wp.headingAngle).toBe(Math.round(normalized));
    });

    // The POI marker should sit at the aim point, not the circle's center.
    expect(result.pois[0].latitude).toBeCloseTo(poiCenter[0], 6);
    expect(result.pois[0].longitude).toBeCloseTo(poiCenter[1], 6);
  });
});

describe("computeGimbalPitch / computeAltitudeForPitch", () => {
  it("round-trips: altitude -> pitch -> altitude", () => {
    const altitude = computeAltitudeForPitch(
      computeGimbalPitch(45, 30, 70),
      30,
      70,
    );
    expect(altitude).toBe(45);
  });

  it("round-trips: pitch -> altitude -> pitch", () => {
    const pitch = computeGimbalPitch(
      computeAltitudeForPitch(-30, 30, 70),
      30,
      70,
    );
    expect(pitch).toBe(-30);
  });

  it("does not produce an astronomical altitude at the ±90° asymptote (regression)", () => {
    const altitude = computeAltitudeForPitch(-90, 30, 70);
    expect(altitude).toBeLessThanOrEqual(500);
    expect(altitude).toBeGreaterThanOrEqual(1);
  });

  it("converges to a stable fixed point instead of drifting forever once floored (regression)", () => {
    // poiHeight=0, pitch=0, large radius pushes the naive altitude below 1m,
    // triggering the floor clamp. One extra round-trip should reach a fixed
    // point (same altitude/pitch pair reproduces itself), rather than
    // oscillating indefinitely as edits accumulate.
    let altitude = computeAltitudeForPitch(0, 0, 90);
    let pitch = computeGimbalPitch(altitude, 0, 90);
    altitude = computeAltitudeForPitch(pitch, 0, 90);
    pitch = computeGimbalPitch(altitude, 0, 90);

    const nextAltitude = computeAltitudeForPitch(pitch, 0, 90);
    const nextPitch = computeGimbalPitch(nextAltitude, 0, 90);

    expect(nextAltitude).toBe(altitude);
    expect(nextPitch).toBe(pitch);
  });
});

/** Vertical angular span (degrees) of a ground-to-poiHeight object as seen from radiusM/altitude. */
function verticalSpanDeg(
  altitude: number,
  poiHeight: number,
  radiusM: number,
): number {
  const angleBottom = Math.atan2(altitude, radiusM);
  const angleTop = Math.atan2(altitude - poiHeight, radiusM);
  return ((angleBottom - angleTop) * 180) / Math.PI;
}

describe("computeFramedForRadius / computeFramedForAltitude", () => {
  const VFOV = 56.8;
  const SAFETY_MARGIN = 0.5;

  it("computeFramedForRadius: resulting altitude frames the object within the target FOV span", () => {
    const result = computeFramedForRadius(40, 25, VFOV);
    expect(result).not.toBeNull();
    const span = verticalSpanDeg(result!.altitude, 25, 40);
    expect(span).toBeLessThanOrEqual(VFOV * SAFETY_MARGIN + 0.5);
    expect(span).toBeGreaterThan(VFOV * SAFETY_MARGIN - 0.5);
  });

  it("computeFramedForAltitude: resulting radius frames the object within the target FOV span", () => {
    // prevRadius=40 steers root selection to the larger, realistic root —
    // the smaller root here (~3.5m) is an unrealistically close orbit that
    // gets pulled off-target by the MIN_RADIUS_M clamp.
    const result = computeFramedForAltitude(30, 25, VFOV, 40);
    expect(result).not.toBeNull();
    const span = verticalSpanDeg(30, 25, result!.radiusM);
    expect(span).toBeLessThanOrEqual(VFOV * SAFETY_MARGIN + 0.5);
    expect(span).toBeGreaterThan(VFOV * SAFETY_MARGIN - 0.5);
  });

  it("gimbal pitch centers the vertical span (equal angle to top and bottom of the object)", () => {
    const result = computeFramedForRadius(40, 25, VFOV);
    expect(result).not.toBeNull();
    const { altitude, gimbalPitchDeg } = result!;
    const angleBottom = (Math.atan2(altitude, 40) * 180) / Math.PI;
    const angleTop = (Math.atan2(altitude - 25, 40) * 180) / Math.PI;
    const midAngle = (angleBottom + angleTop) / 2;
    expect(gimbalPitchDeg).toBeCloseTo(-midAngle, 0);
  });

  it("returns null when poiHeight is 0 (no vertical extent to frame)", () => {
    expect(computeFramedForRadius(40, 0, VFOV)).toBeNull();
    expect(computeFramedForAltitude(60, 0, VFOV)).toBeNull();
  });

  it("returns null only when altitude/poiHeight aren't positive — NOT for altitude at or below poiHeight, which is also always solvable (regression — an earlier version of this fix wrongly returned null for that whole range)", () => {
    expect(computeFramedForAltitude(0, 25, VFOV)).toBeNull();
    expect(computeFramedForAltitude(-5, 25, VFOV)).toBeNull();
    // altitude === poiHeight and altitude < poiHeight must both still
    // resolve — the camera is at or below the object's own top, but the
    // desired span is unconditionally achievable there (see doc comment on
    // computeFramedForAltitude), so no capping/null is needed.
    expect(computeFramedForAltitude(25, 25, VFOV)).not.toBeNull();
    expect(computeFramedForAltitude(20, 25, VFOV)).not.toBeNull();
  });

  it("computeFramedForRadius: for a radius far too large to ever reach the aspirational target, still returns the best achievable framing instead of null (regression — this used to silently fall back to gimbal-only linking for any realistically large radius)", () => {
    const result = computeFramedForRadius(5000, 10, VFOV);
    expect(result).not.toBeNull();
    // The achievable span for such a large radius is tiny — nowhere near
    // the aspirational 28.4° target — but a real, flyable altitude/pitch
    // pair must still come back.
    const span = verticalSpanDeg(result!.altitude, 10, 5000);
    expect(span).toBeGreaterThan(0);
    expect(span).toBeLessThan(1);
  });

  it("computeFramedForRadius: a large but realistic radius (further than the building is tall) frames at the capped achievable maximum instead of returning null (regression for the reported bug)", () => {
    // Matches the real-world report: radius grown to 105m for a 40m-tall
    // building — comfortably beyond the 79m point where the old fixed
    // 28.4° target became unreachable and silently stopped updating.
    const result = computeFramedForRadius(105, 40, VFOV, 32);
    expect(result).not.toBeNull();
    const span = verticalSpanDeg(result!.altitude, 40, 105);
    const expectedMaxSpanDeg =
      ((2 * Math.atan(40 / (2 * 105))) / Math.PI) * 180 * 0.98;
    expect(span).toBeCloseTo(expectedMaxSpanDeg, 0);
  });

  it("computeFramedForAltitude: a high altitude relative to a modest poiHeight frames at the capped achievable maximum instead of returning null (regression for the reported bug)", () => {
    // Matches the real-world report: altitude raised to 150m for a 40m-tall
    // building — the old fixed 28.4° target was unreachable there too.
    const result = computeFramedForAltitude(150, 40, VFOV, 55);
    expect(result).not.toBeNull();
    const span = verticalSpanDeg(150, 40, result!.radiusM);
    const expectedMaxSpanDeg =
      (Math.atan(40 / (2 * Math.sqrt(150 * (150 - 40)))) / Math.PI) *
      180 *
      0.98;
    expect(span).toBeCloseTo(expectedMaxSpanDeg, 0);
  });

  it("picks the root closest to a given previous value instead of jumping", () => {
    // radiusM=48 (with poiHeight=25) sits in the narrow band where both
    // quadratic roots for altitude are positive (~4m and ~21m) — a good case
    // to confirm prevAltitude actually steers which one gets picked.
    const near = computeFramedForRadius(48, 25, VFOV, 5);
    const far = computeFramedForRadius(48, 25, VFOV, 20);
    expect(near).not.toBeNull();
    expect(far).not.toBeNull();
    expect(near!.altitude).not.toBe(far!.altitude);
  });
});

describe("generateSolarSurvey", () => {
  function rectVertices(
    widthM: number,
    heightM: number,
    rotationDeg = 0,
  ): [number, number][] {
    const corners: [number, number][] = [
      [-widthM / 2, -heightM / 2],
      [widthM / 2, -heightM / 2],
      [widthM / 2, heightM / 2],
      [-widthM / 2, heightM / 2],
    ];
    const rad = (rotationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return corners.map(([x, y]) => {
      const rx = x * cos - y * sin;
      const ry = x * sin + y * cos;
      // Reuse destinationPoint (bearing/distance) to place each corner
      // precisely relative to CENTER without duplicating projection math.
      const dist = Math.sqrt(rx * rx + ry * ry);
      const brg = (Math.atan2(rx, ry) * 180) / Math.PI;
      return dist === 0
        ? CENTER
        : destinationPoint(CENTER[0], CENTER[1], dist, brg);
    });
  }

  // rowAngleDeg is a compass bearing (0=N, 90=E). For an un-rotated
  // rectVertices(w, h) shape, the "width" edge runs due east — bearing 90° —
  // which is what these fixtures pass unless testing a rotated shape.
  const EAST_ROW_ANGLE = 90;

  it("every flight line contributes waypoints — the topmost line must not be silently dropped (regression)", () => {
    const params: SolarParams = {
      vertices: rectVertices(100, 40),
      altitude: 30,
      spacingM: 10,
      // Larger than the row length, so each line still gets exactly its
      // two endpoints — isolates the topmost-line regression from the
      // separate along-track photo-spacing behavior tested below.
      photoSpacingM: 200,
      rowAngleDeg: EAST_ROW_ANGLE,
      addPhotos: true,
    };
    const result = generateSolarSurvey(params);
    // No line should ever contribute zero waypoints. Group by height (all
    // waypoints share the mission altitude, so use position along the
    // cross-sweep axis via index pairing instead): every consecutive pair
    // is one line's two endpoints, so the total must be even and non-zero
    // per expected line count.
    expect(result.waypoints.length).toBeGreaterThan(0);
    expect(result.waypoints.length % 2).toBe(0);
    // With a 40m cross-extent (worst case, ignoring which edge is longest)
    // and 10m spacing, there must be at least ceil(40/10)+1 = 5 lines, i.e.
    // at least 10 waypoints — the old bug capped this at 4 lines (8 pts)
    // by always losing the last line.
    expect(result.waypoints.length).toBeGreaterThanOrEqual(10);
  });

  it("produces the same waypoint count for a rotated shape when rowAngleDeg is adjusted to match (manual row-angle rotation-invariance)", () => {
    // rectVertices' rotationDeg is a counterclockwise math rotation of the
    // local (east, north) coordinates, which *decreases* compass bearing
    // (clockwise-increasing) by the same amount — a +30° shape rotation
    // means the row's compass bearing drops from 90° to 60°.
    const rotated = generateSolarSurvey({
      vertices: rectVertices(100, 40, 30),
      altitude: 30,
      spacingM: 10,
      photoSpacingM: 200,
      rowAngleDeg: EAST_ROW_ANGLE - 30,
      addPhotos: false,
    });
    const unrotated = generateSolarSurvey({
      vertices: rectVertices(100, 40, 0),
      altitude: 30,
      spacingM: 10,
      photoSpacingM: 200,
      rowAngleDeg: EAST_ROW_ANGLE,
      addPhotos: false,
    });
    // Same shape, just rotated, with rowAngleDeg rotated by the same
    // amount — should produce the same waypoint count.
    expect(rotated.waypoints.length).toBe(unrotated.waypoints.length);
  });

  it("clips flight lines to a concave (L-shaped) polygon — no waypoint lands in the missing corner, including along-track points mid-row", () => {
    // L-shape: a big block with the top-right quadrant notched out.
    const local: [number, number][] = [
      [0, 0],
      [80, 0],
      [80, 30],
      [40, 30],
      [40, 60],
      [0, 60],
    ];
    const vertices = local.map(([x, y]) =>
      destinationPoint(
        CENTER[0],
        CENTER[1],
        Math.sqrt(x * x + y * y),
        (Math.atan2(x, y) * 180) / Math.PI,
      ),
    );
    const result = generateSolarSurvey({
      vertices,
      altitude: 30,
      spacingM: 15,
      // Small on purpose: stresses that intermediate along-track points
      // (not just each row's two endpoints) also respect the clip boundary.
      photoSpacingM: 5,
      rowAngleDeg: EAST_ROW_ANGLE,
      addPhotos: false,
    });

    expect(result.waypoints.length).toBeGreaterThan(0);

    for (const wp of result.waypoints) {
      const distLat = (wp.latitude - CENTER[0]) * 111320;
      const distLng =
        (wp.longitude - CENTER[1]) *
        111320 *
        Math.cos((CENTER[0] * Math.PI) / 180);
      // Local x/y in the same frame used to build the fixture above.
      const localY = distLat;
      const localX = distLng;
      const inNotch = localY > 30.5 && localX > 40.5;
      expect(inNotch).toBe(false);
    }
  });

  it("returns no waypoints for a degenerate (fewer than 3 vertices) shape", () => {
    const result = generateSolarSurvey({
      vertices: [CENTER, destinationPoint(CENTER[0], CENTER[1], 10, 0)],
      altitude: 30,
      spacingM: 10,
      photoSpacingM: 8,
      rowAngleDeg: EAST_ROW_ANGLE,
      addPhotos: false,
    });
    expect(result.waypoints).toHaveLength(0);
  });

  it("places photos every ~photoSpacingM along a long row, not just at its two ends (regression for the reported 'only photographs the ends' bug)", () => {
    // A single long thin strip: one flight line spans its full ~200m length.
    const result = generateSolarSurvey({
      vertices: rectVertices(200, 10),
      altitude: 30,
      spacingM: 100, // wider than the 10m extent -> exactly one flight line
      photoSpacingM: 20,
      rowAngleDeg: EAST_ROW_ANGLE,
      addPhotos: true,
    });

    // ceil(200/20)+1 = 11 points along the single row.
    expect(result.waypoints.length).toBeGreaterThanOrEqual(11);
    expect(result.waypoints.every((wp) => wp.actions.length === 1)).toBe(true);

    // The points must actually be spread along the row, not clustered at
    // the two ends — the middle third of the row must contain at least one
    // waypoint (would fail under the old "2 points per line" behavior).
    const lngs = result.waypoints.map((wp) => wp.longitude);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const midLow = minLng + (maxLng - minLng) / 3;
    const midHigh = maxLng - (maxLng - minLng) / 3;
    expect(lngs.some((lng) => lng > midLow && lng < midHigh)).toBe(true);
  });
});

describe("recommendSolarSpacing", () => {
  const H20T = 43;
  const M30T = 53;

  it("returns null for a payload with no known thermal FOV", () => {
    expect(recommendSolarSpacing(30, 999999)).toBeNull();
  });

  it("returns positive spacing values, smaller than the raw (no-overlap) footprint, for a known payload", () => {
    const rec = recommendSolarSpacing(30, M30T);
    expect(rec).not.toBeNull();
    expect(rec!.lineSpacingM).toBeGreaterThan(0);
    expect(rec!.photoSpacingM).toBeGreaterThan(0);
    // Default overlap is positive, so the recommendation must be strictly
    // less than the raw (0% overlap) ground footprint at this altitude.
    const rawFootprintWidth = 2 * 30 * Math.tan((49.4 * Math.PI) / 180 / 2);
    expect(rec!.lineSpacingM).toBeLessThan(rawFootprintWidth);
  });

  it("recommends larger spacing at a higher altitude (wider ground footprint)", () => {
    const low = recommendSolarSpacing(20, H20T)!;
    const high = recommendSolarSpacing(60, H20T)!;
    expect(high.lineSpacingM).toBeGreaterThan(low.lineSpacingM);
    expect(high.photoSpacingM).toBeGreaterThan(low.photoSpacingM);
  });

  it("no longer flags the Matrice 4T entry as experimental now that its drone/payload identity is confirmed against a real DJI Pilot 2 export", () => {
    expect(THERMAL_CAMERA_FOV[89].experimental).toBeUndefined();
    expect(THERMAL_CAMERA_FOV[43].experimental).toBeUndefined();
    expect(THERMAL_CAMERA_FOV[53].experimental).toBeUndefined();
  });

  it("a narrower-FOV camera (H20T) recommends tighter spacing than a wider-FOV one (M30T) at the same altitude", () => {
    const h20t = recommendSolarSpacing(30, H20T)!;
    const m30t = recommendSolarSpacing(30, M30T)!;
    expect(h20t.lineSpacingM).toBeLessThan(m30t.lineSpacingM);
  });
});

describe("computeGsdCm / computeAltitudeForGsd", () => {
  const M3E = 66; // 20MP, 5280x3956, vfovDeg 56.8

  it("returns null for a payload with no known wide-camera FOV", () => {
    expect(computeGsdCm(80, 999999)).toBeNull();
    expect(computeAltitudeForGsd(2, 999999)).toBeNull();
  });

  it("returns null for a payload with known FOV but unknown resolution (e.g. H30)", () => {
    expect(computeGsdCm(80, 82)).toBeNull();
  });

  it("computeAltitudeForGsd is the inverse of computeGsdCm", () => {
    const gsd = computeGsdCm(80, M3E)!;
    expect(gsd).toBeGreaterThan(0);
    const altitude = computeAltitudeForGsd(gsd, M3E)!;
    expect(altitude).toBeCloseTo(80, 1);
  });

  it("GSD grows with altitude (coarser resolution higher up)", () => {
    const low = computeGsdCm(40, M3E)!;
    const high = computeGsdCm(120, M3E)!;
    expect(high).toBeGreaterThan(low);
  });
});

describe("recommendGridSpacing", () => {
  const M3E = 66;

  it("returns null for a payload with no known wide-camera FOV", () => {
    expect(recommendGridSpacing(80, 999999, 75, 65)).toBeNull();
  });

  it("returns positive spacing below the raw (no-overlap) footprint", () => {
    const rec = recommendGridSpacing(80, M3E, 75, 65)!;
    expect(rec).not.toBeNull();
    expect(rec.lineSpacingM).toBeGreaterThan(0);
    expect(rec.photoSpacingM).toBeGreaterThan(0);
  });

  it("higher overlap % recommends tighter spacing", () => {
    const looseOverlap = recommendGridSpacing(80, M3E, 50, 50)!;
    const tightOverlap = recommendGridSpacing(80, M3E, 90, 90)!;
    expect(tightOverlap.lineSpacingM).toBeLessThan(looseOverlap.lineSpacingM);
    expect(tightOverlap.photoSpacingM).toBeLessThan(looseOverlap.photoSpacingM);
  });
});

describe("computeOrbitSeedForBuilding", () => {
  it("centers on the footprint centroid and radius covers the farthest corner plus clearance", () => {
    const size = 40;
    const c00 = CENTER;
    const c10 = destinationPoint(c00[0], c00[1], size, 90);
    const c01 = destinationPoint(c00[0], c00[1], size, 0);
    const c11 = destinationPoint(c01[0], c01[1], size, 90);
    const vertices: [number, number][] = [c00, c10, c11, c01];

    const seed = computeOrbitSeedForBuilding(vertices);

    // True geometric center of a 40x40 square is ~28.3m from any corner.
    const distFromCorner = haversineDistance(
      seed.center[0],
      seed.center[1],
      c00[0],
      c00[1],
    );
    expect(distFromCorner).toBeGreaterThan(25);
    expect(distFromCorner).toBeLessThan(32);

    // Radius covers the half-diagonal (~28.3m) plus the fixed clearance.
    expect(seed.radiusM).toBeGreaterThan(40);
    expect(seed.radiusM).toBeLessThan(46);
  });

  it("is invariant under vertex winding order", () => {
    const vertices: [number, number][] = [
      CENTER,
      destinationPoint(CENTER[0], CENTER[1], 30, 90),
      destinationPoint(CENTER[0], CENTER[1], 30, 45),
    ];
    const forward = computeOrbitSeedForBuilding(vertices);
    const reversed = computeOrbitSeedForBuilding([...vertices].reverse());
    expect(reversed.center).toEqual(forward.center);
    expect(reversed.radiusM).toEqual(forward.radiusM);
  });
});

describe("orbitParamsForBuilding", () => {
  function squareFootprint(size: number): [number, number][] {
    const c00 = CENTER;
    const c10 = destinationPoint(c00[0], c00[1], size, 90);
    const c01 = destinationPoint(c00[0], c00[1], size, 0);
    const c11 = destinationPoint(c01[0], c01[1], size, 90);
    return [c00, c10, c11, c01];
  }

  it("uses the building's height as POI height, and derives center/radius/altitude/gimbal pitch consistently with computeOrbitSeedForBuilding + computeAltitudeForPitch", () => {
    const vertices = squareFootprint(40);
    const params = orbitParamsForBuilding({ vertices, height: 25 });

    const seed = computeOrbitSeedForBuilding(vertices);
    expect(params.center).toEqual(seed.center);
    expect(params.radiusM).toBe(seed.radiusM);
    expect(params.poiHeight).toBe(25);
    expect(params.altitude).toBe(
      computeAltitudeForPitch(params.gimbalPitchDeg, 25, seed.radiusM),
    );
    // Round-trip sanity: the stored altitude/gimbal pair should reproduce
    // itself through computeGimbalPitch, same as any linked orbit.
    expect(computeGimbalPitch(params.altitude, 25, seed.radiusM)).toBe(
      params.gimbalPitchDeg,
    );
  });

  it("produces params usable directly by generateOrbit (a full waypoint loop, not just a seed)", () => {
    const vertices = squareFootprint(40);
    const params = orbitParamsForBuilding({ vertices, height: 25 });
    const result = generateOrbit(params);
    expect(result.waypoints.length).toBe(params.numPoints);
  });

  it("with a known camera vfovDeg, derives altitude/gimbal pitch so the whole building fits in frame instead of the fixed -45° heuristic", () => {
    const vertices = squareFootprint(40);
    const seed = computeOrbitSeedForBuilding(vertices);
    const vfovDeg = 56.8;
    const params = orbitParamsForBuilding({ vertices, height: 25 }, vfovDeg);

    expect(params.center).toEqual(seed.center);
    expect(params.radiusM).toBe(seed.radiusM);
    expect(params.poiHeight).toBe(25);
    // Should differ from the no-FOV fallback's fixed -45°.
    expect(params.gimbalPitchDeg).not.toBe(-45);
    const span = verticalSpanDeg(params.altitude, 25, seed.radiusM);
    expect(span).toBeLessThanOrEqual(vfovDeg * 0.5 + 0.5);
  });

  it("falls back to the fixed -45°/computeAltitudeForPitch heuristic when vfovDeg is omitted", () => {
    const vertices = squareFootprint(40);
    const params = orbitParamsForBuilding({ vertices, height: 25 });
    expect(params.gimbalPitchDeg).toBe(-45);
  });
});

describe("capture mode (photo/video)", () => {
  it("generateOrbit: video mode puts startRecord only on the first waypoint and stopRecord only on the last", () => {
    const result = generateOrbit({
      ...DEFAULT_ORBIT_PARAMS,
      center: CENTER,
      radiusM: 50,
      numPoints: 6,
      captureMode: "video",
    } satisfies OrbitParams);

    expect(result.waypoints[0].actions).toEqual([
      {
        actionId: 0,
        actionType: "startRecord",
        params: { payloadPositionIndex: 0 },
      },
    ]);
    expect(result.waypoints[result.waypoints.length - 1].actions).toEqual([
      {
        actionId: 0,
        actionType: "stopRecord",
        params: { payloadPositionIndex: 0 },
      },
    ]);
    for (const wp of result.waypoints.slice(1, -1)) {
      expect(wp.actions).toEqual([]);
    }
  });

  it("generateOrbit: photo mode puts a takePhoto action on every waypoint", () => {
    const result = generateOrbit({
      ...DEFAULT_ORBIT_PARAMS,
      center: CENTER,
      radiusM: 50,
      numPoints: 6,
      captureMode: "photo",
    } satisfies OrbitParams);

    expect(
      result.waypoints.every(
        (wp) =>
          wp.actions.length === 1 && wp.actions[0].actionType === "takePhoto",
      ),
    ).toBe(true);
  });

  it("generateOrbit: no captureMode at all produces no actions (regression — matches every orbit generated before this field existed)", () => {
    const { captureMode: _omit, ...legacyParams } = {
      ...DEFAULT_ORBIT_PARAMS,
      center: CENTER,
      radiusM: 50,
      numPoints: 6,
    } satisfies OrbitParams;
    const result = generateOrbit(legacyParams as OrbitParams);

    expect(result.waypoints.every((wp) => wp.actions.length === 0)).toBe(true);
  });

  it("generateGrid: legacy addPhotos:true with no captureMode still behaves as photo mode (regression)", () => {
    const { captureMode: _omit, ...legacyParams } = {
      ...DEFAULT_GRID_PARAMS,
      corner1: CENTER,
      corner2: destinationPoint(CENTER[0], CENTER[1], 100, 45),
      addPhotos: true,
    } satisfies GridParams;
    const result = generateGrid(legacyParams as GridParams);

    expect(result.waypoints.length).toBeGreaterThan(0);
    expect(
      result.waypoints.every(
        (wp) =>
          wp.actions.length === 1 && wp.actions[0].actionType === "takePhoto",
      ),
    ).toBe(true);
  });

  it("generateGrid: places photos at regular intervals along each pass, not just at its two endpoints", () => {
    const result = generateGrid({
      ...DEFAULT_GRID_PARAMS,
      corner1: CENTER,
      corner2: destinationPoint(CENTER[0], CENTER[1], 200, 45),
      spacingM: 100,
      photoSpacingM: 20,
    } satisfies GridParams);

    // Each pass is roughly 200m long with a 20m photo spacing, so every
    // pass should contribute well more than its 2 endpoints.
    expect(result.waypoints.length).toBeGreaterThan(4);
  });

  it("generateGrid: missing photoSpacingM (legacy saved data) falls back to spacingM instead of breaking", () => {
    const { photoSpacingM: _omit, ...legacyParams } = {
      ...DEFAULT_GRID_PARAMS,
      corner1: CENTER,
      corner2: destinationPoint(CENTER[0], CENTER[1], 200, 45),
      spacingM: 30,
    } satisfies GridParams;

    const result = generateGrid(legacyParams as GridParams);

    expect(result.waypoints.length).toBeGreaterThan(0);
    expect(result.waypoints.every((wp) => Number.isFinite(wp.latitude))).toBe(
      true,
    );
  });

  it("generateGrid: video mode puts startRecord/stopRecord only on the first/last waypoint, after the reverse step", () => {
    const result = generateGrid({
      ...DEFAULT_GRID_PARAMS,
      corner1: CENTER,
      corner2: destinationPoint(CENTER[0], CENTER[1], 100, 45),
      captureMode: "video",
      reverse: true,
    } satisfies GridParams);

    expect(result.waypoints[0].actions[0]?.actionType).toBe("startRecord");
    expect(
      result.waypoints[result.waypoints.length - 1].actions[0]?.actionType,
    ).toBe("stopRecord");
    for (const wp of result.waypoints.slice(1, -1)) {
      expect(wp.actions).toEqual([]);
    }
  });

  it("generatePencil: no captureMode at all produces no actions (regression — matches every pencil path generated before this field existed)", () => {
    const path: [number, number][] = [
      CENTER,
      destinationPoint(CENTER[0], CENTER[1], 50, 90),
      destinationPoint(CENTER[0], CENTER[1], 100, 90),
    ];
    const { captureMode: _omit, ...legacyParams } = {
      ...DEFAULT_PENCIL_PARAMS,
      path,
    } satisfies Parameters<typeof generatePencil>[0];
    const result = generatePencil(
      legacyParams as Parameters<typeof generatePencil>[0],
    );

    expect(result.waypoints.every((wp) => wp.actions.length === 0)).toBe(true);
  });

  it("generatePencil: video mode puts startRecord/stopRecord only on the first/last waypoint", () => {
    const path: [number, number][] = [
      CENTER,
      destinationPoint(CENTER[0], CENTER[1], 50, 90),
      destinationPoint(CENTER[0], CENTER[1], 100, 90),
    ];
    const result = generatePencil({
      ...DEFAULT_PENCIL_PARAMS,
      path,
      captureMode: "video",
    });

    expect(result.waypoints[0].actions[0]?.actionType).toBe("startRecord");
    expect(
      result.waypoints[result.waypoints.length - 1].actions[0]?.actionType,
    ).toBe("stopRecord");
  });

  it("generateFacade: legacy addPhotos:true with no captureMode still behaves as photo mode (regression)", () => {
    const { captureMode: _omit, ...legacyParams } = {
      ...DEFAULT_FACADE_PARAMS,
      point1: CENTER,
      point2: destinationPoint(CENTER[0], CENTER[1], 40, 90),
      addPhotos: true,
    } satisfies FacadeParams;
    const result = generateFacade(legacyParams as FacadeParams);

    expect(result.waypoints.length).toBeGreaterThan(0);
    expect(
      result.waypoints.every(
        (wp) =>
          wp.actions.length === 1 && wp.actions[0].actionType === "takePhoto",
      ),
    ).toBe(true);
  });

  it("generateFacade: addPhotos:false with no captureMode produces no actions (regression)", () => {
    const { captureMode: _omit, ...legacyParams } = {
      ...DEFAULT_FACADE_PARAMS,
      point1: CENTER,
      point2: destinationPoint(CENTER[0], CENTER[1], 40, 90),
      addPhotos: false,
    } satisfies FacadeParams;
    const result = generateFacade(legacyParams as FacadeParams);

    expect(result.waypoints.every((wp) => wp.actions.length === 0)).toBe(true);
  });

  it("generateFacade: video mode puts startRecord/stopRecord only on the first/last waypoint", () => {
    const result = generateFacade({
      ...DEFAULT_FACADE_PARAMS,
      point1: CENTER,
      point2: destinationPoint(CENTER[0], CENTER[1], 40, 90),
      captureMode: "video",
    });

    expect(result.waypoints[0].actions[0]?.actionType).toBe("startRecord");
    expect(
      result.waypoints[result.waypoints.length - 1].actions[0]?.actionType,
    ).toBe("stopRecord");
    for (const wp of result.waypoints.slice(1, -1)) {
      expect(wp.actions).toEqual([]);
    }
  });

  function squareVertices(sizeM: number): [number, number][] {
    const east = destinationPoint(CENTER[0], CENTER[1], sizeM, 90);
    const northEast = destinationPoint(east[0], east[1], sizeM, 0);
    const north = destinationPoint(CENTER[0], CENTER[1], sizeM, 0);
    return [CENTER, east, northEast, north];
  }

  it("generateSolarSurvey: legacy addPhotos:true with no captureMode still behaves as photo mode (regression)", () => {
    const { captureMode: _omit, ...legacyParams } = {
      ...DEFAULT_SOLAR_PARAMS,
      vertices: squareVertices(40),
      rowAngleDeg: 90,
      addPhotos: true,
    } satisfies SolarParams;
    const result = generateSolarSurvey(legacyParams as SolarParams);

    expect(result.waypoints.length).toBeGreaterThan(0);
    expect(
      result.waypoints.every(
        (wp) =>
          wp.actions.length === 1 && wp.actions[0].actionType === "takePhoto",
      ),
    ).toBe(true);
  });

  it("generateSolarSurvey: video mode puts startRecord/stopRecord only on the first/last waypoint", () => {
    const result = generateSolarSurvey({
      ...DEFAULT_SOLAR_PARAMS,
      vertices: squareVertices(40),
      rowAngleDeg: 90,
      captureMode: "video",
    });

    expect(result.waypoints[0].actions[0]?.actionType).toBe("startRecord");
    expect(
      result.waypoints[result.waypoints.length - 1].actions[0]?.actionType,
    ).toBe("stopRecord");
    for (const wp of result.waypoints.slice(1, -1)) {
      expect(wp.actions).toEqual([]);
    }
  });

  it("applyVideoCaptureActions edge case: a single-waypoint path gets both startRecord and stopRecord with distinct actionIds", () => {
    const result = generateOrbit({
      ...DEFAULT_ORBIT_PARAMS,
      center: CENTER,
      radiusM: 50,
      numPoints: 1,
      captureMode: "video",
    } satisfies OrbitParams);

    expect(result.waypoints).toHaveLength(1);
    expect(result.waypoints[0].actions).toEqual([
      {
        actionId: 0,
        actionType: "startRecord",
        params: { payloadPositionIndex: 0 },
      },
      {
        actionId: 1,
        actionType: "stopRecord",
        params: { payloadPositionIndex: 0 },
      },
    ]);
  });
});
