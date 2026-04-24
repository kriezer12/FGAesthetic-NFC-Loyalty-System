# Production Build Guide — FG Aesthetic NFC Loyalty System

This guide covers everything needed to deploy, access, and maintain the system in a production environment using Docker.

---

## Architecture Overview

| Layer | Technology | Port |
|---|---|---|
| Frontend | React + Nginx (static build) | `80` |
| Backend | Python Flask + Gunicorn (4 workers) | `5000` |
| Database | Supabase (hosted) | — |

> **Production vs Development**
> - Frontend is pre-built by Vite and served by Nginx (no hot-reload).
> - Backend runs with Gunicorn with multiple workers (no Flask dev server).
> - No bind-mounted source volumes — code is baked into the Docker image.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- A `.env` file at the project root (see below)

---

## 1. Configure Environment Variables

Ensure the `.env` file at the project root contains the following variables:

```env
# --- Backend ---
SUPABASE_URL=https://<your-project>.supabase.co/
SUPABASE_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_KEY=<your-supabase-service-role-key>
JWT_SECRET=<your-jwt-secret>
BACKEND_URL=http://localhost:5000

# --- Frontend (Build-time) ---
VITE_SUPABASE_URL=https://<your-project>.supabase.co/
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_JWT_SECRET=<your-jwt-secret>
```

> ⚠️ Never commit `.env` to version control. It contains sensitive service role keys.

---

## 2. Build & Run

Execute this single command from the project root to build the images and start both services in detached (background) mode:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

To rebuild after code changes (re-runs full build):

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

---

## 3. Verify Deployment

Once containers are running, confirm both services are healthy:

| Service | URL | Expected |
|---|---|---|
| Frontend | http://localhost | Login page loads |
| Backend health | http://localhost:5000/health | `{"status": "ok"}` |

Check container status:

```bash
docker compose -f docker-compose.prod.yml ps
```

---

## 4. Accessing the System

### Login Page
Open your browser and navigate to:
```
http://localhost
```

### Test Accounts

| Role | Email | Password |
|---|---|---|
| Super Admin | ruzzhelkirbymolina@gmail.com | `testing` |
| Branch Admin | ruzzhelkirbyvmolina@gmail.com | `testing` |
| Staff | hatdogempire@gmail.com | `password` |

> **Staff Login Flow**
> 1. Go to `http://localhost`
> 2. Enter the staff email and password `password`
> 3. Upon first login, staff will be prompted to change their password
> 4. Staff are scoped to their assigned branch — they will only see data relevant to their branch

---

## 5. Viewing Logs

Tail the logs of all services (live):

```bash
docker compose -f docker-compose.prod.yml logs -f
```

Logs for a specific service only:

```bash
# Backend logs
docker compose -f docker-compose.prod.yml logs -f backend

# Frontend / Nginx logs
docker compose -f docker-compose.prod.yml logs -f frontend
```

---

## 6. Stopping the Environment

Gracefully stop all containers (data in Supabase is unaffected):

```bash
docker compose -f docker-compose.prod.yml down
```

Stop and also remove the built images (full clean):

```bash
docker compose -f docker-compose.prod.yml down --rmi all
```

---

## 7. Container Details

| Container | Image built from | Restart Policy |
|---|---|---|
| `fgaesthetic-backend` | `./backend/Dockerfile` | `unless-stopped` |
| `fgaesthetic-frontend` | `./frontend/Dockerfile` (target: `production`) | `unless-stopped` |

The backend health check runs every 30 seconds against `http://localhost:5000/health`. The frontend depends on the backend being healthy before it starts.

---

## 8. Role Permissions Summary

| Permission | Staff | Branch Admin | Super Admin |
|---|---|---|---|
| View customers / appointments | ✅ | ✅ | ✅ |
| Create / edit appointments | ✅ | ✅ | ✅ |
| Manage inventory | ✅ | ✅ | ✅ |
| Manage staff accounts | ❌ | ✅ (own branch) | ✅ (all branches) |
| View all branches | ❌ | ❌ | ✅ |
| Business settings | ❌ | ❌ | ✅ |
| Generate Z-readings / reports | ❌ | ✅ | ✅ |

---

## Troubleshooting

**Port 80 already in use**
```bash
# Find and stop the process using port 80
netstat -aon | findstr :80
taskkill /PID <pid> /F
```

**Container exits immediately**
```bash
# Check startup logs for errors
docker compose -f docker-compose.prod.yml logs backend
```

**Frontend shows blank page**
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set before building. These are baked in at build time and cannot be changed via environment variables after the image is built.

**Backend returns 500 errors**
- Verify `SUPABASE_SERVICE_KEY` is the service role key (not the anon key). The service key is required for admin operations.
