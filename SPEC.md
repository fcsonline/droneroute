# DroneRoute - Application Specification

## Overview

DroneRoute is a full-stack web application for visually creating DJI drone waypoint missions
on an interactive map, exporting them as WPML-compliant KMZ files, and managing saved
missions. It supports Points of Interest (POIs) that waypoints can orient toward.

## Architecture

```
droneroute/
├── packages/
│   ├── shared/     # TypeScript types shared between frontend & backend
│   ├── backend/    # Express API server (KMZ gen, persistence, auth)
│   └── frontend/   # React SPA (map, waypoint editor, mission config)
├── Dockerfile      # Multi-stage build for self-hosting
├── docker-compose.yml
└── SPEC.md         # This file
```

**Monorepo** managed with npm workspaces. Single `npm install` at root.

## Tech Stack

| Layer      | Technology                                    |
| ---------- | --------------------------------------------- |
| Frontend   | React 19, TypeScript, Vite 6                  |
| Map        | Leaflet 1.9 + react-leaflet 5 + OpenStreetMap |
| UI         | shadcn/ui + Tailwind CSS v4                   |
| State      | Zustand 5                                     |
| Backend    | Node.js 22, Express 5, TypeScript             |
| KMZ Gen    | archiver (ZIP) + XML string templates         |
| KMZ Parse  | jszip + fast-xml-parser                       |
| Database   | SQLite via better-sqlite3                     |
| Auth       | bcryptjs + jsonwebtoken (JWT, 7-day expiry)   |
| Deployment | Docker (multi-stage, Alpine, volume for data) |

## DJI WPML KMZ Format

A KMZ is a ZIP archive containing:

```
mission.kmz
├── template.kml      # User-editable mission parameters
├── waylines.wpml     # Executable flight instructions
└── res/              # Resources (reference images, etc.)
```

Both files use KML extended with DJI WPML namespace:

- KML: `http://www.opengis.net/kml/2.2`
- WPML: `http://www.dji.com/wpmz/1.0.2`

### Supported Drones

| Model             | droneEnumValue | Payloads                         |
| ----------------- | -------------- | -------------------------------- |
| DJI M300 RTK      | 60             | H20, H20T, H20N, PSDK            |
| DJI M30           | 67 (sub 0)     | M30 Camera                       |
| DJI M30T          | 67 (sub 1)     | M30T Camera                      |
| DJI Mavic 3E      | 77 (sub 0)     | M3E Camera                       |
| DJI Mavic 3T      | 77 (sub 1)     | M3T Camera                       |
| DJI Mavic 3M      | 77 (sub 2)     | M3M Camera                       |
| DJI M350 RTK      | 89             | H20, H20T, H20N, H30, H30T, PSDK |
| DJI Mavic 3D      | 91 (sub 0)     | M3D Camera                       |
| DJI Mavic 3TD     | 91 (sub 1)     | M3TD Camera                      |
| DJI Mini 4 Pro \* | 100            | Mini 4 Pro Camera                |

\* Consumer drone; WPML format may not import into DJI Fly.

## Data Model

### PointOfInterest

```typescript
interface PointOfInterest {
  id: string; // UUID
  name: string; // User-assigned label
  latitude: number;
  longitude: number;
  height: number; // Altitude in meters
}
```

POIs are placed on the map and can be referenced by waypoints via the `towardPOI`
heading mode. When a waypoint uses `towardPOI`, it stores the `poiId` linking to
which POI the drone nose should face during flight toward/at that waypoint.

### Obstacle

```typescript
interface Obstacle {
  id: string; // UUID
  name: string; // User-assigned label
  description: string; // Free-text notes
  vertices: [number, number][]; // Array of [latitude, longitude] pairs
}
```

Obstacles are polygonal areas drawn on the map representing no-fly zones, buildings,
towers, or other hazards. They are persisted with the mission and visible on shared
missions. When the flight path crosses an obstacle polygon, the affected segment is
highlighted in red and a warning count appears in the footer. Obstacles are a
DroneRoute-only planning concept and are **not** exported to the DJI KMZ file.

### Waypoint

