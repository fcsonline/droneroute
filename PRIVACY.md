# Privacy & data handling

This document explains what data DroneRoute stores, where it lives, and who can
see it. DroneRoute is open source and **self-hosted first**: in the default
setup, every byte of your data stays on the server you run, and the DroneRoute
authors never receive any of it.

> DroneRoute can run in two modes. **Self-hosted** (the default) means _you_ run
> the server and own the database. **Cloud** means someone operates a hosted
> instance for you. In cloud mode, the operator of that instance is the data
> controller — this document describes what the software stores, but the hosting
> operator is responsible for their own privacy commitments.

## What we store

DroneRoute keeps everything in a single SQLite database file. There are three
kinds of data:

### Account data

- **Email address** — your identifier for signing in.
- **Password hash** — your password is stored only as a bcrypt hash, never in
  plain text. (Accounts created via Google sign-in have no password.)
- **Google account ID** — only if you sign in with Google (cloud mode).
- **Flags and timestamps** — whether your email is verified, admin/ban status,
  account creation time, and last login time.

### Mission data

- The missions you save: their name, flight configuration, waypoints, points of
  interest, obstacles, and a share token if you've shared the mission.

### Preferences

- Your app settings (default view mode, map style, mission defaults), so they
  sync across your devices.

### In your browser

- After you sign in, your authentication token and email are stored in the
  browser's `localStorage` so you stay logged in. There are no tracking cookies.

## Where your data lives

- All account, mission, and preference data is stored in a **SQLite database
  file** on the server (path set by `DB_PATH`; in Docker this is the
  `/app/data/droneroute.db` volume).
- In self-hosted mode this is **your own machine or server** — the data never
  leaves it and is never sent to the DroneRoute authors.
- The database is not encrypted at rest; protect the server and its backups
  accordingly.

## Third-party services

DroneRoute uses a few external services to function. It does **not** use any
analytics, advertising, or behavioural tracking.

- **Mapbox** — map tiles and the location search box are served by Mapbox.
  Your current map view and any search terms you type are sent to Mapbox so it
  can return tiles and results. See Mapbox's privacy policy for how they handle
  these requests.
- **Airspace providers** — when you enable airspace restrictions, the bounding
  box of your current map view is sent to the relevant national provider
  (e.g. ENAIRE in Spain, DGAC in France, NATS in the UK) to fetch the zones.
- **Google** — only in cloud mode, and only if you choose Google sign-in. Your
  Google credential is verified server-side; we store your email and a Google
  account identifier.
- **Gravatar** — your profile picture is fetched from Gravatar using a hash of
  your email address.

## Sharing missions

If you create a share link for a mission, **anyone with that link can view the
mission** without signing in, and the shared view shows the mission owner's
email address. Only share links with people you trust, and remove the share when
you no longer need it.

## Retention and deletion

- Missions stay until you delete them.
- Account data stays until the account is removed. In self-hosted mode you
  control the database directly; in cloud mode, contact the instance operator to
  request deletion.

## Your rights (GDPR / CCPA)

Depending on where you live, you may have the right to access, correct, export,
or delete your personal data. Because DroneRoute is self-hosted first, the party
responsible for fulfilling these requests is whoever operates the instance you
use:

- **Self-hosted** — you are the operator and have full, direct access to the
  database.
- **Cloud** — contact the operator of that instance.

## Changes

This document may be updated as DroneRoute evolves. Material changes will be
noted in the project changelog.
