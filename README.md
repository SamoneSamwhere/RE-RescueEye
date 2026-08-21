# RescueEye

RescueEye is a web dashboard for drone-based search-and-rescue operations. It turns
AI-flagged detections from drone footage into confirmed incidents, dispatches the
nearest available field responder, and tracks the mission through to resolution.

This repo currently contains the frontend — a React/TypeScript UI running on mock
data and in-memory stores, built out to validate the workflow and role-based screens
before wiring up a real backend.

## Roles

The app is organized around four roles, each with its own dashboard and routes:

- **System Admin** — approves/rejects agency registrations, oversees agency status platform-wide.
- **Agency Admin** — manages an agency's users (creates Command Staff / Field Responder accounts), reviews account status, views mission history.
- **Command Staff** — reviews AI detections from drone footage, confirms incidents, assigns responders, tracks incidents and drones/media on an operational map.
- **Field Responder** — receives mission assignments, views mission details, updates their profile/location.

Each role has a dedicated data provider (e.g. `CommandStaffDataProvider`) and route
group in [src/app/router.tsx](src/app/router.tsx), gated by [ProtectedRoute](src/features/auth/ProtectedRoute.tsx)
and [roleRoutes.ts](src/features/auth/roleRoutes.ts).

## Tech stack

- React 19 + TypeScript, built with Vite
- React Router 7 for routing
- TanStack Query for data fetching
- Tailwind CSS 4 for styling
- Oxlint for linting

## Getting started

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run build    # type-check (tsc -b) and build for production
npm run preview  # preview the production build locally
npm run lint      # run oxlint
```

## Project structure

```
src/
  app/          # router, root layout, query client
  pages/        # top-level route components, one per screen
  components/   # UI grouped by feature area (dashboard, detections, incidents,
                # missions, drones, map, media, landing, layout, ui, ...)
  features/     # role-scoped data providers, auth, theming
  state/        # in-memory stores (agencies, users, detections, incidents, ...)
  data/         # mock seed data used by the stores
  hooks/        # shared hooks
  lib/          # formatting, geo, id, status, and other utilities
  types/        # shared domain types (user, agency, drone, incident, mission, ...)
  routes/       # centralized route path definitions
```

## Status

Data is currently backed by mock stores under [src/state/](src/state/) and
[src/data/](src/data/) rather than a live API, so the app is fully navigable and
demoable without a backend.
