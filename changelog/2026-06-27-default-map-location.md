## Summary

Let self-hosted instances configure the map's starting location so it opens on
their local area instead of the built-in Barcelona default.

## Changes

- Add `DEFAULT_MAP_LAT`, `DEFAULT_MAP_LNG`, and `DEFAULT_MAP_ZOOM` environment
  variables, surfaced to the frontend at runtime via the `/api/config` endpoint
- Validate each value independently — invalid or out-of-range values fall back to
  the built-in default
- Document the new variables in `.env.example`, `docker-compose.yml`, the README,
  and the map spec
