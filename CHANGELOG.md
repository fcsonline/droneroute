# Changelog

## Unreleased

### Added

- **Admin back office panel** — cloud-only (`SELF_HOSTED=false`) user management
  panel where admins can view all users (email, sign-up date, route count),
  ban/unban users, and promote/demote admins. Admin is designated via the
  `ADMIN_EMAIL` environment variable.
- **Banned user enforcement** — banned users are rejected at login and on any
  API call with an existing token, forcing a logout on the frontend.
- **New environment variables:**
  - `SELF_HOSTED` — defaults to `true`. Set to `false` to enable cloud features.
  - `ADMIN_EMAIL` — email address that receives admin privileges on registration
    (cloud mode only).
- `AdminUser` and `PaginatedResponse` shared types.

### Changed

- Default database filename renamed from `genmap.db` to `droneroute.db`.
- JWT tokens now include an `isAdmin` flag.
- Auth middleware checks ban status on every authenticated request.
