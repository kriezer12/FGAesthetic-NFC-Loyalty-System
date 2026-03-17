import { supabase } from "./supabase"

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
export async function applyAutomatedPoints(customerId: string, treatmentId?: string) {
  try {
    // 1. Fetch active rules
    const { data: allRules, error: rulesError } = await supabase
      .from("earning_rules")
      .select("*")
      .eq("is_active", true)

    if (rulesError || !allRules || allRules.length === 0) {
      return { success: false, message: "No active earning rules found" }
    }

    // Filter out expired rules
    const rules = allRules.filter(r => {
      if (!r.expiration_days || !r.created_at) return true
      const createdAt = new Date(r.created_at)
      const expiryDate = new Date(createdAt)
      expiryDate.setDate(createdAt.getDate() + r.expiration_days)
      return expiryDate.getTime() > Date.now()
    })

    if (rules.length === 0) {
      return { success: false, message: "All matching rules have expired" }
    }

    // 2. Find the best matching rule
    // Priority: 
    //   a) Rule matching specific treatmentId
    //   b) "Standard Visit" rule (no treatmentId)
    let selectedRule = rules.find(r => r.treatment_id === treatmentId && treatmentId)
    
    if (!selectedRule) {
      selectedRule = rules.find(r => !r.treatment_id)
    }

    if (!selectedRule) {
      return { success: false, message: "No matching rule for this visit" }
    }

    // 3. Update customer points and visits in a single transaction-like way
    // First, get current stats to be safe (or use increment logic if Supabase supports it directly in RPC)
    const { data: customer, error: custError } = await supabase
      .from("customers")
      .select("points, visits")
      .eq("id", customerId)
      .single()

    if (custError || !customer) throw new Error("Customer not found")

    const newPoints = (customer.points || 0) + selectedRule.points_earned
    const newVisits = (customer.visits || 0) + 1

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
    await Promise.all([
      supabase.from("points_transactions").insert({
        customer_id: customerId,
        points_change: selectedRule.points_earned,
        reason: selectedRule.description || "Automated Visit Points",
        type: "earn"
      }),
      supabase.from("checkin_logs").insert({
        customer_id: customerId,
        checked_in_at: new Date().toISOString(),
        points_added: selectedRule.points_earned
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
