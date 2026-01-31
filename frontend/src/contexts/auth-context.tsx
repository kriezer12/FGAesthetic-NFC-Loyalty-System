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

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react"
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
  profileLoading: boolean
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
  const [profileLoading, setProfileLoading] = useState(false)
  // Track only the initial auth check to avoid flash on page navigation
  const [initialLoading, setInitialLoading] = useState(true)
  // Rate limiting: track last profile fetch timestamp
  const lastProfileFetchRef = useRef<number>(0)
  const PROFILE_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  const PROFILE_RATE_LIMIT = 1000 // 1 second between fetches

  /**
   * Load profile from cache (localStorage)
   */
  const loadProfileFromCache = useCallback((userId: string): UserProfile | null => {
    try {
      const cacheKey = `user_profile_${userId}`
      const cached = localStorage.getItem(cacheKey)
      if (!cached) return null

      const { profile: cachedProfile, timestamp } = JSON.parse(cached)
      const now = Date.now()
      
      // Check if cache is still valid (5 minutes)
      if (now - timestamp < PROFILE_CACHE_DURATION) {
        return cachedProfile as UserProfile
      }
      
      // Cache expired, remove it
      localStorage.removeItem(cacheKey)
      return null
    } catch (error) {
      console.error('Error loading profile from cache:', error)
      return null
    }
  }, [])

  /**
   * Save profile to cache (localStorage)
   */
  const saveProfileToCache = useCallback((userId: string, profile: UserProfile) => {
    try {
      const cacheKey = `user_profile_${userId}`
      localStorage.setItem(cacheKey, JSON.stringify({
        profile,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('Error saving profile to cache:', error)
    }
  }, [])

  /**
   * Fetch user profile from user_profiles table with rate limiting
   */
  const fetchProfile = useCallback(async (userId: string, forceRefresh = false) => {
    // Rate limiting: prevent fetching too frequently
    const now = Date.now()
    const timeSinceLastFetch = now - lastProfileFetchRef.current
    
    if (!forceRefresh && timeSinceLastFetch < PROFILE_RATE_LIMIT) {
      console.log('Rate limit: Skipping profile fetch (too soon)')
      return
    }

    // Try loading from cache first
    if (!forceRefresh) {
      const cachedProfile = loadProfileFromCache(userId)
      if (cachedProfile) {
        console.log('Loading profile from cache')
        setProfile(cachedProfile)
        setProfileLoading(false)
        return
      }
    }

    setProfileLoading(true)
    lastProfileFetchRef.current = now

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

      const fetchedProfile = data as UserProfile
      setProfile(fetchedProfile)
      saveProfileToCache(userId, fetchedProfile)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }, [loadProfileFromCache, saveProfileToCache])

  /**
   * Refresh the user profile (force fetch from API)
   */
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id, true)
    }
  }, [user?.id, fetchProfile])

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
        
        // Fetch profile in background (don't block loading)
        if (session?.user?.id) {
          fetchProfile(session.user.id)
        }
      } catch (error) {
        console.error("Error getting session:", error)
      } finally {
        setInitialLoading(false)
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
          fetchProfile(session.user.id)
        } else {
          setProfile(null)
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
    // Clear profile cache on logout
    if (user?.id) {
      localStorage.removeItem(`user_profile_${user.id}`)
    }
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
    profileLoading,
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
