import { describe, it, expect } from "vitest";
import { DEFAULT_MAP_VIEW } from "@droneroute/shared";
import { resolveDefaultMapView } from "./config.js";

describe("resolveDefaultMapView", () => {
  it("returns the built-in default when no env vars are set", () => {
    expect(resolveDefaultMapView({})).toEqual(DEFAULT_MAP_VIEW);
  });

  it("uses valid DEFAULT_MAP_* overrides", () => {
    expect(
      resolveDefaultMapView({
        DEFAULT_MAP_LAT: "51.5072",
        DEFAULT_MAP_LNG: "-0.1276",
        DEFAULT_MAP_ZOOM: "10",
      }),
    ).toEqual({ latitude: 51.5072, longitude: -0.1276, zoom: 10 });
  });

  it("falls back per-field when a value is missing or empty", () => {
    expect(
      resolveDefaultMapView({ DEFAULT_MAP_LAT: "40", DEFAULT_MAP_LNG: "" }),
    ).toEqual({
      latitude: 40,
      longitude: DEFAULT_MAP_VIEW.longitude,
      zoom: DEFAULT_MAP_VIEW.zoom,
    });
  });

  it("rejects non-numeric values", () => {
    expect(resolveDefaultMapView({ DEFAULT_MAP_LAT: "north" })).toEqual(
      DEFAULT_MAP_VIEW,
    );
  });

  it("rejects out-of-range coordinates and zoom", () => {
    expect(
      resolveDefaultMapView({
        DEFAULT_MAP_LAT: "91", // latitude > 90
        DEFAULT_MAP_LNG: "-200", // longitude < -180
        DEFAULT_MAP_ZOOM: "30", // zoom > 22
      }),
    ).toEqual(DEFAULT_MAP_VIEW);
  });

  it("accepts boundary values", () => {
    expect(
      resolveDefaultMapView({
        DEFAULT_MAP_LAT: "-90",
        DEFAULT_MAP_LNG: "180",
        DEFAULT_MAP_ZOOM: "0",
      }),
    ).toEqual({ latitude: -90, longitude: 180, zoom: 0 });
  });
});
