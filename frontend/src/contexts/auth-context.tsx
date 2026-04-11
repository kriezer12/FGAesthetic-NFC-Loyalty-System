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

type UserRole = "super_admin" | "branch_admin" | "staff" | "customer"

interface UserProfile {
  id: string
  role: UserRole
  email: string
  full_name?: string
  branch_id?: string
  branch_name?: string
  avatar_url?: string
  created_at?: string
  first_login?: boolean
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

  // Fetch user profile with role information and branch details
  const fetchUserProfile = async (userId: string) => {
    try {
      // First try to find a staff profile
      let { data, error } = await supabase
        .from("user_profiles")
        .select("id, role, email, full_name, branch_id, avatar_url, branches(name)")
        .eq("id", userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Not a staff member, check if it's a customer
        const { data: customerData, error: customerError } = await supabase
          .from("customers")
          .select("id, email, name, branch_id")
          .eq("user_id", userId)
          .single()
        
        if (customerData) {
          data = {
            id: userId,
            role: "customer" as UserRole,
            email: customerData.email,
            full_name: customerData.name,
            branch_id: customerData.branch_id,
            avatar_url: null,
            customer_id: customerData.id // Extra field for convenience
          }
          error = null
        }
      }

      if (error) {
        console.error("Error fetching user profile:", error)
        setUserProfile(null)
      } else {
        // if branch relation included, normalize to branch_name field
        if (data && (data as any).branches) {
          const rel = (data as any).branches
          // supabase may return array or object
          if (Array.isArray(rel) && rel.length > 0) {
            ;(data as any).branch_name = rel[0].name
          } else if (rel && typeof rel === "object" && "name" in rel) {
            ;(data as any).branch_name = rel.name
          }
          delete (data as any).branches
        }
        // Fallback to auth metadata avatar_url if not in profile
        if (data && !data.avatar_url) {
          const authAvatarUrl = (user?.user_metadata?.avatar_url as string) || null
          if (authAvatarUrl) {
            data.avatar_url = authAvatarUrl
          }
        }
        // fallback to branch_id if no name provided
        if (data && !(data as any).branch_name && (data as any).branch_id) {
          (data as any).branch_name = `(branch ${ (data as any).branch_id })`
        }
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
          fetchUserProfile(session.user.id)
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
          // Don't await - fetch in background
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
