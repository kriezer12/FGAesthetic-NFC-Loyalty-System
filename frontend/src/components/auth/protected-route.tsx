/**
 * Protected Route Component
 * =========================
 * 
 * Wrapper component that protects routes from unauthenticated access.
 * Supports role-based access control (RBAC) with permission checks.
 * Redirects to login page if user is not authenticated.
 * Shows unauthorized page if user lacks required permissions.
 * 
 * Usage:
 *   // Basic protection (any authenticated user)
 *   <Route path="/dashboard" element={
 *     <ProtectedRoute>
 *       <Dashboard />
 *     </ProtectedRoute>
 *   } />
 * 
 *   // Role-based protection
 *   <Route path="/admin" element={
 *     <ProtectedRoute allowedRoles={['super_admin']}>
 *       <AdminPanel />
 *     </ProtectedRoute>
 *   } />
 * 
 *   // Permission-based protection
 *   <Route path="/inventory" element={
 *     <ProtectedRoute requiredPermissions={['inventory:read']}>
 *       <Inventory />
 *     </ProtectedRoute>
 *   } />
 */

import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import type { UserRole, Permission } from "@/types/auth"

interface ProtectedRouteProps {
  children: React.ReactNode
  /** Roles allowed to access this route (any of these roles can access) */
  allowedRoles?: UserRole[]
  /** Permissions required to access this route (all permissions required) */
  requiredPermissions?: Permission[]
  /** Permissions where any one is sufficient (alternative to requiredPermissions) */
  anyPermissions?: Permission[]
  /** Custom fallback component for unauthorized access */
  unauthorizedFallback?: React.ReactNode
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  requiredPermissions,
  anyPermissions,
  unauthorizedFallback,
}: ProtectedRouteProps) {
  const { user, profile, role, loading, hasPermission, hasAllPermissions, hasAnyPermission } = useAuth()
  const location = useLocation()

  // Render nothing while checking initial auth state (avoids loading flash)
  if (loading) {
    return null
  }

  // Redirect to login if not authenticated
  // Save the attempted URL in state so we can redirect after login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check if user has a profile (required for RBAC)
  // Users without profiles can still access if no role/permission restrictions
  const hasRestrictions = allowedRoles || requiredPermissions || anyPermissions
  
  if (hasRestrictions && !profile) {
    // User is authenticated but has no profile - show setup message
    return unauthorizedFallback ?? (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-6">
          <h1 className="text-2xl font-bold mb-2">Account Setup Required</h1>
          <p className="text-muted-foreground mb-4">
            Your account hasn't been fully set up yet. Please contact an administrator to configure your access.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-primary hover:underline"
          >
            Refresh page
          </button>
        </div>
      </div>
    )
  }

  // Check role-based access
  if (allowedRoles && role) {
    if (!allowedRoles.includes(role)) {
      return unauthorizedFallback ?? <UnauthorizedMessage />
    }
  }

  // Check if user has all required permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    if (!hasAllPermissions(requiredPermissions)) {
      return unauthorizedFallback ?? <UnauthorizedMessage />
    }
  }

  // Check if user has any of the specified permissions
  if (anyPermissions && anyPermissions.length > 0) {
    if (!hasAnyPermission(anyPermissions)) {
      return unauthorizedFallback ?? <UnauthorizedMessage />
    }
  }

  // User is authenticated and authorized, render the protected content
  return <>{children}</>
}

/**
 * Default unauthorized message component
 */
function UnauthorizedMessage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md p-6">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">
          You don't have permission to access this page. If you believe this is an error, please contact your administrator.
        </p>
        <a href="/dashboard" className="text-primary hover:underline">
          Return to Dashboard
        </a>
      </div>
    </div>
  )
}
