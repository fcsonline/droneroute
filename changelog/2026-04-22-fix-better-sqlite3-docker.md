## Summary

Fix better-sqlite3 native bindings missing in Docker production image, causing the app to crash on startup.

## Changes

- Rebuild better-sqlite3 native addon in the production stage of the Dockerfile
- Install build tools temporarily and remove them to keep the image small
