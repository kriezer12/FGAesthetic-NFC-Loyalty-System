/**
 * RequireRole Component
 * =====================
 * 
 * Conditional rendering component that shows children only if user has an allowed role.
 * Useful for hiding UI elements based on user role hierarchy.
 * 
 * Usage:
 *   // Single role
 *   <RequireRole role="super_admin">
 *     <SuperAdminControls />
 *   </RequireRole>
 * 
 *   // Multiple roles (any of these can access)
 *   <RequireRole roles={['super_admin', 'branch_admin']}>
 *     <AdminPanel />
 *   </RequireRole>
 * 
 *   // With fallback
 *   <RequireRole role="super_admin" fallback={<p>Admin only</p>}>
 *     <SystemSettings />
 *   </RequireRole>
 */

import { useAuth } from "@/contexts/auth-context"
import type { UserRole } from "@/types/auth"

interface RequireRoleProps {
  children: React.ReactNode
  /** Single role required */
  role?: UserRole
  /** Multiple roles allowed (any of these roles can access) */
  roles?: UserRole[]
  /** Fallback content if role check fails */
  fallback?: React.ReactNode
}

export function RequireRole({
  children,
  role,
  roles,
  fallback = null,
}: RequireRoleProps) {
  const { role: userRole } = useAuth()

  // No role restrictions specified, render children
  if (!role && (!roles || roles.length === 0)) {
    return <>{children}</>
  }

  // User has no role, show fallback
  if (!userRole) {
    return <>{fallback}</>
  }

  // Check single role
  if (role && userRole !== role) {
    return <>{fallback}</>
  }

  // Check multiple roles (any match)
  if (roles && roles.length > 0 && !roles.includes(userRole)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
