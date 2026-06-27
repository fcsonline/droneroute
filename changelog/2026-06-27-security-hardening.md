## Summary

Harden the backend's baseline security posture: security headers, a non-leaky
error handler, rate limiting on authentication endpoints, a safer default CORS
policy, and no plaintext credentials in logs.

## Changes

- Add `helmet` security headers (nosniff, frameguard, HSTS, referrer-policy, …).
  CSP and COEP are intentionally left off because the app embeds Mapbox GL and
  Google OAuth; `Cross-Origin-Opener-Policy` is set to `same-origin-allow-popups`
  so cloud-mode Google sign-in popups keep working.
- Add a global Express error handler that logs the full error server-side and
  returns a generic message to clients — no stack traces, SQL or internal paths
  leak. The KMZ download route no longer echoes `err.message` to the client.
- Rate limit `/api/auth` endpoints (register, login, Google, change-password):
  10 failed attempts per 15 minutes per IP. Successful requests don't count, so
  legitimate users are never throttled.
- Rate limit `/api/airspace/zones` (30 requests/min per IP) to protect the
  external airspace providers it proxies, without hindering normal map panning.
- Default CORS to deny cross-origin requests when `CORS_ORIGIN` is unset (the SPA
  is served same-origin), instead of reflecting every origin. Document
  `CORS_ORIGIN` in `.env.example`.
- Stop logging the seeded dev account's password to stdout.
- Update dependencies to clear high-severity advisories flagged by `npm audit`
  (`multer` DoS, transitive `form-data` CRLF injection).
