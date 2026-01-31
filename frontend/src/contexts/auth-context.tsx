/**
 * Authentication Context
 * ======================
 * 
 * Provides authentication state and methods throughout the app.
 * Listens to Supabase auth state changes and provides user info.
 * Includes role-based access control (RBAC) with user profiles.
 * 
 * Usage:
 *   import { useAuth } from '@/contexts/auth-context'
 *   const { user, profile, hasPermission, signOut } = useAuth()
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import type { User, Session } from "@supabase/supabase-js"
import type { UserProfile, Permission, UserRole } from "@/types/auth"
import { hasPermission as checkPermission, hasAnyPermission, hasAllPermissions } from "@/types/auth"

interface AuthContextType {
  // Core auth state
  user: User | null
  session: Session | null
  loading: boolean
  
  // RBAC state
  profile: UserProfile | null
  role: UserRole | null
  branchId: string | null
  
  // Permission checks
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean
  
  // Auth actions
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  // Track only the initial auth check to avoid flash on page navigation
  const [initialLoading, setInitialLoading] = useState(true)

  /**
   * Fetch user profile from user_profiles table
   */
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // If profile doesn't exist, create a default one
        if (error.code === 'PGRST116') {
          console.log('Profile not found, user may need to be set up by admin')
          setProfile(null)
          return
        }
        console.error('Error fetching profile:', error)
        setProfile(null)
        return
      }

      setProfile(data as UserProfile)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setProfile(null)
    }
  }, [])

  /**
   * Refresh the user profile
   */
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id)
    }
  }, [user?.id, fetchProfile])

  useEffect(() => {
    // Flag to track if this is the initial session fetch
    let isInitialCheck = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
        
        // Fetch profile if user exists
        if (session?.user?.id) {
          await fetchProfile(session.user.id)
        }
      } catch (error) {
        console.error("Error getting session:", error)
      } finally {
        if (isInitialCheck) {
          setInitialLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        // Fetch profile on auth change
        if (session?.user?.id) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        
        // Only update loading on initial check
        if (isInitialCheck) {
          setInitialLoading(false)
          isInitialCheck = false
        }
      }
    )

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signOut = async () => {
    setProfile(null)
    await supabase.auth.signOut()
  }

  // Permission check functions
  const checkUserPermission = useCallback((permission: Permission): boolean => {
    if (!profile?.role) return false
    return checkPermission(profile.role, permission)
  }, [profile?.role])

  const checkUserAnyPermission = useCallback((permissions: Permission[]): boolean => {
    if (!profile?.role) return false
    return hasAnyPermission(profile.role, permissions)
  }, [profile?.role])

  const checkUserAllPermissions = useCallback((permissions: Permission[]): boolean => {
    if (!profile?.role) return false
    return hasAllPermissions(profile.role, permissions)
  }, [profile?.role])

  const value: AuthContextType = {
    // Core auth state
    user,
    session,
    loading: initialLoading,
    
    // RBAC state
    profile,
    role: profile?.role ?? null,
    branchId: profile?.branch_id ?? null,
    
    // Permission checks
    hasPermission: checkUserPermission,
    hasAnyPermission: checkUserAnyPermission,
    hasAllPermissions: checkUserAllPermissions,
    
    // Auth actions
    signOut,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access auth context
 * Throws error if used outside of AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

/**
 * Hook to check if user has a specific permission
 * Convenience wrapper for common permission checks
 */
export function usePermission(permission: Permission): boolean {
  const { hasPermission } = useAuth()
  return hasPermission(permission)
}

/**
 * Hook to check if user has any of the specified permissions
 */
export function useAnyPermission(permissions: Permission[]): boolean {
  const { hasAnyPermission } = useAuth()
  return hasAnyPermission(permissions)
}

/**
 * Hook to check if user has all of the specified permissions
 */
export function useAllPermissions(permissions: Permission[]): boolean {
  const { hasAllPermissions } = useAuth()
  return hasAllPermissions(permissions)
}
