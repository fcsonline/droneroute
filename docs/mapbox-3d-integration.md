# Mapbox GL JS 3D Integration Plan

Replace Leaflet with Mapbox GL JS + `react-map-gl` to enable 3D terrain
visualization for drone route planning.

## Current State

- **Map library**: Leaflet 1.9.4 via react-leaflet 5.0.0 (strictly 2D)
- **Map components**: 7 files in `packages/frontend/src/components/map/`, all
  importing Leaflet directly (no abstraction layer)
- **Tile source**: Free OpenStreetMap tiles, no API key
- **3D today**: None. Waypoints have `height` values but they're only shown in a
  2D SVG elevation chart, never visualized on the map
- **Good news**: The state layer (`missionStore.ts`) and geometry logic
  (`lib/templates.ts`, `lib/geo.ts`) have zero Leaflet imports — they work
  purely with lat/lng/height numbers

## Why Mapbox GL JS

- 3D terrain with elevation exaggeration (DEM tiles)
- 3D buildings in urban areas
- Globe view at low zoom
- Custom 3D layers via deck.gl or Three.js integration
- Pitch/bearing controls (tilted camera perspective)
- Best terrain data and style ecosystem
- For a drone route planner: visualize flight paths at actual altitude above
  terrain, see terrain elevation under the route, tilt the camera to inspect
  approaches

## Dependency changes

**Remove:**

- `leaflet`, `react-leaflet`, `@types/leaflet`

**Add:**

- `mapbox-gl` (~v3.x)
- `react-map-gl` (~v7.x) — maintained by Vis.gl, wraps Mapbox GL
- `@types/mapbox-gl` (if needed, though v3 has built-in types)

## Files that need changes

| File | Change type | Effort |
|---|---|---|
| `packages/frontend/package.json` | Swap deps | Trivial |
| `packages/frontend/index.html` | Remove Leaflet CDN CSS (line 27-31) | Trivial |
| `packages/frontend/src/index.css` | Replace `.leaflet-*` rules with `.mapboxgl-*` equivalents | Low |
| `components/map/MapView.tsx` | **Full rewrite** — `Map` from react-map-gl, Mapbox source/layer for terrain, event handlers | High |
| `components/map/WaypointMarker.tsx` | **Full rewrite** — `Marker` from react-map-gl with HTML overlay | Medium |
| `components/map/PoiMarker.tsx` | **Full rewrite** — same as WaypointMarker | Medium |
| `components/map/TemplateDrawHandler.tsx` | **Significant rewrite** — replace `useMapEvents` with react-map-gl callbacks, replace Circle/Rectangle/Polyline with GeoJSON source+layer | High |
| `components/map/PencilDrawHandler.tsx` | **Significant rewrite** — same pattern as TemplateDrawHandler | Medium |
| `components/map/TemplatePreview.tsx` | **Rewrite** — replace CircleMarker/Polyline with GeoJSON source+layer | Medium |
| `components/map/MapToolbar.tsx` | **No change** — pure React/Zustand, zero Leaflet imports | None |
| `components/map/TemplateConfigPanel.tsx` | **Minor** — update event propagation stoppage | Low |
| `scripts/screenshots.js`, `scripts/screenshot-poi.js` | Update `.leaflet-container` selector to `.mapboxgl-map` | Low |

All component paths are relative to `packages/frontend/src/`.

## Files that need NO changes (map-agnostic)

- `store/missionStore.ts` — pure lat/lng/height numbers
- `lib/templates.ts` — pure geometry
- `lib/geo.ts` — pure math
- All shared types (`@droneroute/shared`)
- All non-map components (sidebar, elevation graph, dialogs, etc.)

## Key architectural mapping

