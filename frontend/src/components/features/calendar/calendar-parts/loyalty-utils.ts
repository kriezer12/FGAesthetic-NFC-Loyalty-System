import { supabase } from "@/lib/supabase"
import type { Appointment } from "@/types/appointment"

/**
 * Automates loyalty points awarding when an appointment is completed.
 * Logic uses earning rules linked to treatment IDs.
 */
export async function awardPointsForAppointment(appt: Appointment) {
  if (appt.status !== 'completed' || !appt.customer_id) return

  try {
    // 1. Check if already awarded for this appointment to avoid duplicates
    const { data: existing } = await supabase
      .from('points_transactions')
      .select('id')
      .eq('appointment_id', appt.id)
      .maybeSingle()
    
    if (existing) {
      console.log(`Points already awarded for appointment ${appt.id}`)
      return
    }

    // 2. Fetch config data
    const serviceIds = appt.service_ids || []
    if (serviceIds.length === 0) return

    // Get earning rules and services points in parallel
    const [rulesRes, servicesRes] = await Promise.all([
      supabase.from('earning_rules').select('*').eq('is_active', true),
      supabase.from('services').select('id, name').in('id', serviceIds)
    ])

    const allRules = rulesRes.data || []
    const services = servicesRes.data || []

    // Filter out expired rules
    const rules = allRules.filter(r => {
      if (!r.expiration_days || !r.created_at) return true
      const createdAt = new Date(r.created_at)
      const expiryDate = new Date(createdAt)
      expiryDate.setDate(createdAt.getDate() + r.expiration_days)
      return expiryDate.getTime() > Date.now()
    })

    let totalPoints = 0
    const reasons: string[] = []

    for (const svcId of serviceIds) {
      const svc = services.find(s => s.id === svcId)
      // Rule takes priority
      const rule = rules.find(r => r.treatment_id === svcId)
      
      if (rule) {
        totalPoints += rule.points_earned
        reasons.push(rule.description || svc?.name || 'Treatment')
      }
    }

    if (totalPoints > 0) {
      // 3. Update customer points
      // Getting fresh balance to avoid stale updates
      const { data: customer } = await supabase
        .from('customers')
        .select('points')
        .eq('id', appt.customer_id)
        .single()
      
      const newPoints = (customer?.points || 0) + totalPoints

      await supabase
        .from('customers')
        .update({ points: newPoints })
        .eq('id', appt.customer_id)
      
      // 4. Record the transaction
      let maxExpirationDays = 0
      for (const svcId of serviceIds) {
        const rule = rules.find(r => r.treatment_id === svcId)
        if (rule?.expiration_days && rule.expiration_days > maxExpirationDays) {
          maxExpirationDays = rule.expiration_days
        }
      }

      let expiresAt: string | null = null
      if (maxExpirationDays > 0) {
        const date = new Date()
        date.setDate(date.getDate() + maxExpirationDays)
        expiresAt = date.toISOString()
      }

      await supabase
        .from('points_transactions')
        .insert({
          customer_id: appt.customer_id,
          appointment_id: appt.id,
          points_change: totalPoints,
          reason: `Completed Appointment: ${reasons.join(', ')}`,
          type: 'earn',
          expires_at: expiresAt
        })
      
      console.log(`Awarded ${totalPoints} points to customer ${appt.customer_id} for appointment ${appt.id}`)
    }
  } catch (err) {
    console.error("Error in awardPointsForAppointment:", err)
  }
}
