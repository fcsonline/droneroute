import express from "express";
import request from "supertest";
import { describe, it, expect, beforeAll } from "vitest";
import { initDb, getDb } from "../models/db.js";
import { authRoutes } from "./auth.js";

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

beforeAll(() => {
  initDb();
});

describe("POST /api/auth/register — failure paths", () => {
  it("rejects missing email or password with 400", async () => {
    const res = await request(app).post("/api/auth/register").send({});
    expect(res.status).toBe(400);
  });

  it("rejects passwords shorter than 6 characters", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "short@test.dev", password: "abc" });
    expect(res.status).toBe(400);
  });

  it("registers a new account and returns a token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "new@test.dev", password: "secret123" });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body).not.toHaveProperty("password_hash");
  });

  it("rejects signup with an already-registered email", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "dupe@test.dev", password: "secret123" });
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "dupe@test.dev", password: "secret123" });
    expect(res.status).toBe(409);
  });
});

describe("POST /api/auth/login — failure paths", () => {
  beforeAll(async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "login@test.dev", password: "secret123" });
  });

  it("rejects missing credentials with 400", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });

  it("returns 401 with a generic message for a wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@test.dev", password: "wrongpass" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  it("does not leak account existence: nonexistent email matches wrong-password response", async () => {
    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@test.dev", password: "wrongpass" });
    const nonexistent = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@test.dev", password: "whatever123" });
    expect(nonexistent.status).toBe(wrongPassword.status);
    expect(nonexistent.body.error).toBe(wrongPassword.body.error);
  });

  it("blocks a banned account with 403", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "banned@test.dev", password: "secret123" });
    getDb()
      .prepare("UPDATE users SET is_banned = 1 WHERE email = ?")
      .run("banned@test.dev");
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "banned@test.dev", password: "secret123" });
    expect(res.status).toBe(403);
    expect(res.body.banned).toBe(true);
  });

  it("logs in successfully with correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@test.dev", password: "secret123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });
});
