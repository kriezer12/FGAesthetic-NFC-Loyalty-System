/**
 * RoleGate Component
 * ==================
 * 
 * Conditional rendering component that renders different content based on user role.
 * More powerful than RequireRole - allows specifying different content for different roles.
 * 
 * Usage:
 *   <RoleGate
 *     superAdmin={<SuperAdminDashboard />}
 *     branchAdmin={<BranchAdminDashboard />}
 *     staff={<StaffDashboard />}
 *     fallback={<p>Please log in</p>}
 *   />
 */

import { useAuth } from "@/contexts/auth-context"

interface RoleGateProps {
  /** Content for super admin users */
  superAdmin?: React.ReactNode
  /** Content for branch admin users */
  branchAdmin?: React.ReactNode
  /** Content for staff users */
  staff?: React.ReactNode
  /** Fallback content if no role matches or user has no role */
  fallback?: React.ReactNode
}

export function RoleGate({
  superAdmin,
  branchAdmin,
  staff,
  fallback = null,
}: RoleGateProps) {
  const { role } = useAuth()

  switch (role) {
    case 'super_admin':
      return <>{superAdmin ?? fallback}</>
    case 'branch_admin':
      return <>{branchAdmin ?? fallback}</>
    case 'staff':
      return <>{staff ?? fallback}</>
    default:
      return <>{fallback}</>
  }
}

/**
 * Hook to get role-specific value
 * Useful when you need to compute different values based on role
 * 
 * Usage:
 *   const maxItems = useRoleValue({ superAdmin: 100, branchAdmin: 50, staff: 10 })
 */
export function useRoleValue<T>({
  superAdmin,
  branchAdmin,
  staff,
  fallback,
}: {
  superAdmin?: T
  branchAdmin?: T
  staff?: T
  fallback: T
}): T {
  const { role } = useAuth()

  switch (role) {
    case 'super_admin':
      return superAdmin ?? fallback
    case 'branch_admin':
      return branchAdmin ?? fallback
    case 'staff':
      return staff ?? fallback
    default:
      return fallback
  }
}
