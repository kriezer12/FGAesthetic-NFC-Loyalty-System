/**
 * Role-Based Access Control (RBAC) Types
 * =======================================
 * 
 * Defines user roles, permissions, and access control types
 * for the FG Aesthetic NFC Loyalty System.
 * 
 * Roles:
 * - super_admin: Full system access, can manage all branches
 * - branch_admin: Full access within assigned branch
 * - staff: Limited access (aesthetician, nurse, doctor)
 */

/**
 * User roles in the system
 */
export type UserRole = 'super_admin' | 'branch_admin' | 'staff'

/**
 * Available permissions in the system
 */
export type Permission =
  // Branch Management
  | 'branches:read'
  | 'branches:create'
  | 'branches:update'
  | 'branches:delete'
  // User Management
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'users:manage_roles'
  // Customer Management
  | 'customers:read'
  | 'customers:create'
  | 'customers:update'
  | 'customers:delete'
  | 'customers:archive'
  // Check-in Operations
  | 'checkins:read'
  | 'checkins:create'
  | 'checkins:void'
  // Inventory Management
  | 'inventory:read'
  | 'inventory:create'
  | 'inventory:update'
  | 'inventory:delete'
  | 'inventory:adjust'
  // Treatments
  | 'treatments:read'
  | 'treatments:create'
  | 'treatments:update'
  | 'treatments:delete'
  // Promotions
  | 'promotions:read'
  | 'promotions:create'
  | 'promotions:update'
  | 'promotions:delete'
  // Transactions/POS
  | 'transactions:read'
  | 'transactions:create'
  | 'transactions:void'
  | 'transactions:apply_discount'
  // Reports
  | 'reports:read_own_branch'
  | 'reports:read_all_branches'
  | 'reports:export'
  // Appointments
  | 'appointments:read'
  | 'appointments:create'
  | 'appointments:update'
  | 'appointments:delete'
  // Loyalty
  | 'loyalty:read'
  | 'loyalty:configure'
  | 'loyalty:redeem'
  // Activity Logs
  | 'logs:read_own'
  | 'logs:read_branch'
  | 'logs:read_all'
  // Settings
  | 'settings:read'
  | 'settings:update'

/**
 * Permission matrix for each role
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    // Full branch access
    'branches:read', 'branches:create', 'branches:update', 'branches:delete',
    // Full user management
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:manage_roles',
    // Full customer access
    'customers:read', 'customers:create', 'customers:update', 'customers:delete', 'customers:archive',
    // Full check-in access
    'checkins:read', 'checkins:create', 'checkins:void',
    // Full inventory access
    'inventory:read', 'inventory:create', 'inventory:update', 'inventory:delete', 'inventory:adjust',
    // Full treatment access
    'treatments:read', 'treatments:create', 'treatments:update', 'treatments:delete',
    // Full promotion access
    'promotions:read', 'promotions:create', 'promotions:update', 'promotions:delete',
    // Full transaction access
    'transactions:read', 'transactions:create', 'transactions:void', 'transactions:apply_discount',
    // Full reports access
    'reports:read_own_branch', 'reports:read_all_branches', 'reports:export',
    // Full appointment access
    'appointments:read', 'appointments:create', 'appointments:update', 'appointments:delete',
    // Full loyalty access
    'loyalty:read', 'loyalty:configure', 'loyalty:redeem',
    // Full logs access
    'logs:read_own', 'logs:read_branch', 'logs:read_all',
    // Full settings access
    'settings:read', 'settings:update',
  ],
  
  branch_admin: [
    // Read-only branch access
    'branches:read',
    // User management within branch
    'users:read', 'users:create', 'users:update',
    // Full customer access
    'customers:read', 'customers:create', 'customers:update', 'customers:delete', 'customers:archive',
    // Full check-in access
    'checkins:read', 'checkins:create', 'checkins:void',
    // Full inventory access for branch
    'inventory:read', 'inventory:create', 'inventory:update', 'inventory:adjust',
    // Read treatments, can't modify catalog
    'treatments:read',
    // Read promotions, can't create system-wide
    'promotions:read',
    // Full transaction access
    'transactions:read', 'transactions:create', 'transactions:void', 'transactions:apply_discount',
    // Branch-level reports
    'reports:read_own_branch', 'reports:export',
    // Full appointment access
    'appointments:read', 'appointments:create', 'appointments:update', 'appointments:delete',
    // Loyalty operations
    'loyalty:read', 'loyalty:redeem',
    // Branch logs access
    'logs:read_own', 'logs:read_branch',
    // Read settings
    'settings:read',
  ],
  
  staff: [
    // Read-only branch access
    'branches:read',
    // Read users
    'users:read',
    // Customer operations
    'customers:read', 'customers:create', 'customers:update',
    // Check-in operations
    'checkins:read', 'checkins:create',
    // Read inventory
    'inventory:read',
    // Read treatments
    'treatments:read',
    // Read promotions
    'promotions:read',
    // Transaction operations
    'transactions:read', 'transactions:create', 'transactions:apply_discount',
    // Read own branch reports
    'reports:read_own_branch',
    // Appointment operations
    'appointments:read', 'appointments:create', 'appointments:update',
    // Loyalty operations
    'loyalty:read', 'loyalty:redeem',
    // Own logs only
    'logs:read_own',
    // Read settings
    'settings:read',
  ],
}

/**
 * User profile with role and branch association
 * This extends the Supabase auth user with app-specific data
 */
export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  branch_id: string | null  // null for super_admin (access to all branches)
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Branch information
 */
export interface Branch {
  id: string
  name: string
  address?: string
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Role display names for UI
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  branch_admin: 'Branch Admin',
  staff: 'Staff',
}

/**
 * Role descriptions for UI
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: 'Full system access. Can manage all branches, users, and settings.',
  branch_admin: 'Full access within assigned branch. Can manage staff and operations.',
  staff: 'Limited access for daily operations. Can handle customers and transactions.',
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

/**
 * Check if a role has all specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission))
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission))
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}
