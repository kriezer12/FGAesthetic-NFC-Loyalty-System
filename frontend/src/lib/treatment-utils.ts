import type { Treatment } from "@/types/customer"

/**
 * Validate an array of treatments.  Returns a boolean along with a dict of
 * per-item error messages keyed by treatment ID.  This logic is kept out of
 * the React component so it can be unit tested independently.
 */
export function validateTreatments(treatments: Treatment[]) {
  const errors: Record<string, string> = {}
  treatments.forEach((t) => {
    if (t.remaining_sessions < 0) {
      errors[t.id] = "Remaining sessions cannot be negative"
    } else if (t.remaining_sessions > t.total_sessions) {
      errors[t.id] = "Remaining cannot exceed total sessions"
    }
  })
  return { valid: Object.keys(errors).length === 0, errors }
}
