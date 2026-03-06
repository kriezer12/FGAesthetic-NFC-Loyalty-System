/**
 * Public Route Component
 * ======================
 * 
 * Wrapper component for public routes (login, signup).
 * Redirects authenticated users to dashboard.
 * Prevents logged-in users from accessing login/signup pages.
 * 
 * Usage:
 *   <Route path="/login" element={
 *     <PublicRoute>
 *       <LoginPage />
 *     </PublicRoute>
 *   } />
 */

import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { LoadingScreen } from "./loading-screen"

interface PublicRouteProps {
  children: React.ReactNode
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Show branded loading screen while checking auth state
  if (loading) {
    return <LoadingScreen />
  }

  // Redirect to dashboard if already authenticated
  // Check if there's a saved location to redirect to
  if (user) {
    const from = location.state?.from?.pathname || "/dashboard"
    return <Navigate to={from} replace />
  }

  // User is not authenticated, render the public content
  return <>{children}</>
}
