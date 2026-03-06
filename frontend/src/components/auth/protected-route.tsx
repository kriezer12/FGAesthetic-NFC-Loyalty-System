/**
 * Protected Route Component
 * =========================
 * 
 * Wrapper component that protects routes from unauthenticated access.
 * Redirects to login page if user is not authenticated.
 * Shows loading state while checking authentication.
 * 
 * Usage:
 *   <Route path="/dashboard" element={
 *     <ProtectedRoute>
 *       <Dashboard />
 *     </ProtectedRoute>
 *   } />
 */

import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { LoadingScreen } from "./loading-screen"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Show branded loading screen while checking auth state
  if (loading) {
    return <LoadingScreen />
  }

  // Redirect to login if not authenticated
  // Save the attempted URL in state so we can redirect after login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // User is authenticated, render the protected content
  return <>{children}</>
}
