import { describe, it, expect } from "vitest";
import {
  validateMissionCreate,
  validateMissionUpdate,
  validateMissionGeometry,
} from "./missionValidation.js";

const validWaypoint = {
  index: 0,
  name: "WP1",
  latitude: 41.25,
  longitude: 0.93,
  height: 30,
  speed: 5,
  gimbalPitchAngle: 0,
};

const validCreate = {
  name: "Test mission",
  config: { autoFlightSpeed: 5 },
  waypoints: [validWaypoint, { ...validWaypoint, index: 1, longitude: 0.94 }],
  pois: [],
  obstacles: [],
};

describe("validateMissionCreate", () => {
  it("accepts a well-formed mission", () => {
    expect(validateMissionCreate(validCreate)).toBeNull();
  });

  it("rejects a missing or blank name", () => {
    expect(validateMissionCreate({ ...validCreate, name: "" })).toBe(
      "invalid mission name",
    );
    expect(validateMissionCreate({ ...validCreate, name: "   " })).toBe(
      "invalid mission name",
    );
    expect(validateMissionCreate({ ...validCreate, name: 123 })).toBe(
      "invalid mission name",
    );
  });

  it("rejects an over-long name", () => {
    expect(
      validateMissionCreate({ ...validCreate, name: "x".repeat(201) }),
    ).toBe("invalid mission name");
  });

  it("rejects a non-object config", () => {
    expect(validateMissionCreate({ ...validCreate, config: "nope" })).toBe(
      "invalid mission config",
    );
    expect(validateMissionCreate({ ...validCreate, config: [1, 2] })).toBe(
      "invalid mission config",
    );
  });

  it("rejects waypoints that are not an array", () => {
    expect(validateMissionCreate({ ...validCreate, waypoints: {} })).toBe(
      "waypoints must be an array",
    );
  });

  it("rejects out-of-range coordinates", () => {
    expect(
      validateMissionCreate({
        ...validCreate,
        waypoints: [{ ...validWaypoint, latitude: 91 }],
      }),
    ).toBe("waypoint coordinates out of range");
    expect(
      validateMissionCreate({
        ...validCreate,
        waypoints: [{ ...validWaypoint, longitude: 200 }],
      }),
    ).toBe("waypoint coordinates out of range");
  });

  it("rejects non-finite coordinates (NaN / Infinity)", () => {
    expect(
      validateMissionCreate({
        ...validCreate,
        waypoints: [{ ...validWaypoint, latitude: Number.NaN }],
      }),
    ).toBe("waypoint coordinates out of range");
    expect(
      validateMissionCreate({
        ...validCreate,
        waypoints: [{ ...validWaypoint, height: Number.POSITIVE_INFINITY }],
      }),
    ).toBe("invalid waypoint height");
  });

  it("rejects too many waypoints (DoS guard)", () => {
    const waypoints = Array.from({ length: 5001 }, (_, i) => ({
      ...validWaypoint,
      index: i,
    }));
    expect(validateMissionCreate({ ...validCreate, waypoints })).toBe(
      "too many waypoints",
    );
  });

  it("validates POIs and obstacles", () => {
    expect(
      validateMissionCreate({
        ...validCreate,
        pois: [{ name: "P", latitude: 200, longitude: 0, height: 1 }],
      }),
    ).toBe("POI coordinates out of range");
    expect(
      validateMissionCreate({
        ...validCreate,
        obstacles: [{ name: "O", vertices: [[91, 0]] }],
      }),
    ).toBe("obstacle vertex out of range");
    expect(
      validateMissionCreate({
        ...validCreate,
        obstacles: [{ name: "O", vertices: [[41, 0, 5]] }],
      }),
    ).toBe("obstacle vertex out of range");
  });
});

describe("validateMissionUpdate", () => {
  it("accepts an empty partial update", () => {
    expect(validateMissionUpdate({})).toBeNull();
  });

  it("only validates fields that are present", () => {
    expect(validateMissionUpdate({ name: "New name" })).toBeNull();
    expect(validateMissionUpdate({ name: "" })).toBe("invalid mission name");
    expect(validateMissionUpdate({ waypoints: "bad" })).toBe(
      "waypoints must be an array",
    );
  });
});

describe("validateMissionGeometry", () => {
  it("accepts valid geometry without requiring name/config", () => {
    expect(
      validateMissionGeometry({ waypoints: validCreate.waypoints }),
    ).toBeNull();
  });

  it("rejects invalid geometry", () => {
    expect(
      validateMissionGeometry({
        waypoints: [{ ...validWaypoint, latitude: 999 }],
      }),
    ).toBe("waypoint coordinates out of range");
  });
});
