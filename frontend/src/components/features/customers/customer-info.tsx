import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { CheckinHistory } from "./checkin-history"
import { PointsHistory } from "./customer-info-parts/points-history"
import { TreatmentStatusManager } from "./treatment-status-manager"
import { TreatmentHistory } from "./treatment-history"
import { CustomerAllergiesAlert } from "./customer-info-parts/customer-allergies-alert"
import { CustomerContactDetails } from "./customer-info-parts/customer-contact-details"
import { CustomerInfoHeader } from "./customer-info-parts/customer-info-header"
import { CustomerPointsDashboard } from "./customer-info-parts/customer-points-dashboard"
import { CustomerStatsGrid } from "./customer-info-parts/customer-stats-grid"
import { NFCScanner } from "../nfc/nfc-scanner"
import type { LoyaltyReward } from "@/pages/loyalty-admin"

import type { Customer, Treatment } from "@/types/customer"

interface CustomerInfoProps {
  customer: Customer
  onClose: () => void
  onUpdate: (customer: Customer) => void
}

export function CustomerInfo({ customer, onClose, onUpdate }: CustomerInfoProps) {
  const { user, userProfile } = useAuth()
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [showHistory, setShowHistory] = React.useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = React.useState(0)
  const [isScanning, setIsScanning] = React.useState(false)

  // treatment UI state
  const [showTreatmentHistory, setShowTreatmentHistory] = React.useState(false)
  const [treatmentHistoryKey, setTreatmentHistoryKey] = React.useState(0)

  // helper to persist treatment changes
  const updateTreatments = async (newTreatments: Treatment[]) => {
    setIsUpdating(true)
    try {
      const { data, error } = await supabase
        .from("customers")
        .update({ treatments: newTreatments })
        .eq("id", customer.id)
        .select()
        .single()

      if (!error && data) {
        onUpdate(data)
        setTreatmentHistoryKey((k) => k + 1)
      }
    } catch (err) {
      console.error("Error updating treatments:", err)
    } finally {
      setIsUpdating(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const earnPoints = async (rule: { description?: string; points_earned: number }) => {
    setIsUpdating(true)
    try {
      const newPoints = (customer.points || 0) + rule.points_earned
      const newVisits = customer.visits + 1
      const { data, error } = await supabase
        .from("customers")
        .update({ 
          points: newPoints,
          visits: newVisits,
          last_visit: new Date().toISOString()
        })
        .eq("id", customer.id)
        .select()
        .single()
      
      if (!error && data) {
        let expiresAt: string | null = null
        if ('expiration_days' in rule && rule.expiration_days) {
          const date = new Date()
          date.setDate(date.getDate() + (rule.expiration_days as number))
          expiresAt = date.toISOString()
        }

        await supabase
          .from("points_transactions")
          .insert({
            customer_id: customer.id,
            points_change: rule.points_earned,
            reason: rule.description || "Earned Points",
            type: "earn",
            expires_at: expiresAt
          })
        
        await supabase
          .from("checkin_logs")
          .insert({
            customer_id: customer.id,
            checked_in_at: new Date().toISOString(),
            points_added: rule.points_earned,
            processed_by: user?.id || null,
            branch_id: userProfile?.branch_id || null,
          })
        
        setHistoryRefreshKey((k) => k + 1)
        onUpdate(data)
      }
    } catch (err) {
      console.error("Error earning points:", err)
    } finally {
      setIsUpdating(false)
    }
  }

  const redeemReward = async (reward: LoyaltyReward) => {
    if (customer.points < reward.points_required) return
    setIsUpdating(true)
    try {
      const newPoints = customer.points - reward.points_required
      const { data, error } = await supabase
        .from("customers")
        .update({ points: newPoints })
        .eq("id", customer.id)
        .select()
        .single()
      
      if (!error && data) {
        // Log the point transaction
        await supabase
          .from("points_transactions")
          .insert({
            customer_id: customer.id,
            points_change: -reward.points_required,
            reason: reward.reward_name,
            type: "redeem"
          })
        
        setHistoryRefreshKey((k) => k + 1)
        onUpdate(data)
      }
    } catch (err) {
      console.error("Error redeeming reward:", err)
    } finally {
      setIsUpdating(false)
    }
  }

  const linkCard = async (uid: string) => {
    setIsUpdating(true)
    try {
      const { data, error } = await supabase
        .from("customers")
        .update({ nfc_uid: uid })
        .eq("id", customer.id)
        .select()
        .single()
        
      if (error) throw error
      if (data) {
        onUpdate(data)
        setIsScanning(false)
      }
    } catch (err: any) {
      console.error("Error linking card:", err)
      alert(`Failed to link card: ${err.message}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const displayName = customer.name || `${customer.first_name || ''} ${customer.middle_name || ''} ${customer.last_name || ''}`.trim()

  if (isScanning) {
    return (
      <Card className="w-full max-w-md mx-auto overflow-hidden">
        <CardHeader className="bg-primary/5 pb-6">
          <h2 className="text-xl font-bold text-center">Link NFC Card</h2>
          <p className="text-sm text-muted-foreground text-center">Scan an unassigned card to link it to {customer.first_name}</p>
        </CardHeader>
        <CardContent className="pt-8">
          <NFCScanner
            onCustomerFound={(c) => {
              alert(`This card is already assigned to ${c.name || 'another customer'}. Please use a new card.`)
            }}
            onNewCard={linkCard}
            mode="register"
          />
        </CardContent>
        <CardFooter className="bg-background pt-2">
          <Button variant="ghost" className="w-full" onClick={() => setIsScanning(false)}>
            Cancel Scanning
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center pb-2">
        <CustomerInfoHeader customer={customer} displayName={displayName} />
      </CardHeader>
      <CardContent className="space-y-4">
        <CustomerAllergiesAlert allergies={customer.allergies} />
        <CustomerStatsGrid customer={customer} />

        <Separator />

        <CustomerContactDetails customer={customer} formatDate={formatDate} />

        {!customer.nfc_uid && (
          <div className="mt-2 text-center p-3 rounded-xl bg-primary/5 border border-primary/10 border-dashed">
            <p className="text-xs text-muted-foreground mb-3 font-medium">No physical NFC card is linked to this profile.</p>
            <Button 
              size="sm" 
              className="w-full shadow-sm"
              onClick={() => setIsScanning(true)}
            >
              Link NFC Card Now
            </Button>
          </div>
        )}

        <Separator />

        <CustomerPointsDashboard
          customerId={customer.id}
          isUpdating={isUpdating}
          currentPoints={customer.points || 0}
          showHistory={showHistory}
          onRedeemReward={redeemReward}
          onEarnPoints={earnPoints}
          onToggleHistory={() => setShowHistory(!showHistory)}
        />

        {/* treatment progress editor */}
        <Separator />
        <TreatmentStatusManager
          treatments={customer.treatments || []}
          isUpdating={isUpdating}
          onSave={updateTreatments}
        />
        <div className="mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTreatmentHistory(!showTreatmentHistory)}
          >
            {showTreatmentHistory ? "Hide" : "Show"} treatment history
          </Button>
        </div>
        {showTreatmentHistory && (
          <TreatmentHistory
            customerId={customer.id}
            refreshKey={treatmentHistoryKey}
          />
        )}

        {/* archive/unarchive action */}
        <div className="mt-4">
          <Button
            variant={customer.archived_at ? "outline" : "destructive"}
            className="w-full"
            disabled={isUpdating}
            onClick={async () => {
              if (!customer.archived_at) {
                const ok = window.confirm("Archive this client? This is reversible.")
                if (!ok) return
              }
              setIsUpdating(true)
              try {
                const { data, error } = await supabase
                  .from("customers")
                  .update({ archived_at: customer.archived_at ? null : new Date().toISOString() })
                  .eq("id", customer.id)
                  .select()
                  .single()

                if (!error && data) {
                  onUpdate(data)
                }
              } catch (err) {
                console.error("Error toggling archive status:", err)
              } finally {
                setIsUpdating(false)
              }
            }}
          >
            {customer.archived_at ? "Unarchive client" : "Archive client"}
          </Button>
        </div>

        {showHistory && (
          <div className="flex flex-col gap-4">
            <PointsHistory customerId={customer.id} refreshKey={historyRefreshKey} />
            <div className="text-xs text-center text-muted-foreground w-full py-2 bg-muted/30 rounded-md">
              Check-in logs are still recorded, but points are now tracked here.
            </div>
            {/* Keeping check-in history for backward compatibility or dual-view if needed */}
            <div className="mt-4 border-t pt-2">
              <h4 className="text-sm font-semibold mb-2">Recent Check-ins</h4>
              <CheckinHistory customerId={customer.id} refreshKey={historyRefreshKey} />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="ghost" className="w-full" onClick={onClose}>
          Scan Another Card
        </Button>
      </CardFooter>
    </Card>
  )
}
