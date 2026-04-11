import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { LoadingScreen } from "./loading-screen"

interface RoleRouteProps {
  children: React.ReactNode
  allowedRoles: ("super_admin" | "branch_admin" | "staff" | "customer")[]
  redirectPath: string
}

export function RoleRoute({ children, allowedRoles, redirectPath }: RoleRouteProps) {
  const { user, userProfile, loading } = useAuth()
  const location = useLocation()

  if (loading || (user && !userProfile)) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (userProfile && !allowedRoles.includes(userProfile.role)) {
    // Determine default fallback
    const defaultPath = userProfile.role === "customer" ? "/portal/dashboard" : "/dashboard"
    return <Navigate to={defaultPath} replace />
  }

  return <>{children}</>
}