```typescript
interface Waypoint {
  index: number; // 0-based, determines flight order
  latitude: number;
  longitude: number;
  height: number; // Meters (relative or absolute per heightMode)
  speed: number; // m/s
  useGlobalSpeed: boolean;
  useGlobalHeight: boolean;
  useGlobalHeadingParam: boolean;
  useGlobalTurnParam: boolean;
  headingMode?: HeadingMode;
  headingAngle?: number; // -180..180 degrees
  poiId?: string; // Reference to POI when headingMode = "towardPOI"
  turnMode?: TurnMode;
  turnDampingDist?: number;
  gimbalPitchAngle: number; // -120..45 degrees (-90 = nadir)
  actions: WaypointAction[];
}
```

Waypoints are **sortable** - users can drag-and-drop to reorder them in the sidebar.
Reordering updates the `index` field and changes the flight path sequence.

### MissionConfig

```typescript
interface MissionConfig {
  droneEnumValue: number;
  droneSubEnumValue: number;
  payloadEnumValue: number;
  flyToWaylineMode: "safely" | "pointToPoint";
  finishAction: "goHome" | "noAction" | "autoLand" | "gotoFirstWaypoint";
  exitOnRCLost: "goContinue" | "executeLostAction";
  executeRCLostAction: "goBack" | "landing" | "hover";
  takeOffSecurityHeight: number; // 1.2-1500m
  globalTransitionalSpeed: number; // m/s
  autoFlightSpeed: number; // m/s
  heightMode: "EGM96" | "relativeToStartPoint" | "aboveGroundLevel";
  globalHeadingMode: HeadingMode;
  globalTurnMode: TurnMode;
  gimbalPitchMode: "manual" | "usePointSetting";
}
```

### Mission

```typescript
interface Mission {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  config: MissionConfig;
  waypoints: Waypoint[];
  pois: PointOfInterest[];
  obstacles: Obstacle[];
}
```

### WaypointAction

Actions are executed sequentially when the drone reaches the waypoint.

| Action       | Description             | Key Parameters                          |
| ------------ | ----------------------- | --------------------------------------- |
| takePhoto    | Capture a photo         | payloadPositionIndex, fileSuffix        |
| startRecord  | Start video recording   | payloadPositionIndex, fileSuffix        |
| stopRecord   | Stop video recording    | payloadPositionIndex                    |
| gimbalRotate | Rotate gimbal           | pitch/yaw/roll angles, rotateMode       |
| rotateYaw    | Rotate aircraft heading | aircraftHeading, pathMode (CW/CCW)      |
| hover        | Hover in place          | hoverTime (seconds)                     |
| zoom         | Zoom camera             | focalLength (mm)                        |
| focus        | Focus camera            | isPointFocus, focusX/Y, isInfiniteFocus |

### Heading Modes

| Mode             | Behavior                                         |
| ---------------- | ------------------------------------------------ |
| followWayline    | Nose follows flight direction                    |
| manually         | User controls heading live                       |
| fixed            | Maintains yaw set at waypoint                    |
| smoothTransition | Custom yaw angle, interpolated between waypoints |
| towardPOI        | Nose faces a specific Point of Interest          |

### Turn Modes

| Mode                                     | Behavior                        |
| ---------------------------------------- | ------------------------------- |
| coordinateTurn                           | Banked turn, no stop            |
| toPointAndStopWithDiscontinuityCurvature | Straight line, stops at WP      |
| toPointAndStopWithContinuityCurvature    | Curve flight, stops at WP       |
| toPointAndPassWithContinuityCurvature    | Curve flight, passes through WP |

## Features

### Map Interaction

- **Click to add waypoints** - Toggle between Add and Pan mode via toolbar
- **Drag waypoint markers** - Reposition by dragging numbered circle markers
- **Flight path polyline** - Dashed blue line connecting waypoints in order
- **POI markers** - Distinct target-style markers for Points of Interest
- **POI pointing lines** - Dotted red lines from waypoints to their referenced POI
- **Add POI mode** - Separate toolbar button for placing POIs on the map
- **Obstacle polygons** - Draw polygon obstacles on the map; flight segments crossing them are shown in red
- **Obstacle editing** - Click to select an obstacle, drag vertex handles to reshape, click midpoint handles to add vertices, right-click a vertex to remove it

### Sidebar

