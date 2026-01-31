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

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import "./index.css"

import { AuthProvider } from "./contexts/auth-context.tsx"
import { ProtectedRoute, PublicRoute } from "./components/auth"

import CheckinLogsPage from "./pages/checkin-logs.tsx"
import CustomersPage from "./pages/customers.tsx"
import Dashboard from "./pages/dashboard.tsx"
import NFCScanPage from "./pages/nfc-scan.tsx"
import LoginPage from "./pages/login.tsx"
import SignupPage from "./pages/signup.tsx"
import UserManagementPage from "./pages/user-management.tsx"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Root redirects to dashboard (will redirect to login if not authenticated) */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Public routes - redirect to dashboard if already authenticated */}
          <Route path="/login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />
          <Route path="/signup" element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          } />
          
          {/* Protected routes - require authentication */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/scan" element={
            <ProtectedRoute>
              <NFCScanPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/customers" element={
            <ProtectedRoute>
              <CustomersPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/checkin-logs" element={
            <ProtectedRoute>
              <CheckinLogsPage />
            </ProtectedRoute>
          } />
          
          {/* Admin routes - require users:read permission */}
          <Route path="/dashboard/users" element={
            <ProtectedRoute requiredPermissions={["users:read"]}>
              <UserManagementPage />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
