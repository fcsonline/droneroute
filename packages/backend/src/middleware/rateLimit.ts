import rateLimit from "express-rate-limit";

/** Global rate limiter — 100 requests per minute per IP. */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

/** Strict rate limiter for expensive endpoints — 10 requests per minute per IP. */
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

/**
 * Airspace rate limiter — 30 requests per minute per IP. Tighter than the
 * global limit because these requests proxy external (rate-limited) airspace
 * providers, but generous enough for normal map panning (the frontend pads and
 * caches bounds, so legitimate roaming stays well under this).
 */
export const airspaceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

/**
 * Auth rate limiter — guards credential endpoints against brute force.
 * 10 failed attempts per 15 minutes per IP. Successful requests are not
 * counted, so legitimate users who sign in correctly are never throttled.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many attempts, please try again later" },
});
