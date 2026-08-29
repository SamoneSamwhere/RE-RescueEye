# RescueEye

RescueEye is a web dashboard for drone-based search-and-rescue operations. It turns
AI-flagged detections from drone footage into confirmed incidents, dispatches the
nearest available field responder, and tracks the mission through to resolution.

This repo contains a React/TypeScript frontend with mock data and in-memory stores for core workflows, plus Supabase PostgreSQL backend integration for drone registration and user profile management.

## Roles

The app is organized around four roles, each with its own dashboard and routes:

- **System Admin** — approves/rejects agency registrations, oversees agency status platform-wide, manages profile & password.
- **Agency Admin** — manages an agency's users (creates Command Staff / Field Responder accounts), reviews account status, views mission history, manages profile & password.
- **Command Staff** — reviews AI detections from drone footage, confirms incidents, assigns responders, registers drones, tracks incidents and drones/media on a Damage Map, manages profile & password.
- **Field Responder** — receives mission assignments, views mission details, views profile, updates password, manages location.

Each role has a dedicated data provider (e.g. `CommandStaffDataProvider`) and route
group in [src/app/router.tsx](src/app/router.tsx), gated by [ProtectedRoute](src/features/auth/ProtectedRoute.tsx)
and [roleRoutes.ts](src/features/auth/roleRoutes.ts).

## ✨ Recent Features

### 1. User Profile Management & Password Change
- All roles can now edit their profile (name, email, phone)
- Secure password change with validation
- Settings accessible from user menu in top-right
- Routes: `/[role]/settings`
- See [Profile Management](src/components/profile/) for implementation

### 2. Comprehensive Drone Registration
- Multi-step registration workflow (4 steps)
  - Step 1: Drone Information (name, manufacturer, model, type)
  - Step 2: Registration Details (serial number, registration number, date acquired)
  - Step 3: Assignment & Operations (operator, status, inspection date, notes)
  - Step 4: Review/Confirmation
- Full validation and uniqueness checks
- Realistic for disaster-response systems
- See [Drone Registration Components](src/components/drones/registration/)

### 3. Supabase Database Integration
- PostgreSQL database with comprehensive drone schema
- React hook (`useDroneDatabase`) for database operations
- Validation layer with duplicate checking
- Real-time database writes
- See [Supabase Integration Guide](SUPABASE_INTEGRATION.md)

## Tech stack

**Frontend:**
- React 19 + TypeScript, built with Vite
- React Router 7 for routing
- TanStack Query for data fetching
- Tailwind CSS 4 for styling
- Oxlint for linting
- Supabase JavaScript client for database access

**Backend:**
- PostgreSQL (hosted on Supabase)
- Prisma ORM for schema management
- Row-Level Security (RLS) ready for production

## Getting started

### Prerequisites
- Node.js 18+
- Supabase account with PostgreSQL database

### Setup

**1. Clone and install:**
```bash
git clone <your-repo-url>
cd "RE RescueEye"
npm install
```

**2. Set up environment variables:**
Create a `.env` file in the root directory:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]

# Backend Database (optional, for Prisma CLI)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```

Get your Supabase credentials:
- Go to your Supabase project settings
- Copy Project URL and Anon Key from API settings

**3. Run dev server:**
```bash
npm run dev
```

### Available scripts

```bash
npm run dev      # start dev server (http://localhost:5173)
npm run build    # type-check (tsc -b) and build for production
npm run preview  # preview the production build locally
npm run lint     # run oxlint
```

### Database Operations

#### View current schema
```bash
# Supabase Dashboard → SQL Editor
# Or view prisma/schema.prisma for reference
```

#### Update schema
```bash
# Edit prisma/schema.prisma, then:
npx prisma db push     # sync changes to database
npx prisma generate    # regenerate TypeScript types
```

#### Test database connection
Use the `useDroneDatabase` hook in any component:
```typescript
import { useDroneDatabase } from './hooks/useDroneDatabase'

function MyComponent() {
  const { getDronesByAgency, isLoading } = useDroneDatabase()
  
  useEffect(() => {
    getDronesByAgency(1).then(drones => console.log(drones))
  }, [])
}
```

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| System Admin | admin@rescueeye.io | password123 |
| Agency Admin | agencyadmin@rescueeye.io | password123 |
| Command Staff | commandstaff@rescueeye.io | password123 |
| Field Responder | responder@rescueeye.io | password123 |

### For teammates

1. Clone this repo
2. Run `npm install`
3. Create your own `.env` file with Supabase credentials
4. Run `npm run dev`
5. See [SUPABASE_INTEGRATION.md](SUPABASE_INTEGRATION.md) for database details

## Project structure

```
src/
  app/              # router, root layout, query client
  pages/            # top-level route components, one per screen
  components/       # UI grouped by feature area
    profile/        # Profile edit & password change forms
    drones/         # Drone list, cards, registration workflow
      registration/ # Multi-step drone registration forms
    ...other areas
  features/         # role-scoped data providers, auth, theming
  state/            # in-memory stores for non-database data
  data/             # mock seed data used by stores
  hooks/            
    useDroneDatabase.ts  # React hook for drone database operations
    ...other hooks
  lib/
    supabase.ts     # Supabase client & utilities
    ...other utilities
  types/            # shared domain types
  routes/           # centralized route path definitions
prisma/
  schema.prisma     # Database schema (Supabase PostgreSQL)
```

## Key Features by Role

### All Roles
- ✅ View and edit profile (name, email, phone)
- ✅ Change password securely
- ✅ Logout

### System Admin
- ✅ Review and approve/reject agency registrations
- ✅ Manage agency account status
- ✅ View agency details

### Agency Admin
- ✅ Create Command Staff and Field Responder accounts
- ✅ View and manage user account status
- ✅ View incident history

### Command Staff
- ✅ Review AI detections from drone footage
- ✅ Verify/reject detections
- ✅ Create incidents from detections
- ✅ **Register new drones** (with comprehensive form)
- ✅ Connect to drones and start live feeds
- ✅ Upload video footage for AI analysis
- ✅ View incidents and assign responders
- ✅ View Damage Map with incident locations

### Field Responder
- ✅ View mission assignments
- ✅ View mission details and location
- ✅ See current location on map
- ✅ View and edit profile

## Status

**Frontend:** React UI complete and fully navigable with all role-based dashboards.

**Profile Management:** ✅ Complete for all roles

**Drone Registration:** ✅ Complete with multi-step workflow

**Database Integration:** ✅ Supabase PostgreSQL connected
- Mock data still used for most workflows
- Drone registration integrated with database
- Profile/password changes stored in mock data (ready for database integration)

**Next Steps:**
- Integrate remaining workflows with Supabase database
- Implement Row-Level Security (RLS) policies
- Set up production authentication
- Build backend API endpoints (optional, for advanced features)
