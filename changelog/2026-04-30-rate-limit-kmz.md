## Summary

Add rate limiting to protect API endpoints from abuse, particularly the
KMZ generation endpoint which now allows unauthenticated access.

## Changes

- Add `express-rate-limit` dependency to the backend
- Global rate limit of 100 requests/min per IP on all API routes
- Strict rate limit of 10 requests/min per IP on the KMZ `/generate` endpoint
- Allow unauthenticated KMZ export (cherry-picked from PR #18) with rate limiting as safeguard
