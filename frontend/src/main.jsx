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
const CustomersPage = lazy(() => import("./pages/customers.tsx"))
const NFCScanPage = lazy(() => import("./pages/nfc-scan.tsx"))
const LoginPage = lazy(() => import("./pages/login.tsx"))
const AppointmentsPage = lazy(() => import("./pages/appointments.tsx"))
const UploadPage = lazy(() => import("./pages/upload.tsx"))
const AccountsPage = lazy(() => import("./pages/accounts.tsx"))
const ResetPasswordPage = lazy(() => import("./pages/reset-password.tsx"))

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
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={
            <Suspense fallback={<PageLoader />}>
              <Dashboard />
            </Suspense>
          } />
          <Route path="/dashboard/scan" element={
            <Suspense fallback={<PageLoader />}>
              <NFCScanPage />
            </Suspense>
          } />
          <Route path="/dashboard/customers" element={
            <Suspense fallback={<PageLoader />}>
              <CustomersPage />
            </Suspense>
          } />
          <Route path="/dashboard/checkin-logs" element={
            <Suspense fallback={<PageLoader />}>
              <CheckinLogsPage />
            </Suspense>
          } />
          <Route path="/dashboard/appointments" element={
            <Suspense fallback={<PageLoader />}>
              <AppointmentsPage />
            </Suspense>
          } />
          <Route path="/dashboard/upload" element={
            <Suspense fallback={<PageLoader />}>
              <UploadPage />
            </Suspense>
          } />
          <Route path="/dashboard/accounts" element={
            <Suspense fallback={<PageLoader />}>
              <AccountsPage />
            </Suspense>
          } />
        </Route>
      </Routes>
    </AuthProvider>
  </BrowserRouter>,
)
