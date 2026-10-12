import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  DEFAULT_MISSION_CONFIG,
  DEFAULT_WAYPOINT,
  DRONE_MODELS,
  isAir3S,
  getDroneModelKey,
  getKmzExportError,
  type Mission,
} from "@droneroute/shared";
import { parseKmz } from "./kmzParser.js";
import { generateKmzBuffer } from "./kmzGenerator.js";
import { generateFacade } from "../../../frontend/src/lib/templates.js";

const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: false,
  isArray: (name) => ["Placemark", "actionGroup", "action"].includes(name),
});
const mission = (overrides: Partial<Mission> = {}): Mission => ({
  id: "test",
  name: "Facade",
  createdAt: "",
  updatedAt: "",
  pois: [],
  obstacles: [],
  config: {
    ...DEFAULT_MISSION_CONFIG,
    droneEnumValue: 68,
    droneSubEnumValue: 0,
    kmzProfile: "air3s",
    payloadEnumValue: 0,
    heightMode: "relativeToStartPoint",
  },
  waypoints: [0, 1].map((index) => ({
    ...DEFAULT_WAYPOINT,
    index,
    name: `WP ${index}`,
    latitude: 41.25797725781744,
    longitude: 0.9322907667035154 + index * 0.0001,
    height: 12.3,
    gimbalPitchAngle: -23,
    useGlobalHeadingParam: false,
    headingMode: "fixed",
    headingAngle: -176,
    useGlobalTurnParam: false,
    turnMode: "toPointAndStopWithContinuityCurvature",
    actions: [
      {
        actionId: 0,
        actionType: "takePhoto",
        params: { payloadPositionIndex: 0 },
      },
    ],
  })),
  ...overrides,
});
async function fixture(name: "air3s-native" | "m3e-facade") {
  const zip = new JSZip();
  for (const file of ["template.kml", "waylines.wpml"]) {
    zip.file(
      `${name === "air3s-native" ? "wpmz/" : ""}${file}`,
      readFileSync(new URL(`./fixtures/${name}-${file}`, import.meta.url)),
    );
  }
  return zip.generateAsync({ type: "nodebuffer" });
}
async function output(m: Mission) {
  const buffer = await generateKmzBuffer(m);
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("wpmz/waylines.wpml")!.async("string");
  expect(XMLValidator.validate(xml)).toBe(true);
  return { buffer, zip, doc: parser.parse(xml).kml.Document };
}

