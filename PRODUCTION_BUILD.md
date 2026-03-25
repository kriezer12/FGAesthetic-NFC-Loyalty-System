# Production Build Guide

This guide describes how to run the FG Aesthetic NFC Loyalty System in a production environment.

## Overview

The production environment differs from development in the following ways:
- **Frontend**: Pre-built static assets served by Nginx (instead of Vite dev server).
- **Backend**: Multi-worker Gunicorn server (instead of Flask dev server).
- **Optimization**: Minified assets, no hot-reloading, and optimized Docker images.

## Deployment Steps

### 1. Configure Environment Variables
Ensure your `.env` file in the project root is populated with the required Supabase credentials and JWT secret.

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_JWT_SECRET=your_jwt_secret
```

### 2. Build and Run
Execute the following command to build the production images and start the containers in detached mode:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

### 3. Verify Deployment
- **Frontend**: Navigate to `http://localhost` (Port 80).
- **Backend**: Check the health status at `http://localhost:5000/health`.

### 4. Monitoring
To view logs from the production services:

```bash
docker-compose -f docker-compose.prod.yml logs -f
```

## Maintenance

To stop the production environment:

```bash
docker-compose -f docker-compose.prod.yml down
```

To update the images after a code change:

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```
