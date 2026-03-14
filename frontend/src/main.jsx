/**
 * Application Entry Point
 * ========================
 * 
 * Main entry point for the React application.
 * Sets up React Router for client-side navigation.
 * Includes authentication protection for dashboard routes.
 * 
 * Routes:
 * - /        : Redirects to /dashboard (protected)
 * - /login   : Login page (public - redirects to dashboard if authenticated)
 * - /signup  : Registration page (public - redirects to dashboard if authenticated)
 * - /dashboard/* : Protected dashboard routes (requires authentication)
 */

import { lazy, Suspense } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import "./index.css"

import { AuthProvider } from "./contexts/auth-context.tsx"
import { ProtectedRoute, PublicRoute } from "./components/auth"
import { DashboardLayout } from "./components/layout"

// Lazy load all page components for code splitting
const Dashboard = lazy(() => import("./pages/dashboard.tsx"))
const CheckinLogsPage = lazy(() => import("./pages/checkin-logs.tsx"))
const UserLogsPage = lazy(() => import("./pages/user-logs.tsx"))
const CustomersPage = lazy(() => import("./pages/customers.tsx"))
const NFCScanPage = lazy(() => import("./pages/nfc-scan.tsx"))
const LoginPage = lazy(() => import("./pages/login.tsx"))
const AppointmentsPage = lazy(() => import("./pages/appointments.tsx"))
const UploadPage = lazy(() => import("./pages/upload.tsx"))
const AccountsPage = lazy(() => import("./pages/accounts.tsx"))
const TreatmentsPage = lazy(() => import("./pages/treatments.tsx"))
const ReportsPage = lazy(() => import("./pages/reports.tsx"))
const ResetPasswordPage = lazy(() => import("./pages/reset-password.tsx"))
const LoyaltyAdminPage = lazy(() => import("./pages/loyalty-admin.tsx"))

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        {/* Root redirects to dashboard (will redirect to login if not authenticated) */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Public routes - redirect to dashboard if already authenticated */}
        <Route path="/login" element={
          <PublicRoute>
            <Suspense fallback={<PageLoader />}>
              <LoginPage />
            </Suspense>
          </PublicRoute>
        } />

        {/* Password reset — must be outside PublicRoute so the recovery session isn't
            treated as "already authenticated" and redirected to dashboard */}
        <Route path="/reset-password" element={
          <Suspense fallback={<PageLoader />}>
            <ResetPasswordPage />
          </Suspense>
        } />
        
        {/* Protected routes - shared navbar layout */}
        {/* Suspense is handled inside DashboardLayout so the navbar stays visible */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/scan" element={<NFCScanPage />} />
          <Route path="/dashboard/customers" element={<CustomersPage />} />
          <Route path="/dashboard/checkin-logs" element={<CheckinLogsPage />} />
          <Route path="/dashboard/user-logs" element={<UserLogsPage />} />
          <Route path="/dashboard/appointments" element={<AppointmentsPage />} />
          <Route path="/dashboard/treatments" element={<TreatmentsPage />} />
          <Route path="/dashboard/loyalty" element={<LoyaltyAdminPage />} />
          <Route path="/dashboard/upload" element={<UploadPage />} />
          <Route path="/dashboard/accounts" element={<AccountsPage />} />
          <Route path="/dashboard/reports" element={<ReportsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  </BrowserRouter>,
)
