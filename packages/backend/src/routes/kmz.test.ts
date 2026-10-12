import express from "express";
import request from "supertest";
import { describe, it, expect, beforeAll } from "vitest";
import { DEFAULT_MISSION_CONFIG, DEFAULT_WAYPOINT } from "@droneroute/shared";
import { kmzRoutes } from "./kmz.js";
import { initDb, getDb } from "../models/db.js";
import { generateToken } from "../services/authService.js";

const app = express();
app.use(express.json());
app.use("/kmz", kmzRoutes);
const config = {
  ...DEFAULT_MISSION_CONFIG,
  droneEnumValue: 68,
  droneSubEnumValue: 0,
  kmzProfile: "air3s",
  payloadEnumValue: 0,
  heightMode: "relativeToStartPoint",
};
const waypoints = [0, 1].map((index) => ({
  ...DEFAULT_WAYPOINT,
  index,
  name: `WP ${index}`,
  latitude: 41.25,
  longitude: 0.93 + index * 0.001,
}));
beforeAll(() => initDb());

describe("Air 3S KMZ API", () => {
  it("returns a downloadable DJI Fly archive for a valid mission", async () => {
    const res = await request(app)
      .post("/kmz/generate")
      .send({ name: "Air 3S", config, waypoints, pois: [] });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain(
      "application/vnd.google-earth.kmz",
    );
  });
  it("returns an actionable 400 for incompatible heights", async () => {
    const res = await request(app)
      .post("/kmz/generate")
      .send({
        config: { ...config, heightMode: "aboveGroundLevel" },
        waypoints,
        pois: [],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("relative to the takeoff point");
    expect(res.body.error).not.toContain("Error:");
  });
  it("checks saved mission exports and scopes access to the JWT owner", async () => {
    const db = getDb();
    db.prepare(
      "INSERT INTO users (id,email,email_verified) VALUES (?,?,1)",
    ).run("air-owner", "air-owner@example.test");
    db.prepare(
      "INSERT INTO users (id,email,email_verified) VALUES (?,?,1)",
    ).run("air-other", "air-other@example.test");
    db.prepare(
      "INSERT INTO missions (id,name,user_id,config,waypoints) VALUES (?,?,?,?,?)",
    ).run(
      "air-saved",
      "Air 3S",
      "air-owner",
      JSON.stringify({ ...config, heightMode: "aboveGroundLevel" }),
      JSON.stringify(waypoints),
    );
    const owner = generateToken("air-owner", false);
    const res = await request(app)
      .get("/kmz/download/air-saved")
      .set("Authorization", `Bearer ${owner}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("relative to the takeoff point");
    expect((await request(app).get("/kmz/download/air-saved")).status).toBe(
      401,
    );
    expect(
      (
        await request(app)
          .get("/kmz/download/air-saved")
          .set("Authorization", `Bearer ${generateToken("air-other", false)}`)
      ).status,
    ).toBe(404);
  });
});
