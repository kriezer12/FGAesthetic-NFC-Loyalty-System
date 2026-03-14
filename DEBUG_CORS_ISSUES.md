# Debugging CORS Issues

If you're seeing "CORS request did not succeed" errors when accessing the reports page, follow this guide to troubleshoot.

## Quick Diagnostics

### 1. Verify Backend is Running

**In Docker:**
```bash
# Check if backend container is running
docker ps | grep fgaesthetic-backend

# Check backend logs for errors
docker logs fgaesthetic-backend

# Test health endpoint
curl http://localhost:5000/health
```

**Locally (without Docker):**
```bash
# Navigate to backend directory
cd backend

# Install requirements
pip install -r requirements.txt

# Run backend
python -m app.main
```

**Expected Output:**
```
[APP] Starting FG Aesthetic NFC Loyalty System API...
[APP] SUPABASE_URL: ✓ Set
[APP] SUPABASE_KEY: ✓ Set
[APP] SUPABASE_SERVICE_KEY: ✓ Set
[APP] Application initialized successfully!
[APP] Listening on http://0.0.0.0:5000
```

### 2. Check Environment Variables

**For Backend:**
The `.env` file in the project root should contain:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=sb_publishable_...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI...
```

**For Frontend (Docker):**
The `docker-compose.yml` sets:
- `BACKEND_URL=http://backend:5000` (for Vite to proxy requests)

### 3. Test API Endpoints Directly

From your local machine:
```bash
# Test if backend responds
curl -v http://localhost:5000/

# Test CORS headers
curl -v -H "Origin: http://localhost:5173" http://localhost:5000/

# Test reports endpoint
curl http://localhost:5000/api/reports/clients/counts
```

**Expected Response:** Should include `Access-Control-Allow-Origin` header.

### 4. Check Frontend Vite Dev Server

**In Docker:**
```bash
# Check frontend logs
docker logs fgaesthetic-frontend

# Test if Vite is running
curl http://localhost:5173
```

**Locally (without Docker):**
```bash
cd frontend
npm install
npm run dev
```

## Common Issues and Solutions

### Issue: "CORS request did not succeed" (Status: null)

**Cause:** Backend is not responding to requests.

**Solutions:**

1. **Backend container failed to start**
   - Check if Supabase credentials are set in `.env` file
   - Run: `docker logs fgaesthetic-backend`
   - Look for error messages about missing `SUPABASE_URL`, `SUPABASE_KEY`, or `SUPABASE_SERVICE_KEY`

2. **Backend is running but not accessible**
   - Verify port 5000 is not blocked: `lsof -i :5000`
   - Check if Docker network is working: `docker network ls`
   - Try direct curl: `curl http://localhost:5000/health`

3. **Vite proxy not forwarding requests correctly**
   - Check frontend logs: `docker logs fgaesthetic-frontend`
   - Verify `BACKEND_URL` environment variable in `docker-compose.yml`
   - Make sure Vite dev server is running: `curl http://localhost:5173`

### Issue: "API endpoint returns 500 error"

**Cause:** Supabase client initialization failed.

**Solution:** Check backend logs for specific error:
```bash
docker logs fgaesthetic-backend | grep -i "SUPABASE\|ERROR"
```

### Issue: Connection refused or timeout

**Cause:** Services are not running or ports are blocked.

**Solutions:**
1. Check if Docker containers are running: `docker ps`
2. Check if ports are in use: `sudo lsof -i :5000` and `sudo lsof -i :5173`
3. Rebuild and restart: `docker-compose down && docker-compose up --build`

## Running with Docker Compose

### Full Reset

```bash
# Stop all services
docker-compose down

# Remove volumes (careful - this deletes data!)
docker-compose down -v

# Rebuild and start
docker-compose up --build
```

### View Real-time Logs

```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend

# All logs
docker-compose logs -f
```

## Testing the Fix

Once started:

1. **Visit frontend:** http://localhost:5173
2. **Navigate to Reports page**
3. **Check browser console** (F12) for errors
4. **Verify network tab:**
   - Requests should go to `/api/reports/...`
   - Response should include `Access-Control-Allow-Origin` header
   - Status should be 200 (not 5xx or connection error)

## Production Deployment Notes

When deploying to production:

1. Set `BACKEND_URL` to your production backend URL in the environment
2. Update CORS origins in `backend/app/main.py` for your production domain
3. Use environment variables for sensitive data (don't hardcode in code)
4. Ensure both files are built and deployed correctly

## Getting Help

If issues persist:

1. Check backend logs: `docker logs fgaesthetic-backend`
2. Check frontend logs: `docker logs fgaesthetic-frontend`
3. Verify `.env` file has all required variables
4. Ensure Supabase project is accessible (test from backend container)
5. Check network connectivity between containers