describe("DJI Air 3S export", () => {
  it("selects a unique DJI Fly profile, without an invented enterprise payload", () => {
    const model = DRONE_MODELS.filter((d) => isAir3S(d));
    expect(model).toHaveLength(1);
    expect(model[0].label).toBe("DJI Air 3S");
    expect(model[0].payloads).toEqual([]);
    expect(new Set(DRONE_MODELS.map(getDroneModelKey)).size).toBe(
      DRONE_MODELS.length,
    );
    expect(
      DRONE_MODELS.filter((d) =>
        ["DJI M30", "DJI M30T", "DJI M30 (Dock)"].includes(d.label),
      ),
    ).toHaveLength(3);
  });
  it("matches the reference archive layout, namespace, config, and height datum", async () => {
    const { zip, doc } = await output(mission());
    expect(
      Object.keys(zip.files)
        .filter((n) => !zip.files[n].dir)
        .sort(),
    ).toEqual(["wpmz/template.kml", "wpmz/waylines.wpml"]);
    const template = await zip.file("wpmz/template.kml")!.async("string");
    expect(XMLValidator.validate(template)).toBe(true);
    expect(template).toContain('xmlns:wpml="http://www.uav.com/wpmz/1.0.2"');
    expect(parser.parse(template).kml.Document.Folder).toBeUndefined();
    expect(doc.missionConfig.droneInfo).toEqual({
      droneEnumValue: 68,
      droneSubEnumValue: 0,
    });
    expect(doc.missionConfig.payloadInfo).toBeUndefined();
    expect(doc.Folder.executeHeightMode).toBe("relativeToStartPoint");
  });
  it("commands the wall heading and gimbal BEFORE the photograph at every point", async () => {
    const { doc } = await output(mission());
    for (const pm of doc.Folder.Placemark) {
      expect(pm.waypointHeadingParam).toMatchObject({
        waypointHeadingMode: "smoothTransition",
        waypointHeadingAngle: -176,
        waypointHeadingAngleEnable: 1,
      });
      expect(pm.waypointTurnParam.waypointTurnMode).toBe(
        "toPointAndStopWithContinuityCurvature",
      );
      expect(pm.executeHeight).toBe(12.3);
      const g = pm.actionGroup[0];
      expect(g.actionGroupStartIndex).toBe(pm.index);
      expect(g.actionGroupEndIndex).toBe(pm.index);
      expect(g.actionGroupMode).toBe("sequence");
      expect(g.action.map((a: any) => a.actionActuatorFunc)).toEqual([
        "gimbalRotate",
        "takePhoto",
      ]);
      expect(g.action[0].actionActuatorFuncParam).toMatchObject({
        gimbalPitchRotateAngle: -23,
        gimbalHeadingYawBase: "aircraft",
        gimbalYawRotateEnable: 0,
      });
      expect(
        g.action[1].actionActuatorFuncParam.useGlobalPayloadLensIndex,
      ).toBe(0);
    }
  });
  it("runs the actual facade planner through export and reimport for all 100 points", async () => {
    const result = generateFacade({
      point1: [41.25797725781744, 0.9322907667035154],
      point2: [41.25798, 0.9325],
      distanceM: 7,
      minAltitude: 3,
      maxAltitude: 12,
      numRows: 10,
      numColumns: 10,
      addPhotos: true,
    });
    const m = mission({
      waypoints: result.waypoints.map((w, index) => ({
        ...w,
        index,
        name: `WP ${index}`,
      })),
    });
    const { buffer, doc } = await output(m);
    const imported = await parseKmz(buffer);
    expect(imported.waypoints).toHaveLength(100);
    for (const [i, w] of imported.waypoints.entries()) {
      expect(w.latitude).toBe(m.waypoints[i].latitude);
      expect(w.longitude).toBe(m.waypoints[i].longitude);
      expect(w.height).toBe(m.waypoints[i].height);
      expect(w.headingAngle).toBe(m.waypoints[i].headingAngle);
      expect(w.gimbalPitchAngle).toBe(m.waypoints[i].gimbalPitchAngle);
      expect(w.speed).toBe(3);
      expect(
        w.actions.filter((a) => a.actionType === "takePhoto"),
      ).toHaveLength(1);
    }
    const groups = doc.Folder.Placemark.flatMap((p: any) => p.actionGroup);
    expect(new Set(groups.map((g: any) => g.actionGroupId)).size).toBe(
      groups.length,
    );
    expect(getKmzExportError(mission(imported))).toBeNull();
    await output(mission(imported));
  });
  it("does not introduce pitch commands when the mission uses manual gimbal control", async () => {
    const m = mission();
    m.config.gimbalPitchMode = "manual";
    const { buffer, doc } = await output(m);
    expect(
      doc.Folder.Placemark[0].actionGroup[0].action.map(
        (a: any) => a.actionActuatorFunc,
      ),
    ).toEqual(["takePhoto"]);
    const imported = await parseKmz(buffer);
    expect(imported.config.gimbalPitchMode).toBe("manual");
  });
  it("rejects imported actions with stale segment boundaries after a route edit", async () => {
    const imported = await parseKmz(await fixture("air3s-native"));
    imported.waypoints.splice(2, 1);
    imported.waypoints.forEach((wp, i) => {
      wp.index = i;
    });
    expect(getKmzExportError(mission(imported))).toContain("boundaries");
  });
  it("keeps legacy enterprise exports on their original serializer", async () => {
    for (const model of DRONE_MODELS.filter((m) => !isAir3S(m))) {
      const m = mission({
        config: {
          ...DEFAULT_MISSION_CONFIG,
          ...model,
          payloadEnumValue: model.payloads[0].payloadEnumValue,
        },
      });
      const zip = await JSZip.loadAsync(await generateKmzBuffer(m));
      expect(zip.file("template.kml")).not.toBeNull();
      expect(zip.file("wpmz/template.kml")).toBeNull();
      const xml = await zip.file("waylines.wpml")!.async("string");
      expect(xml).toContain('xmlns:wpml="http://www.dji.com/wpmz/1.0.2"');
      expect(
        parser.parse(xml).kml.Document.missionConfig.payloadInfo
          .payloadEnumValue,
      ).toBe(model.payloads[0].payloadEnumValue);
    }
  });
  it("preserves legacy M30 Dock missions despite sharing the Air 3S numeric IDs", async () => {
    const m = mission({
      config: {
        ...DEFAULT_MISSION_CONFIG,
        droneEnumValue: 68,
        droneSubEnumValue: 0,
        payloadEnumValue: 52,
      },
    });
    expect(isAir3S(m.config)).toBe(false);
    expect(getKmzExportError(m)).toBeNull();
    const buffer = await generateKmzBuffer(m);
    const imported = await parseKmz(buffer);
    expect(imported.config.kmzProfile).toBeUndefined();
    expect(imported.config.payloadEnumValue).toBe(52);
    expect(imported.config.heightMode).toBe("aboveGroundLevel");
    expect(getDroneModelKey(imported.config)).toBe("68-0");
    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file("template.kml")).not.toBeNull();
    expect(zip.file("wpmz/template.kml")).toBeNull();
  });

  it("refuses implicit conversion of AGL and sea-level heights", async () => {
    for (const heightMode of ["aboveGroundLevel", "EGM96"] as const) {
      const m = mission();
      m.config.heightMode = heightMode;
      await expect(generateKmzBuffer(m)).rejects.toThrow(
        "relative to the takeoff point",
      );
    }
  });
  it("rejects unsupported pitch, actions, missing POIs, and custom headings", () => {
    const m = mission();
    m.waypoints[0].gimbalPitchAngle = -120;
    expect(getKmzExportError(m)).toContain("gimbal pitch");
    m.waypoints[0].gimbalPitchAngle = -23;
    m.waypoints[0].headingAngle = undefined;
    expect(getKmzExportError(m)).toContain("Set a heading");
    m.waypoints[0].headingMode = "towardPOI";
    expect(getKmzExportError(m)).toContain("valid POI");
    m.waypoints[0].headingMode = "followWayline";
    m.waypoints[0].actions = [
      { actionId: 0, actionType: "focus", params: { isPointFocus: true } },
    ];
    expect(getKmzExportError(m)).toContain("does not support");
  });
  it("resolves POI headings into signed, enabled DJI Fly angles", async () => {
    const m = mission({
      pois: [
        {
          id: "poi",
          name: "Wall",
          latitude: 41.25797725781744,
          longitude: 0.931,
          height: 0,
        },
      ],
    });
    m.waypoints.forEach((w) => {
      w.headingMode = "towardPOI";
      w.poiId = "poi";
    });
    const { doc } = await output(m);
    expect(
      doc.Folder.Placemark[0].waypointHeadingParam.waypointHeadingAngle,
    ).toBeCloseTo(-90, 2);
    expect(
      doc.Folder.Placemark[0].waypointHeadingParam.waypointHeadingAngleEnable,
    ).toBe(1);
  });
});

