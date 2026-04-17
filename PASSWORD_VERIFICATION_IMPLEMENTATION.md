# Secure Password Verification for Deletion

## Overview
This document describes the implementation of secure password verification for deletion of appointments and accounts in the FG Aesthetic Centre application.

## Changes Made

### 1. Backend - Password Verification Endpoint

**File:** `backend/app/routes/accounts.py`

Added a new endpoint `/api/accounts/verify-password` that:
- Accepts POST requests with a password in the request body
- Verifies the user's identity using their JWT token
- Attempts to authenticate the user with their email and provided password
- Returns `verified: true` if password is correct
- Returns `verified: false` with "Incorrect password" error if password is wrong
- Uses Supabase's authentication API for secure verification

**Endpoint Details:**
```
POST /api/accounts/verify-password
Authorization: Bearer <user_token>
Content-Type: application/json

Request: { "password": "user_password" }
Response: { "success": true, "verified": true }
```

### 2. Frontend - Password Verification Hook

**File:** `frontend/src/hooks/use-password-verification.ts`

Created a reusable hook `usePasswordVerification()` that:
- Provides a `verifyPassword(password: string)` method
- Makes API calls to the backend verification endpoint
- Handles authentication using Supabase session token
- Throws errors with appropriate messages for failed verification
- Can be used for any sensitive operation requiring password confirmation

### 3. Frontend - Password Verification Dialog Component

**File:** `frontend/src/components/auth/password-verification-dialog.tsx`

Created a new reusable dialog component `PasswordVerificationDialog` that:
- Displays a secure password input field
- Shows/hides password with an eye icon toggle
- Displays warning about the destructive action
- Shows error messages in a red box
- Handles keyboard Enter key for submission
- Prevents accidental dismissal during verification
- Provides customizable title, description, and action labels
- Manages loading state with disabled buttons during verification

**Props:**
```typescript
interface PasswordVerificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVerify: (password: string) => Promise<void>
  title?: string
  description?: string
  actionLabel?: string
  isVerifying?: boolean
  error?: string | null
}
```

### 4. Frontend - Updated Accounts Management

**Files:**
- `frontend/src/hooks/use-accounts.ts` - Added `verifyPassword` method
- `frontend/src/components/features/accounts/accounts-list.tsx` - Updated deletion flow
- `frontend/src/components/auth/index.ts` - Exported new component

**Changes:**
1. Added `verifyPassword` method to `useAccounts` hook
2. Updated account deletion flow:
   - First shows confirmation dialog asking "Are you sure?"
   - User clicks "Delete" button
   - Password verification dialog appears
   - Only after successful password verification, account is deleted
3. Shows appropriate error messages if password verification fails
4. Disables interactions during verification process

**Flow Diagram:**
```
User clicks Delete → Confirmation Dialog
                        ↓
                  User clicks Delete
                        ↓
              Password Verification Dialog
                        ↓
              Enter password & verify
                        ↓
                (if correct) Account Deleted
              (if incorrect) Show Error & Allow Retry
```

### 5. Frontend - Updated Appointment Deletion

**Files:**
- `frontend/src/components/features/calendar/calendar-view.tsx` - Updated deletion flow

**Changes:**
1. Imported `PasswordVerificationDialog` and `usePasswordVerification`
2. Added password verification state management:
   - `showPasswordVerification` - shows/hides dialog
   - `pendingDeleteId` - tracks which appointment to delete
   - `pendingRecurrenceDelete` - tracks if it's a recurring appointment
   - `verificationError` - stores verification error messages
   - `isVerifying` - tracks verification in progress
3. Modified `handleDelete` to:
   - Check if appointment is part of a recurring series
   - For recurring appointments, show recurrence scope dialog, then password verification
   - For single appointments, directly show password verification dialog
4. Added `handleConfirmedDelete` to execute deletion after verification
5. Updated `handleRecurrenceConfirm` to require password verification before bulk deletion

**Flow Diagram:**
```
User clicks Delete → Password Verification Dialog (for single)
                               ↓
              Enter password & verify
                        ↓
              (if correct) Appointment Deleted

For Recurring Appointments:
User clicks Delete → Recurrence Scope Dialog
                               ↓
              Select scope (this, next-n, all)
                        ↓
              Password Verification Dialog
                        ↓
              Enter password & verify
                        ↓
              (if correct) Appointments Deleted
```

## Security Considerations

1. **Password Verification**: Uses Supabase's built-in authentication for secure password checking
2. **Server-Side Validation**: All password verification happens on the backend
3. **Token-Based Auth**: Uses JWT tokens to identify the current user
4. **No Password Storage**: Passwords are never stored or logged
5. **Rate Limiting**: Consider adding rate limiting to password verification endpoint (future enhancement)
6. **HTTPS Only**: All communications should be over HTTPS in production

## Testing Checklist

- [ ] Test account deletion with correct password
- [ ] Test account deletion with incorrect password
- [ ] Test account deletion cancellation
- [ ] Test single appointment deletion with correct password
- [ ] Test single appointment deletion with incorrect password
- [ ] Test recurring appointment deletion with correct password
- [ ] Test recurring appointment deletion with different scopes (this, next-n, all)
- [ ] Verify error messages appear correctly
- [ ] Test that dialogs close properly after successful deletion
- [ ] Test that password verification state resets properly
- [ ] Test keyboard Enter key submission in password field
- [ ] Test password visibility toggle

## Future Enhancements

1. **Rate Limiting**: Add rate limiting to prevent brute force attacks
2. **Audit Logging**: Log all deletion attempts and verification attempts
3. **Session Invalidation**: Consider invalidating user session after deletion
4. **Email Notifications**: Send email notification when account is deleted
5. **Recovery Window**: Add a grace period where deletions can be undone
6. **OTP Verification**: Optional two-factor authentication for sensitive operations
7. **Backup Reminders**: Show backup reminders before deletion

## Files Modified

1. `backend/app/routes/accounts.py` - Added `/api/accounts/verify-password` endpoint
2. `frontend/src/hooks/use-password-verification.ts` - New file
3. `frontend/src/hooks/use-accounts.ts` - Added `verifyPassword` method
4. `frontend/src/components/auth/password-verification-dialog.tsx` - New file
5. `frontend/src/components/auth/index.ts` - Added export
6. `frontend/src/components/features/accounts/accounts-list.tsx` - Updated deletion flow
7. `frontend/src/components/features/calendar/calendar-view.tsx` - Updated deletion flow

