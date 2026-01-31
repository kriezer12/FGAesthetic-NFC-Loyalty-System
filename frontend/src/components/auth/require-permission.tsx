/**
 * RequirePermission Component
 * ===========================
 * 
 * Conditional rendering component that shows children only if user has required permissions.
 * Useful for hiding UI elements (buttons, menu items, sections) based on user permissions.
 * 
 * Usage:
 *   // Single permission
 *   <RequirePermission permission="customers:create">
 *     <Button>Add Customer</Button>
 *   </RequirePermission>
 * 
 *   // Multiple permissions (all required)
 *   <RequirePermission permissions={['inventory:read', 'inventory:update']}>
 *     <InventoryEditor />
 *   </RequirePermission>
 * 
 *   // Any permission sufficient
 *   <RequirePermission anyOf={['reports:read', 'reports:export']}>
 *     <ReportsSection />
 *   </RequirePermission>
 * 
 *   // With fallback
 *   <RequirePermission permission="settings:update" fallback={<ReadOnlySettings />}>
 *     <EditableSettings />
 *   </RequirePermission>
 */

import { useAuth } from "@/contexts/auth-context"
import type { Permission } from "@/types/auth"

interface RequirePermissionProps {
  children: React.ReactNode
  /** Single permission required */
  permission?: Permission
  /** Multiple permissions required (all must be present) */
  permissions?: Permission[]
  /** Multiple permissions where any one is sufficient */
  anyOf?: Permission[]
  /** Fallback content if permission check fails */
  fallback?: React.ReactNode
}

export function RequirePermission({
  children,
  permission,
  permissions,
  anyOf,
  fallback = null,
}: RequirePermissionProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = useAuth()

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>
  }

  // Check all permissions
  if (permissions && permissions.length > 0 && !hasAllPermissions(permissions)) {
    return <>{fallback}</>
  }

  // Check any permission
  if (anyOf && anyOf.length > 0 && !hasAnyPermission(anyOf)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
