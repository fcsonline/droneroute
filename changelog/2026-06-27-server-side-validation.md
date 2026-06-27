## Summary

Validate mission payloads on the server (not just in the UI) and add an
automated test suite covering authentication failure paths.

## Changes

- Add a server-side mission validator (`missionValidation.ts`) that enforces
  field types, name length, array size caps (waypoints/POIs/obstacles) and finite
  latitude/longitude bounds. Client-side checks are UX only — these run on every
  payload that gets persisted.
- Apply it to mission create/update (`POST`/`PUT /api/missions`) and to KMZ
  generation and import (`/api/kmz/*`); invalid payloads are rejected with `400`.
- Add a `vitest` + `supertest` test suite for the backend and a CI `Test` job.
  Coverage includes auth failure paths (missing fields, wrong password,
  nonexistent email, duplicate signup, banned account) and the mission validator.

## Notes

- Login already returns a generic "Invalid email or password" for both wrong
  passwords and unknown accounts (no user enumeration) — there's a test asserting
  the two responses are identical.
- Registration still returns a distinct `409` when an email is already taken.
  Hiding that fully would require an email-verification signup flow (no mailer
  exists yet); mass enumeration is mitigated by the auth rate limiter.
