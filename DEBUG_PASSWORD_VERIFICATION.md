# Password Verification 401 Error - Debugging Guide

## Quick Fix & Testing Steps

### **Step 1: Start the Application**

**Frontend:**
```bash
cd frontend
npm run dev
```

**Backend:**
```bash
cd backend
.\venv\Scripts\activate
python -m app.main
# or
flask run
```

### **Step 2: Check Browser Console**

1. Open Chrome DevTools: `F12`
2. Go to **Console** tab
3. Try to delete an account/appointment
4. Look for error messages starting with `[Password Verification]`

### **Step 3: Check Network Tab**

1. Go to **Network** tab in DevTools
2. Look for request to `verify-password`
3. Check:
   - **URL**: Should be `http://localhost:5000/api/accounts/verify-password`
   - **Status**: If 401, check Request Headers below
   - **Request Headers**: Look for `Authorization: Bearer YOUR_TOKEN`
   - **Response**: Should show error message

### **Step 4: Backend Debugging**

When you see the 401 error, check the **Terminal** where backend is running. You should see `[DEBUG]` messages like:

```
[DEBUG] Authorization header is missing
OR
[DEBUG] Successfully extracted user_id: <uuid>
```

**Common Issues:**

| Debug Message | Solution |
|---|---|
| `Authorization header is missing` | Frontend not sending auth header. Check Session in auth context |
| `Invalid auth header format` | Extra spaces in token. Check frontend token formatting |
| `Token does not contain user ID (sub)` | Token is malformed. Try logging out and back in |
| `JWT decode error` | Token is expired. Try refreshing page and logging in again |
| `Successfully extracted user_id` | Token is valid, but next step failed. Check user_profiles table |

### **Step 5: Quick Test**

If backend shows successful token extraction but still getting 401:

1. Check that user exists in Supabase `user_profiles` table
2. Open Supabase Dashboard → SQL Editor
3. Run:
```sql
SELECT id, email, role FROM user_profiles LIMIT 10;
```

Verify your user is listed.

### **Step 6: Test Password Verification Manually**

Use curl to test the endpoint directly:

```bash
# On Windows PowerShell:
$token = "YOUR_JWT_TOKEN_HERE"
$body = @{ password = "your_password" } | ConvertTo-Json

curl.exe -X POST http://localhost:5000/api/accounts/verify-password `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d $body
```

Expected Response (Success):
```json
{
  "success": true,
  "verified": true
}
```

Expected Response (Wrong Password):
```json
{
  "success": false,
  "verified": false,
  "error": "Incorrect password"
}
```

Expected Response (No Token):
```json
{
  "error": "Authorization header is required"
}
```

### **Step 7: Session Check**

Add this to your browser console to verify you have a valid session:

```javascript
// Check if session exists
const { session, user } = /* your auth context */
console.log("Session:", session?.access_token ? "✓" : "✗ Missing")
console.log("User:", user?.id ? "✓" : "✗ Missing")
console.log("Token Preview:", session?.access_token?.substring(0, 20) + "...")
```

## Most Common Solutions

1. **Not logged in**: Try logging out and back in
2. **Expired session**: Refresh the page
3. **Supabase issue**: Check that service key is correct in `.env`
4. **Backend not running**: Make sure Flask server is running on port 5000

## Files That Were Updated

✅ `backend/app/routes/accounts.py` - Improved token parsing
✅ `frontend/src/hooks/use-password-verification.ts` - Better error handling
✅ `frontend/src/hooks/use-accounts.ts` - Better error handling
✅ `frontend/src/components/auth/password-verification-dialog.tsx` - Added logging

## If Still Not Working

Check these files for configuration issues:

1. `.env` - Verify `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_KEY`
2. `backend/app/config.py` - Check env vars are loaded correctly
3. `frontend/.env` - Verify `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`

