# RescueEye :D

RescueEye is a web platform for drone-based search-and-rescue. Drone footage is
analysed by AI to flag possible casualties and damage; Command Staff verify what
the AI found, dispatch the nearest available Field Responders, and track each
incident to resolution.

The repo has two parts:

- **Web app** (`src/`) — React + TypeScript, backed by Supabase PostgreSQL for
  accounts, organizations and drones, with in-memory stores for the rest.
- **Detection API** (`api/`) — Python FastAPI service that runs the AI models
  over live and uploaded drone feeds (casualty detection, damage classification,
  fire/smoke detection).

## Roles

| Role | What they do |
|---|---|
| **System Admin** | Reviews and approves organization registrations; manages organization account status. |
| **Agency Admin** | Manages the organization's personnel (Add Staff, activate/deactivate) and monitors response teams and incident history. |
| **Command Staff** | Watches live drone feeds, reviews AI detections, verifies casualties, dispatches responders, registers drones, uses the Damage Map. |
| **Field Responder** | Receives missions, views mission details and the map, updates status. |

Each role has its own route group in [src/app/router.tsx](src/app/router.tsx), gated by
[ProtectedRoute](src/features/auth/ProtectedRoute.tsx).

## Project structure

```
src/                         Web app
  app/                       router, root layout, query client, role layouts
  pages/                     one component per screen
  components/                UI, grouped by feature area
    ui/                      shared building blocks (Button, Panel, Table, …)
    landing/registration/    organization sign-up steps
    agency-admin/ command-staff/ detections/ map/ media/ …
  features/                  role data providers, auth, theming, media feeds
  db/                        Supabase data-access hooks (agencies, staff, drones, profiles)
  state/                     shared in-memory stores (detections, incidents, missions, …)
  hooks/                     general-purpose React hooks
  lib/                       utilities (Supabase client, labels, phone/address helpers, …)
  data/                      mock seed data for demo accounts
  types/                     shared domain types
  routes/                    route path definitions

api/                         Detection API (FastAPI)
  main.py                    app entry point
  routers/                   HTTP endpoints (/detect, /classify, /stream, /detections, …)
  services/                  model loading, casualty verdict, tracking, feeds, georeferencing
  models/                    weights the server loads (victim, damage, fire)
    base/                    stock Ultralytics weights (COCO, pose, classifier)
    archive/                 retired weights kept for reference
  scripts/training/          dataset preparation, training and evaluation scripts
  runs/                      training runs and candidate models (not in git)
  data/                      datasets, uploads and media (not in git)
  tests/                     pytest suite

supabase/migrations/         SQL to run in the Supabase SQL editor, in order
docs/                        data dictionary, database and Supabase guides
```

Model weights, datasets and training runs are **not in git** (see `.gitignore`) —
share them separately.

## Getting started

### Web app

Prerequisites: Node.js 18+, a Supabase project.

```bash
npm install
```

Create `.env` in the repo root:

```env
VITE_SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
```

```bash
npm run dev      # http://localhost:5173
npm run build    # type-check and build for production
npm run lint     # oxlint
```

### Detection API

Prerequisites: Python 3.11, FFmpeg (bundled via `imageio-ffmpeg`).

```bash
cd api
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

- On Windows with any GPU, install `onnxruntime-directml` so models run on the GPU.
- `torch` must stay below 2.6 (pinned in `requirements.txt`).
- Put the trained weights in `api/models/` and the stock ones in `api/models/base/`.
  (Older checkouts with the stock weights loose in `api/` still work.)
- Tests: `.venv\Scripts\python.exe -m pytest -q`

### Database migrations

Run each file in [supabase/migrations/](supabase/migrations/) **in order** in the
Supabase SQL editor. They are plain SQL — there is no migration tool. The live
schema is whatever Supabase has; [docs/data-dictionary.md](docs/data-dictionary.md)
describes it.

## AI models

| Model | File | Trained on | Used for |
|---|---|---|---|
| Person detector | `models/victim_best.pt` (+ `victim_fast.onnx`) | VisDrone | finding people; a separate casualty check (posture + stillness) decides who is a casualty |
| Damage classifier | `models/damage_best.pt/.onnx` | AIDER + demo clips | labelling a frame as fire / flood / structural / no damage |
| Fire/smoke detector | `models/fire_best.pt/.onnx` | D-Fire | boxes around fire and smoke |

Training and evaluation scripts are in [api/scripts/training/](api/scripts/training/)
and run in a separate GPU venv (`api/.venv-train`, CUDA PyTorch). Each script's
header explains its data sources and usage. Outputs go to `api/runs/`; a model
only replaces one in `api/models/` after it beats it on the evaluation script.

## Demo accounts

All use password `password123`. Demo accounts are local mock logins — they cannot
register drones or add personnel, and nothing they create is saved.

| Role | Email |
|---|---|
| System Admin | admin@rescueeye.io (needs the seeded Supabase database) |
| Agency Admin | agencyadmin@rescueeye.io |
| Command Staff | commandstaff@rescueeye.io |
| Field Responder | responder@rescueeye.io |

More guides: [docs/SUPABASE_INTEGRATION.md](docs/SUPABASE_INTEGRATION.md),
[docs/DATABASE_MIGRATION_GUIDE.md](docs/DATABASE_MIGRATION_GUIDE.md).
