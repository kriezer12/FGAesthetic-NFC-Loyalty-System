# Quick Fix - CORS Issues (Do This Now!)

## 🚀 Immediate Action (5 minutes)

### 1. **Verify .env File Exists** 
```bash
# From project root (FGAC/)
cat .env
```

You should see:
```
SUPABASE_URL=https://...
SUPABASE_KEY=sb_publishable_...
SUPABASE_SERVICE_KEY=eyJhb...
```

⚠️ **If missing anything**, get the values from Supabase Dashboard → Project Settings → API

### 2. **Rebuild and Restart Services**
```bash
# From project root (FGAC/)
docker-compose down
docker-compose up --build
```

**Watch for output:**
- Should see "✓ Set" for SUPABASE_URL, KEY, and SERVICE_KEY
- Should see "Application initialized successfully!"

### 3. **Test Backend**
While containers are running, in a new terminal:
```bash
curl http://localhost:5000/health
```

Expected: `{"status":"healthy"}`

### 4. **Access Frontend**
Open browser: **http://localhost:5173**

Go to **Reports page** - it should work now!

---

## ✅ Verification Checklist

- [ ] `.env` file exists with all SUPABASE_* variables
- [ ] Docker containers are running: `docker ps | grep fgaesthetic`
- [ ] Backend responds: `curl http://localhost:5000/health`
- [ ] Frontend loads: `http://localhost:5173`
- [ ] Reports page shows data (no error messages)
- [ ] Browser console shows no CORS errors

---

## 🔧 If Still Not Working

### Check Backend Logs
```bash
docker logs -f fgaesthetic-backend
```

Look for errors about:
- Missing SUPABASE credentials → Add to `.env` file
- Connection refused → Restart with `docker-compose restart backend`
- Other errors → See [DEBUG_CORS_ISSUES.md](DEBUG_CORS_ISSUES.md)

### Reset Everything
```bash
docker-compose down -v  # WARNING: Removes containers and volumes
docker-compose up --build
```

### Run Diagnostics
```bash
chmod +x diagnose.sh
./diagnose.sh
```

---

## 🆘 Still Stuck?

1. Check: [CORS_SOLUTION.md](CORS_SOLUTION.md) - Detailed explanation
2. Check: [DEBUG_CORS_ISSUES.md](DEBUG_CORS_ISSUES.md) - Troubleshooting guide
3. Run: `./diagnose.sh` - Auto-diagnostics script

---

## 📝 What Was Fixed

The backend now:
- ✅ Validates required environment variables at startup
- ✅ Logs clear status messages when starting
- ✅ Shows which variables are missing (if any)
- ✅ Provides helpful error messages

The frontend:
- ✅ Correctly proxies API requests through Vite
- ✅ Uses the right backend URL in Docker environment

---

## Common Issue Fixes

| Issue | Fix |
|-------|-----|
| "CORS request did not succeed" | Check `.env` file has SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_KEY |
| Backend container won't start | View logs: `docker logs fgaesthetic-backend` |
| Port 5000 or 5173 in use | `lsof -i :5000` or `lsof -i :5173` to find what's using it |
| Stale container | Run `docker-compose down && docker-compose up --build` |

---

**Last Updated:** March 11, 2026  
**Status:** Ready to use with improved error logging and validation
