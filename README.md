# DroneRoute

[![CI](https://github.com/fcsonline/droneroute/actions/workflows/ci.yml/badge.svg)](https://github.com/fcsonline/droneroute/actions/workflows/ci.yml)

A free, open-source web application for creating DJI drone waypoint mission files (KMZ). Place waypoints on an interactive map, configure flight parameters, and export WPML-compliant KMZ files ready to load into DJI flight controllers.

**[Try the live demo](https://droneroute.fly.dev)**

![DroneRoute — Mission planner with waypoints, configuration panel, and elevation chart](docs/screenshots/main-map.jpg)

## Features

- **Interactive map** — Click to place waypoints and Points of Interest on OpenStreetMap
- **Waypoint configuration** — Set altitude, speed, gimbal pitch, heading mode, and turn mode per waypoint
- **Points of Interest** — Define POIs and point waypoints toward them with automatic heading
- **Smart gimbal pitch** — Calculates the optimal gimbal angle based on distance and height to a target POI
- **Waypoint actions** — Add photo, video, gimbal rotate, yaw, hover, zoom, and focus actions
- **KMZ export** — Generates DJI WPML-compliant KMZ files (template.kml + waylines.wpml)
- **KMZ import** — Load existing KMZ mission files
- **Save & load** — Persist missions to a local SQLite database with user accounts
- **Animated flight path** — Dashed lines animate in flight direction, speed proportional to each waypoint's configured speed
- **Drag-and-drop reordering** — Reorder waypoints by dragging in the sidebar
- **Keyboard shortcuts** — `W` add waypoint, `P` add POI, `Esc` deselect, `Delete` remove selected
- **Docker self-hosting** — Single-command deployment with Traefik reverse proxy

## Supported Drones

DJI M300 RTK, M350 RTK, M30/M30T, Mavic 3E/3T/3M/3D/3TD, Mini 4 Pro.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS v4, shadcn/ui, Zustand, Leaflet |
| Backend | Node.js, Express 5, better-sqlite3, JWT auth |
| Shared | TypeScript types package (compiled to JS for runtime) |
| Infrastructure | Docker, Traefik v3.6, SQLite |

## Project Structure

```
droneroute/
├── packages/
│   ├── shared/          # TypeScript types, constants, defaults
│   ├── backend/         # Express API server
│   │   └── src/
│   │       ├── routes/       # auth, missions, kmz endpoints
│   │       ├── services/     # KMZ generation & parsing
│   │       ├── models/       # SQLite schema
│   │       └── middleware/    # JWT auth
│   └── frontend/        # React SPA
│       └── src/
│           ├── components/   # map, waypoint, mission, auth, routes
│           ├── store/        # Zustand stores (mission, auth)
│           └── lib/          # API client
├── Dockerfile           # Multi-stage build
├── docker-compose.yml   # Traefik + app
└── package.json         # npm workspaces root
```

## Getting Started

### Prerequisites

- Node.js 22+
- npm 10+

### Development

```bash
# Install dependencies
npm install

# Build the shared types package (required before first run)
npm run build -w packages/shared

# Start both backend and frontend in dev mode
npm run dev
```

The frontend dev server runs on `http://localhost:5173` and proxies API requests to the backend on port `3001`.

### Production Build

```bash
# Build everything (shared → backend → frontend)
npm run build

# Start the production server
npm start
```

The server serves the frontend static files and API on the same port (default `3001`).

### Docker

```bash
# Start with Docker Compose (Traefik + app)
docker compose up -d

# Access at http://droneroute.localhost
```

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `JWT_SECRET` | `change-this-secret-in-production` | Secret for signing JWT tokens |
| `DB_PATH` | `./data/droneroute.db` | SQLite database file path |

Data is persisted in a Docker volume (`droneroute-data`) mounted at `/app/data`.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | No | Create account |
| `POST` | `/api/auth/login` | No | Sign in, returns JWT |
| `GET` | `/api/missions` | Yes | List user's missions |
| `POST` | `/api/missions` | Yes | Save new mission |
| `PUT` | `/api/missions/:id` | Yes | Update mission |
| `DELETE` | `/api/missions/:id` | Yes | Delete mission |
| `POST` | `/api/kmz/generate` | No | Generate KMZ from mission data |
| `POST` | `/api/kmz/import` | No | Parse uploaded KMZ file |

## License

MIT
