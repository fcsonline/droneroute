## Summary

Bump all 22 npm dependencies to their latest versions, replacing the dependabot PR that could not be merged due to TypeScript 6 breaking changes.

## Changes

- Bumped 22 npm dependencies including TypeScript 5 to 6, Vite 6 to 8, lucide-react 0.x to 1.x, and other major version updates
- Fixed TypeScript 6 compatibility: removed deprecated `baseUrl`, added Vite client types reference, explicit node types in CLI tsconfig
- Replaced removed `Github` brand icon from lucide-react v1 with a custom SVG component
- Added explicit `fs.Dirent` type annotations in CLI volumes module
