## Summary

Fix a startup race where the backend could crash on a fresh self-hosted install with "Cannot open the database because the directory does not exist".

## Changes

- Create the SQLite data directory synchronously before opening the database, instead of via a dynamic `import("fs")` promise that resolved after `new Database()` had already run
- This also fixes the downstream "Export failed: Bad gateway" (`ECONNREFUSED`) error, which was caused by the backend failing to start
