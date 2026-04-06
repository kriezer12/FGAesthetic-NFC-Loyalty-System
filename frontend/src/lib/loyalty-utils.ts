import { supabase } from "./supabase"
import { logUserAction } from "./user-log"

export interface EarningRule {
  id: string
  treatment_id?: string
  points_earned: number
  is_active: boolean
  description?: string
  expiration_days?: number
  created_at?: string
}

/**
 * Automatically applies active loyalty earning rules for a customer check-in.
 * 
 * @param customerId - The UUID of the customer check-in
 * @param treatmentId - Optional specific treatment being performed
 * @returns Object with success status and points added
 */
export async function applyAutomatedPoints(
  customerId: string, 
  treatmentId?: string,
  branchId?: string,
  processedBy?: string
) {
  try {
    // 1. Fetch active rules
    const { data: allRules, error: rulesError } = await supabase
      .from("earning_rules")
      .select("*")
      .eq("is_active", true)

    let rules = []
    if (!rulesError && allRules) {
      // Filter out expired rules
      rules = allRules.filter(r => {
        if (!r.expiration_days || !r.created_at) return true
        const createdAt = new Date(r.created_at)
        const expiryDate = new Date(createdAt)
        expiryDate.setDate(createdAt.getDate() + r.expiration_days)
        return expiryDate.getTime() > Date.now()
      })
    }

    let selectedRule = rules?.find(r => r.treatment_id === treatmentId && treatmentId)
    
    if (!selectedRule) {
      selectedRule = rules?.find(r => !r.treatment_id)
    }

    if (!selectedRule && !treatmentId) {
      // Fallback for generic check-in if no earning rules configure it
      selectedRule = {
        id: "default-checkin",
        points_earned: 10,
        is_active: true,
        description: "Check-in",
      }
    }

    if (!selectedRule) {
      return { success: false, message: "No matching rule for this visit" }
    }

    // 3. Update customer points and visits in a single transaction-like way
    // First, get current stats to be safe (or use increment logic if Supabase supports it directly in RPC)
    const { data: customer, error: custError } = await supabase
      .from("customers")
      .select("points, visits, last_visit, first_name, last_name, name")
      .eq("id", customerId)
      .single()

    if (custError || !customer) throw new Error("Customer not found")

    // Check if the customer has already checked in today
    if (customer.last_visit) {
      const lastVisitDate = new Date(customer.last_visit)
      const today = new Date()
      // Use local timezone for exact day comparison
      if (
        lastVisitDate.getDate() === today.getDate() &&
        lastVisitDate.getMonth() === today.getMonth() &&
        lastVisitDate.getFullYear() === today.getFullYear()
      ) {
        return { success: false, message: "Customer already checked in today" }
      }
    }
    const newPoints = (customer.points || 0) + selectedRule.points_earned;
    const newVisits = (customer.visits || 0) + 1;
    const { error: updateError } = await supabase
      .from("customers")
      .update({
        points: newPoints,
        visits: newVisits,
        last_visit: new Date().toISOString()
      })
      .eq("id", customerId)

    if (updateError) throw updateError

    // 4. Log the transaction and check-in
    let expiresAt: string | null = null
    if (selectedRule.expiration_days) {
      const date = new Date()
      date.setDate(date.getDate() + selectedRule.expiration_days)
      expiresAt = date.toISOString()
    }

    await Promise.all([
      supabase.from("points_transactions").insert({
        customer_id: customerId,
        points_change: selectedRule.points_earned,
        reason: selectedRule.description || "Automated Visit Points",
        type: "earn",
        expires_at: expiresAt
      }),
      logUserAction({
        actionType: "check_in_scanned",
        entityType: "customer",
        entityId: customerId,
        entityName: customer.name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Unknown Customer",
        branchId: branchId || null,
        metadata: {
          points_added: selectedRule.points_earned,
          rule: selectedRule.description
        }
      })
    ])

    return { 
      success: true, 
      pointsAdded: selectedRule.points_earned, 
      ruleName: selectedRule.description 
    }
  } catch (err) {
    console.error("Error in applyAutomatedPoints:", err)
    return { success: false, error: err }
  }
}
