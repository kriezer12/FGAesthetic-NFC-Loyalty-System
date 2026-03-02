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

interface PublicRouteProps {
  children: React.ReactNode
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
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
