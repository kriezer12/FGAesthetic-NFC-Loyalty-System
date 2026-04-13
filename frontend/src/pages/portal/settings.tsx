/**
 * Customer Portal Settings
 * ========================
 *
 * Settings page for customers to manage their account information
 * and change their password.
 */

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { CustomerPasswordManager } from "@/components/auth/customer-password-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function PortalSettings() {
  const { user, userProfile } = useAuth()
  const [customerData, setCustomerData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = "Portal - FG Aesthetic Centre"
  }, [])

  useEffect(() => {
    async function loadCustomerData() {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .eq("user_id", user.id)
          .single()

        if (!error && data) {
          setCustomerData(data)
        }
      } catch (err) {
        console.error("Failed to load customer data", err)
      } finally {
        setLoading(false)
      }
    }

    loadCustomerData()
  }, [user])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted rounded-md animate-pulse" />
        <div className="h-32 bg-muted rounded-md animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account preferences and security</p>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your personal details and contact information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-base font-medium">{customerData?.name || userProfile?.full_name || "Not provided"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-base font-medium">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Phone</label>
              <p className="text-base font-medium">{customerData?.phone || "Not provided"}</p>
            </div>
            {customerData?.branch_id && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Branch</label>
                <p className="text-base font-medium">{customerData?.branch_name || "Main Branch"}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Password Management */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-6">Security</h2>
        <CustomerPasswordManager isInitialSetup={false} />
      </div>

      {/* Session Information */}
      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Your current login session information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Last Login</label>
            <p className="text-base font-medium">
              {new Date((user as any)?.last_sign_in_at).toLocaleString() || "Unknown"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Account Created</label>
            <p className="text-base font-medium">
              {customerData?.created_at ? new Date(customerData.created_at).toLocaleDateString() : "Unknown"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
