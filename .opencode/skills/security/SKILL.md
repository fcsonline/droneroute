---
name: security
description: Security patterns for droneroute — JWT auth guards, input validation, SQL injection prevention, and environment variable safety.
---

## What I do

Guide secure coding patterns for the droneroute Express backend, covering authentication checks, authorization, input validation, error handling, and environment variable safety.

## When to use me

- Adding new API routes (auth/authz checklist)
- Handling user input (validation, sanitization)
- Modifying authentication or JWT logic
- Reviewing error responses (information leakage prevention)
- Adding new environment variables or secrets

## Authentication & authorization checklist

### Every API route MUST:

1. Verify the JWT token via middleware before processing the request
2. Scope all DB queries to the authenticated user when applicable
3. Never trust user-supplied IDs for authorization — derive ownership from the JWT

### Pattern

```typescript
// Middleware validates JWT and attaches user to req
// Route handler uses req.user.id for all DB queries
router.get("/missions", authMiddleware, async (req, res) => {
  const missions = db.getMissionsByUser(req.user.id);
  res.json(missions);
});
```

### Admin routes

- Admin routes must check `req.user.role === 'admin'` in addition to JWT validation
- Both middleware and route-level checks are required

## Input validation

### File uploads (KMZ/WPML)

- Validate file extension and MIME type
- Enforce maximum file size
- Parse XML content safely (fast-xml-parser handles XXE prevention)
- Never use user-supplied filenames directly on the filesystem

### Numeric inputs

- Validate latitude/longitude ranges (-90 to 90, -180 to 180)
- Validate altitude ranges (reasonable bounds for drone operations)
- Validate speed, heading, and other mission parameters

## Error handling

**Never expose raw errors, stack traces, or internal paths to the client.**

```typescript
// BAD
res.status(500).json({ error: err.message, stack: err.stack });

// GOOD
console.error("Mission creation failed:", err);
res.status(500).json({ error: "Failed to create mission" });
```

## Environment variable safety

- **Never commit `.env` files** — they are in `.gitignore`
- **JWT_SECRET must be cryptographically random** in production
- **Database paths** should use the `/app/data/` mount in Docker
- **CORS origins** should be explicitly configured, never `*` in production

## SQL injection

The backend uses `better-sqlite3` with parameterized queries. **Never use string concatenation for SQL queries.**

```typescript
// GOOD — parameterized
db.prepare("SELECT * FROM missions WHERE user_id = ?").all(userId);

// BAD — string concatenation
db.prepare(`SELECT * FROM missions WHERE user_id = '${userId}'`).all();
```
