import * as React from "react"
import { User, Phone, Mail, Award, Calendar, CreditCard, Plus, Minus, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase"

import type { Customer } from "@/types/customer"

interface CustomerInfoProps {
  customer: Customer
  onClose: () => void
  onUpdate: (customer: Customer) => void
}

export function CustomerInfo({ customer, onClose, onUpdate }: CustomerInfoProps) {
  const [isUpdating, setIsUpdating] = React.useState(false)

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
        onUpdate(data)
      }
    } catch (err) {
      console.error("Error updating points:", err)
    } finally {
      setIsUpdating(false)
    }
  }

  const displayName = customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim()

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <User className="h-10 w-10 text-green-600" />
        </div>
        <CardTitle className="text-2xl">{displayName}</CardTitle>
        <CardDescription className="flex items-center justify-center gap-2">
          <CreditCard className="h-4 w-4" />
          {customer.nfc_uid}
        </CardDescription>
        {customer.skin_type && (
          <p className="text-xs text-muted-foreground capitalize mt-1">
            {customer.skin_type} skin {customer.gender && `• ${customer.gender}`}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Allergies Warning */}
        {customer.allergies && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Allergies</p>
              <p className="text-sm text-red-600">{customer.allergies}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="rounded-lg bg-primary/10 p-4">
            <Award className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-primary">{customer.points || 0}</p>
            <p className="text-xs text-muted-foreground">Points</p>
          </div>
          <div className="rounded-lg bg-secondary p-4">
            <Calendar className="h-6 w-6 text-secondary-foreground mx-auto mb-2" />
            <p className="text-3xl font-bold">{customer.visits || 0}</p>
            <p className="text-xs text-muted-foreground">Visits</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          {customer.phone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{customer.phone}</span>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{customer.email}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Member since {formatDate(customer.created_at)}</span>
          </div>
        </div>

        <Separator />

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => addPoints(-10)}
            disabled={isUpdating || (customer.points || 0) < 10}
          >
            <Minus className="h-4 w-4 mr-2" />
            Redeem 10
          </Button>
          <Button 
            className="flex-1"
            onClick={() => addPoints(10)}
            disabled={isUpdating}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add 10
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="ghost" className="w-full" onClick={onClose}>
          Scan Another Card
        </Button>
      </CardFooter>
    </Card>
  )
}