| Leaflet concept | Mapbox GL equivalent |
|---|---|
| `<MapContainer>` | `<Map>` from react-map-gl |
| `<TileLayer url="...">` | `mapStyle` prop (Mapbox style URL or raster source) |
| `<Marker>` with `L.divIcon` | `<Marker>` from react-map-gl (renders React children as HTML overlay) |
| `<Polyline>` | `<Source type="geojson">` + `<Layer type="line">` |
| `<Circle>` / `<Rectangle>` | `<Source type="geojson">` + `<Layer type="fill">` / `<Layer type="line">` |
| `<CircleMarker>` | `<Layer type="circle">` |
| `<Tooltip>` | Custom React div inside `<Marker>` or `<Popup>` |
| `useMapEvents({ click })` | `<Map onClick={...}>` |
| `useMap()` → `map.fitBounds()` | `useMap()` from react-map-gl → `map.fitBounds()` (same API name) |
| `map.dragging.disable()` | `map.dragPan.disable()` |

## 3D terrain enablement

Once on Mapbox GL, add to the map setup:

```tsx
<Map
  mapStyle="mapbox://styles/mapbox/outdoors-v12"
  terrain={{ source: "mapbox-dem", exaggeration: 1.5 }}
  maxPitch={85}
>
  <Source
    id="mapbox-dem"
    type="raster-dem"
    url="mapbox://mapbox.mapbox-terrain-dem-v1"
  />
</Map>
```

The map will render terrain elevation; users can pitch/rotate with
right-click-drag.

## API token setup

- Add `VITE_MAPBOX_TOKEN` to `.env` and `.env.example`
- Reference as `import.meta.env.VITE_MAPBOX_TOKEN` in MapView
- Mapbox free tier: 50,000 map loads/month

## Phased implementation

### Phase 1 — Core migration (~1.5 days)

1. Swap dependencies
2. Rewrite MapView with `<Map>`, style, terrain source
3. Rewrite WaypointMarker and PoiMarker as react-map-gl `<Marker>` with React
   children
4. Rewrite FlightPath and PoiPointingLines as GeoJSON sources + line layers
5. Port click handlers, fit-bounds logic
6. Update CSS (remove Leaflet rules, add Mapbox GL CSS import)
7. Clean up `index.html`

### Phase 2 — 3D terrain (~0.5 day)

1. Add DEM source and terrain config
2. Enable pitch/bearing controls
3. Choose appropriate map style (satellite-streets or outdoors)
4. Test terrain interaction with waypoint placement

### Phase 3 — Template drawing (~1 day)

1. Port TemplateDrawHandler drag interactions
2. Port PencilDrawHandler freehand capture
3. Render guide shapes (circle, rectangle, line) as GeoJSON layers
4. Port TemplatePreview to GeoJSON layers

### Phase 4 — Polish (~0.5 day)

1. Animated dash effect for flight path (Mapbox `line-dasharray` +
   requestAnimationFrame)
2. Update screenshot scripts
3. Test all keyboard shortcuts and interaction modes
4. Verify KMZ export still works (reads from store, should be unchanged)

**Total estimated effort: ~3.5 days**

## Risks and mitigations

1. **Marker rendering performance** — Mapbox HTML markers are DOM elements like
   Leaflet's divIcon, so performance should be similar. For 100+ waypoints,
   could switch to a symbol layer with SDF icons.
2. **Template drag interaction** — The mousedown → disable drag → capture →
   mouseup pattern works similarly in Mapbox (`map.dragPan.disable()`), but
   needs testing with react-map-gl's event system.
3. **Animated dashes** — Leaflet's SVG path hack won't work. Need to use
   `line-dasharray` with a timer that updates the dash offset via
   `setPaintProperty`. Slightly more work but well-documented.
4. **Bundle size** — mapbox-gl is ~800KB vs Leaflet's ~170KB. For a mission
   planner app this is acceptable, and Mapbox loads tiles via WebGL which is
   significantly faster for terrain rendering.
5. **Commercial dependency** — Mapbox requires an API token and has usage-based
   pricing. Free tier (50k loads/month) is likely sufficient. MapLibre GL JS is
   an open-source alternative if this becomes a concern (`react-map-gl` supports
   both backends).