- **Mission name** - Editable text input
- **Toolbar** - Save, Export KMZ, Import KMZ buttons
- **Waypoints section** (collapsible)
  - Sorted list showing index, altitude, speed, coordinate preview
  - **Drag-and-drop reordering** - Grab handle to change flight order
  - Click to select, X to delete
  - Action count badge
- **POIs section** (collapsible)
  - List of POIs with name, coordinates, height badge
  - Click to select and expand inline editor (name, height, coords)
  - X to delete (clears `poiId` references on waypoints automatically)
- **Obstacles section** (collapsible)
  - List of obstacles with name, vertex count badge
  - Click to select and highlight on map; double-click to rename
  - Inline editor for name, description
  - X to delete
- **Mission Config section** (collapsible)
  - Drone model + payload selector
  - Flight speed, takeoff height
  - Height reference mode
  - Heading mode, turn mode
  - Fly-to mode, finish action, RC-lost action
  - Transitional speed
- **Waypoint Editor section** (auto-expands on selection)
  - Altitude, speed, gimbal pitch
  - Heading mode (with POI selector when `towardPOI`)
  - Turn mode
  - Coordinate display
  - Action editor (add/remove/configure actions)
- **Footer stats bar**
  - Waypoint count, POI count, and obstacle count
  - Obstacle warning count (when flight path crosses obstacles)
  - Estimated total distance (Haversine) and flight time
  - Time is calculated per-segment using each waypoint's speed
    (or global `autoFlightSpeed` when `useGlobalSpeed` is true)

### Backend API

| Method   | Path                    | Description                    |
| -------- | ----------------------- | ------------------------------ |
| `GET`    | `/api/health`           | Health check                   |
| `POST`   | `/api/auth/register`    | Register new user              |
| `POST`   | `/api/auth/login`       | Login, returns JWT             |
| `GET`    | `/api/missions`         | List user's missions (auth)    |
| `GET`    | `/api/missions/:id`     | Get single mission             |
| `POST`   | `/api/missions`         | Create mission                 |
| `PUT`    | `/api/missions/:id`     | Update mission                 |
| `DELETE` | `/api/missions/:id`     | Delete mission (auth, owner)   |
| `POST`   | `/api/kmz/generate`     | Generate KMZ from POST body    |
| `GET`    | `/api/kmz/download/:id` | Download KMZ for saved mission |
| `POST`   | `/api/kmz/import`       | Upload KMZ, parse to JSON      |

### KMZ Generation

The backend generates a valid DJI WPML KMZ containing:

1. **template.kml** - Mission config + waypoints with `useGlobal*` flags,
   action groups, and POI heading references
2. **waylines.wpml** - Execution file with explicit per-waypoint speed,
   heading, turn params, and computed POI angles
