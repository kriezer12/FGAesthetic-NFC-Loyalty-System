/**
 * Auth Components Barrel Export
 * =============================
 * 
 * Export all auth-related components from a single entry point.
 */

// Route protection components
export { ProtectedRoute } from "./protected-route"
export { PublicRoute } from "./public-route"

// Auth form components
export { LoginForm } from "./login-form"
export { SignupForm } from "./signup-form"

// RBAC UI components
export { RequirePermission } from "./require-permission"
export { RequireRole } from "./require-role"
export { RoleGate, useRoleValue } from "./role-gate"
