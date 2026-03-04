/**
 * Authentication Context
 * ======================
 * 
 * Provides authentication state and methods throughout the app.
 * Listens to Supabase auth state changes and provides user info.
 * 
 * Usage:
 *   import { useAuth } from '@/contexts/auth-context'
 *   const { user, loading, signOut } = useAuth()
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import type { User, Session } from "@supabase/supabase-js"

type UserRole = "super_admin" | "branch_admin" | "staff"

interface UserProfile {
  id: string
  role: UserRole
  email: string
  full_name?: string
  branch?: string
  created_at?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  userProfile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  hasRole: (roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile with role information
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (error) {
        console.error("Error fetching user profile:", error)
        console.log("Attempted to fetch with userId:", userId)
        setUserProfile(null)
      } else {
        console.log("User profile fetched:", data)
        setUserProfile(data as UserProfile)
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
      setUserProfile(null)
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user?.id) {
          await fetchUserProfile(session.user.id)
        }
      } catch (error) {
        console.error("Error getting session:", error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user?.id) {
          fetchUserProfile(session.user.id)
        } else {
          setUserProfile(null)
        }
        setLoading(false)
      }
    )

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    
    if (user?.id) {
      await fetchUserProfile(user.id)
    }
  }

  const hasRole = (roles: UserRole[]) => {
    return userProfile ? roles.includes(userProfile.role) : false
  }

  const value: AuthContextType = {
    user,
    session,
    userProfile,
    loading,
    signOut,
    refreshUser,
    hasRole,
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
