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
- **Command Staff** — reviews AI detections from drone footage, confirms incidents, assigns responders, tracks incidents and drones/media on a Damage Map.
- **Field Responder** — receives mission assignments, views mission details, updates their profile/location.

Each role has a dedicated data provider (e.g. `CommandStaffDataProvider`) and route
group in [src/app/router.tsx](src/app/router.tsx), gated by [ProtectedRoute](src/features/auth/ProtectedRoute.tsx)
and [roleRoutes.ts](src/features/auth/roleRoutes.ts).

## Tech stack

**Frontend:**
- React 19 + TypeScript, built with Vite
- React Router 7 for routing
- TanStack Query for data fetching
- Tailwind CSS 4 for styling
- Oxlint for linting

**Backend (in progress):**
- Node.js with Express/Fastify
- PostgreSQL (hosted on Supabase)
- Prisma ORM for database access

## Getting started

### Prerequisites
- Node.js 18+
- A Supabase account (free tier works)

### Setup

**1. Clone and install:**
```bash
git clone <your-repo-url>
cd "RE RescueEye"
npm install
```

**2. Set up database:**
Create a `.env` file in the root directory:
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```

Get your connection string from [Supabase](https://supabase.com):
- Sign in to your project
- Go to Settings → Database → Connection string
- Copy the PostgreSQL connection string
- Replace `[PASSWORD]` and `[HOST]` with your values

**3. Generate Prisma client:**
```bash
npx prisma generate
```

**4. Run dev server:**
```bash
npm run dev
```

### Available scripts

```bash
npm run dev      # start dev server
npm run build    # type-check (tsc -b) and build for production
npm run preview  # preview the production build locally
npm run lint     # run oxlint
```

### Database

Prisma schema is in `prisma/schema.prisma`. To modify the schema:

```bash
# Update schema.prisma, then:
npx prisma db push     # sync changes to database
npx prisma generate    # regenerate TypeScript client
```

### For teammates

1. Clone this repo
2. Run `npm install`
3. Create your own `.env` file with the Supabase `DATABASE_URL`
   - **Option A:** Use the shared Supabase project (same database as the team)
   - **Option B:** Create your own Supabase project (isolated testing)
4. Run `npx prisma generate`
5. Run `npm run dev`

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

**Frontend:** React UI complete and fully navigable with all role-based dashboards.

**Backend:** In progress. Database schema set up on Supabase with Prisma ORM. API endpoints are being built out to replace mock data stores.
