## Summary

Add a privacy and data-handling policy so users know what DroneRoute stores,
where it lives, and which third-party services are involved.

## Changes

- Add `PRIVACY.md` covering account/mission/preference data, the SQLite storage
  location, third-party services (Mapbox, airspace providers, Google, Gravatar),
  mission sharing exposure, retention/deletion, and GDPR/CCPA rights. Emphasises
  that self-hosted data never leaves the operator's own server.
- Add a "Privacy & data" link to the about dialog.
- Document the feature in `specs/privacy.md` and index it in `specs/README.md`.
