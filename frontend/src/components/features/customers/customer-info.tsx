import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase"
import { CheckinHistory } from "./checkin-history"
import { CustomerAllergiesAlert } from "./customer-info-parts/customer-allergies-alert"
import { CustomerContactDetails } from "./customer-info-parts/customer-contact-details"
import { CustomerInfoHeader } from "./customer-info-parts/customer-info-header"
import { CustomerPointsActions } from "./customer-info-parts/customer-points-actions"
import { CustomerStatsGrid } from "./customer-info-parts/customer-stats-grid"

import type { Customer } from "@/types/customer"

interface CustomerInfoProps {
  customer: Customer
  onClose: () => void
  onUpdate: (customer: Customer) => void
}

export function CustomerInfo({ customer, onClose, onUpdate }: CustomerInfoProps) {
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [showHistory, setShowHistory] = React.useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = React.useState(0)

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const addPoints = async (amount: number) => {
    setIsUpdating(true)
    try {
      const newPoints = Math.max(0, customer.points + amount)
      const newVisits = amount > 0 ? customer.visits + 1 : customer.visits
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
        // Log the check-in
        await supabase
          .from("checkin_logs")
          .insert({
            customer_id: customer.id,
            checked_in_at: new Date().toISOString(),
            points_added: amount,
          })
        
        // Refresh the history
        setHistoryRefreshKey((k) => k + 1)
        
        onUpdate(data)
      }
    } catch (err) {
      console.error("Error updating points:", err)
    } finally {
      setIsUpdating(false)
    }
  }

  const displayName = customer.name || `${customer.first_name || ''} ${customer.middle_name || ''} ${customer.last_name || ''}`.trim()

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

        <Separator />

        <CustomerPointsActions
          isUpdating={isUpdating}
          currentPoints={customer.points || 0}
          showHistory={showHistory}
          onRedeem={() => addPoints(-10)}
          onAdd={() => addPoints(10)}
          onToggleHistory={() => setShowHistory(!showHistory)}
        />

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
          <CheckinHistory customerId={customer.id} refreshKey={historyRefreshKey} />
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