3. **res/** - Empty resource directory

When a waypoint uses `towardPOI` heading mode, the backend computes the
bearing from the waypoint to the referenced POI and emits it as a
`waypointPoiPoint` element with the POI's coordinates.

### KMZ Import

Upload a `.kmz` file to parse it back into editable mission data:

- Extracts `template.kml` from the ZIP
- Parses mission config, waypoints, and actions
- Extracts POIs from `waypointPoiPoint` elements in per-waypoint heading params
- De-duplicates POIs sharing the same coordinates
- Returns JSON with `config`, `waypoints`, and `pois` ready to load into the editor

## Database Schema (SQLite)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

    CREATE TABLE missions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      user_id TEXT,
      config TEXT NOT NULL,       -- JSON
      waypoints TEXT NOT NULL,    -- JSON
      pois TEXT DEFAULT '[]',     -- JSON
      obstacles TEXT DEFAULT '[]', -- JSON
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
```

## Self-Hosting with Docker

### Quick Start

```bash
docker compose up -d
```

The app is available at `http://droneroute.localhost` via Traefik reverse proxy (port 80).
The Traefik dashboard is at `http://localhost:8080`.

> **Note:** Traefik v3.6+ is required for compatibility with Docker Engine 29+.
> Earlier Traefik versions (v3.3, v3.4) ship with a Go Docker SDK that starts API
> negotiation at v1.24, which is rejected by Docker Engine 29+ (minimum API v1.44).

### Configuration

| Environment Variable | Default                            | Description          |
| -------------------- | ---------------------------------- | -------------------- |
| `PORT`               | `3001`                             | Server port          |
| `JWT_SECRET`         | `change-this-secret-in-production` | JWT signing secret   |
| `DB_PATH`            | `/app/data/droneroute.db`          | SQLite database path |

### Data Persistence

SQLite database is stored in a Docker volume (`droneroute-data`) mounted at
`/app/data`. This persists across container restarts and rebuilds.

### Build

```bash
docker build -t droneroute .
docker run -d -p 3001:3001 -v droneroute-data:/app/data droneroute
```

## Development

### Prerequisites

- Node.js 22+
- npm 10+

### Setup

```bash
npm install          # Install all workspace deps
npm run build -w packages/shared  # Build shared types (required before backend build)
npm run dev          # Start backend (3001) + frontend (5173) concurrently
```

Frontend proxies `/api` requests to the backend via Vite dev server.

### Building for Production

```bash
npm install
npm run build -w packages/shared    # Shared types first
npm run build -w packages/backend   # Backend TypeScript → dist/
npm run build -w packages/frontend  # Frontend Vite → dist/
```

The shared package compiles TypeScript types to `packages/shared/dist/` so the
backend's compiled JS can import them at runtime without needing `tsx`.

### Project Structure

```
packages/
  shared/
    src/types.ts                     # All TypeScript types and constants
    tsconfig.json                    # Compiles to dist/ for backend runtime
  backend/src/
    index.ts                       # Express app entry
    models/db.ts                   # SQLite setup
    routes/auth.ts                 # Auth endpoints
    routes/missions.ts             # Mission CRUD
    routes/kmz.ts                  # KMZ gen/import endpoints
    services/kmzGenerator.ts       # archiver-based KMZ builder
    services/kmzParser.ts          # jszip + XML parser
    services/authService.ts        # JWT + bcrypt
    middleware/auth.ts             # Auth middleware
    lib/wpml.ts                    # WPML XML builders
  frontend/src/
    main.tsx                       # Entry point
    App.tsx                        # Root layout (sidebar + map)
    store/missionStore.ts          # Zustand state
    components/
      map/
        MapView.tsx                # Leaflet map container
        WaypointMarker.tsx         # Draggable numbered markers
        PoiMarker.tsx              # POI target markers
        MapToolbar.tsx             # Add/Pan/POI/Obstacle/Clear tools
        ObstacleDrawHandler.tsx    # Click-to-draw polygon interaction
        ObstaclePolygon.tsx        # Polygon rendering + vertex editing
      waypoint/
        WaypointList.tsx           # Sortable waypoint list
        WaypointEditor.tsx         # Edit selected waypoint
        ActionEditor.tsx           # Add/configure actions
      mission/
        MissionConfig.tsx          # Global mission settings
        PoiList.tsx                # POI list + editor
        ObstacleList.tsx           # Obstacle list + editor
      ui/                          # shadcn/ui primitives
```

## UI Layout

```
+------------------------------------------------------------------+
| [drone] DroneRoute   [Mission Name Input]                           |
| [Save] [Export KMZ] [Import]                                     |
+------------------+-----------------------------------------------+
| v WAYPOINTS (3)  |                                               |
| [=] 1  50m 7m/s  |                                               |
| [=] 2  75m 7m/s  |        Interactive Map                        |
| [=] 3  60m 10m/s |        (Leaflet + OpenStreetMap)               |
|                  |                                     [Add WP]  |
| v POIS (1)       |        o---1---2---3  (flight path) [Add POI] |
| [*] Tower        |        |             [Obstacle]     [Clear]    |
|                  |        * POI                                   |
| v OBSTACLES (1)  |        /---\  obstacle polygon                 |
| [▲] Building A   |        \---/                                   |
|                  |                                               |
| > MISSION CONFIG |                                               |
|                  |                                               |
| v EDIT WP 2      |                                               |
| Alt: [75] m      |                                               |
| Speed: [7] m/s   |                                               |
| Gimbal: [-45] d  |                                               |
| Heading: towardPOI|                                              |
|   POI: [Tower v] |                                               |
| Actions:         |                                               |
|  * Take Photo  x |                                               |
|  [+ Add Action]  |                                               |
+------------------+-----------------------------------------------+
| 3 waypoints | 1 POI | ~340m / 48s                                    |
+------------------------------------------------------------------+
```
