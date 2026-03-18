import { supabase } from "@/lib/supabase"
import type { Appointment } from "@/types/appointment"

/**
 * Automatically deducts inventory products when an appointment is completed.
 * Logic:
 * 1. Find all services in the appointment.
 * 2. Identify which services are linked to inventory products.
 * 3. Deduct 1 unit from the specific branch's stock for each product.
 * 4. Record a record in inventory_transactions.
 */
export async function deductInventoryForAppointment(appt: Appointment) {
  if (appt.status !== 'completed' || !appt.service_ids || appt.service_ids.length === 0) return

  try {
    // 1. Check if deduction already performed for this appointment
    const { data: existing } = await supabase
      .from('inventory_transactions')
      .select('id')
      .eq('reason', `Appointment Completion: ${appt.id}`)
      .maybeSingle()
    
    if (existing) {
      console.log(`Inventory already deducted for appointment ${appt.id}`)
      return
    }

    // 2. Fetch services to find linked products
    const { data: services, error: svcError } = await supabase
      .from('services')
      .select('id, name, inventory_product_id')
      .in('id', appt.service_ids)
    
    if (svcError) throw svcError
    if (!services) return

    const servicesWithProducts = services.filter(s => s.inventory_product_id)
    if (servicesWithProducts.length === 0) return

    // 3. Get branch ID from staff profile
    const { data: staff, error: staffError } = await supabase
      .from('user_profiles')
      .select('branch_id')
      .eq('id', appt.staff_id)
      .single()
    
    if (staffError) throw staffError
    const branchId = staff?.branch_id
    if (!branchId) {
      console.warn(`Cannot deduct inventory: Staff ${appt.staff_id} has no assigned branch.`)
      return
    }

    // 4. Perform deductions and log transactions
    for (const svc of servicesWithProducts) {
      const productId = svc.inventory_product_id!

      // Create transaction
      const { error: transError } = await supabase
        .from('inventory_transactions')
        .insert({
          product_id: productId,
          branch_id: branchId,
          type: 'out',
          quantity: -1,
          reason: `Appointment Completion: ${appt.id}`,
          performed_by: appt.staff_id // or auth.uid()
        })

      if (transError) {
        console.error(`Failed to record transaction for product ${productId}:`, transError)
        continue
      }

      // Deduct stock
      // We use a simple update here, ideally this would be a database function 
      // to handle atomicity/concurrency better, but for this level of traffic 
      // simple increment/decrement is usually fine.
      
      const { data: currentStock } = await supabase
        .from('inventory_stocks')
        .select('quantity')
        .eq('product_id', productId)
        .eq('branch_id', branchId)
        .single()
      
      if (currentStock) {
        await supabase
          .from('inventory_stocks')
          .update({ quantity: currentStock.quantity - 1 })
          .eq('product_id', productId)
          .eq('branch_id', branchId)
      } else {
        // Should have been initialized by trigger, but create if missing
        await supabase
          .from('inventory_stocks')
          .insert({
            product_id: productId,
            branch_id: branchId,
            quantity: -1
          })
      }
    }

    console.log(`Successfully deducted inventory for appointment ${appt.id}`)

  } catch (err) {
    console.error("Error in deductInventoryForAppointment:", err)
  }
}