describe("reference imports", () => {
  it("recovers the old M3E facade heading and turn overrides from waylines.wpml", async () => {
    const m = await parseKmz(await fixture("m3e-facade"));
    expect(m.config.droneEnumValue).toBe(77);
    expect(m.config.heightMode).toBe("aboveGroundLevel");
    expect(m.waypoints.map((w) => w.height)).toEqual([3, 3, 12, 12]);
    m.waypoints.forEach((w) => {
      expect(w.headingMode).toBe("fixed");
      expect(w.headingAngle).toBe(-176);
      expect(w.useGlobalHeadingParam).toBe(false);
      expect(w.turnMode).toBe("toPointAndStopWithContinuityCurvature");
      expect(w.actions[0].params).toHaveProperty("payloadPositionIndex", 0);
    });
  });
  it("retains native fractional heights, pitch endpoints, angle flags, and action spans", async () => {
    const imported = await parseKmz(await fixture("air3s-native"));
    expect(imported.config.payloadEnumValue).toBe(0);
    expect(imported.config.kmzProfile).toBe("air3s");
    expect(getDroneModelKey(imported.config)).toBe("68-0-air3s");
    expect(imported.waypoints.map((w) => w.height)).toEqual([
      34.6, 34.2, 48.7, 50.6, 55, 45.1,
    ]);
    expect(imported.waypoints.map((w) => w.gimbalPitchAngle)).toEqual([
      -29.4, -29.4, -37.9, -37.9, -41.1, -41.1,
    ]);
    expect(imported.waypoints.map((w) => w.headingAngleEnable)).toEqual([
      true,
      false,
      false,
      false,
      false,
      true,
    ]);
    const { buffer, doc } = await output(mission(imported));
    const reimported = await parseKmz(buffer);
    expect(reimported.waypoints.map((w) => w.height)).toEqual(
      imported.waypoints.map((w) => w.height),
    );
    expect(reimported.waypoints.map((w) => w.gimbalPitchAngle)).toEqual(
      imported.waypoints.map((w) => w.gimbalPitchAngle),
    );
    for (const [i, pm] of doc.Folder.Placemark.entries()) {
      const segment = pm.actionGroup.find((g: any) =>
        g.action.some(
          (a: any) => a.actionActuatorFunc === "gimbalEvenlyRotate",
        ),
      );
      if (i < 5) {
        expect(segment.actionGroupStartIndex).toBe(i);
        expect(segment.actionGroupEndIndex).toBe(i + 1);
      } else expect(segment).toBeUndefined();
    }
  });
  it("preserves zero heights instead of substituting a default altitude", async () => {
    const m = mission();
    m.waypoints[0].height = 0;
    const imported = await parseKmz(await generateKmzBuffer(m));
    expect(imported.waypoints[0].height).toBe(0);
  });
});
