---
name: e2e-testing
description: Playwright testing patterns for droneroute. Covers screenshot automation, test structure, and CI integration.
---

## What I do

Guide writing and maintaining Playwright-based tests and screenshot scripts for the droneroute application.

## When to use me

- Writing new Playwright tests or screenshot scripts
- Debugging test failures
- Adding new pages or features that need visual verification

## Existing Playwright infrastructure

### Screenshot scripts

The project has Playwright scripts for automated screenshot capture:

- `scripts/screenshots.js` — Captures 8+ screenshots of different mission types (orbit, grid survey, facade scan, pencil path, waypoints+POI, multiselect, elevation graph, gimbal pitch)
- `scripts/screenshot-poi.js` — Focused screenshot for gimbal-pitch/POI view (2x device scale factor)

### Standard coordinates

All screenshots are taken at coordinates: `41.25797725781744, 0.9322907667035154` (as defined in AGENTS.md).

### Viewport

Standard screenshot viewport: **1280x720**

## Selector patterns

### Leaflet map interactions

The map is rendered via `react-leaflet`. Key selectors:

- Map container: `.leaflet-container`
- Map click: Use Playwright's `page.click('.leaflet-container', { position: { x, y } })`
- Markers: `.leaflet-marker-icon`
- Popups: `.leaflet-popup-content`

### Radix UI components

This app uses `@radix-ui/react-*`. Components use `data-state` attributes:

| Component     | Selector pattern    |
| ------------- | ------------------- |
| Dialog        | `[role="dialog"]`   |
| Select        | `[role="combobox"]` |
| Tab trigger   | `[role="tab"]`      |
| Dropdown item | `[role="menuitem"]` |
| Tooltip       | `[role="tooltip"]`  |

### Zustand state

State changes happen synchronously via Zustand. After a UI action, the DOM updates on the next React render — use `waitForSelector` or `expect(locator).toBeVisible()` rather than arbitrary waits.

## Writing new tests

### Test file structure

```
tests/
  screenshots/          # Visual capture scripts
    *.spec.ts
  e2e/                  # Interactive flow tests (future)
    *.spec.ts
```

### Test isolation

Each test should start from a clean state. For the map application:

1. Navigate to the app URL
2. Create or load a specific mission type
3. Assert on the expected state
4. Clean up if necessary

### CI integration

Tests run in the CI pipeline. The build job must succeed before tests can run. Playwright requires Chromium:

```bash
npx playwright install chromium --with-deps
```

## Checklist for new tests

1. [ ] Created file with `.spec.ts` extension
2. [ ] Uses standard viewport (1280x720) when taking screenshots
3. [ ] Uses standard coordinates when map interaction is needed
4. [ ] Selectors use role-based queries or stable attributes (not fragile CSS classes)
5. [ ] No arbitrary `waitForTimeout` — use `waitForSelector` or assertions
6. [ ] Tested locally before pushing
