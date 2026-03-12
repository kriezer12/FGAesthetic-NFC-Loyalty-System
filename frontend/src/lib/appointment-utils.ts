import type { ComboboxOption } from "@/components/ui/combobox"

/**
 * Given a list of combobox options and a selected value, return the label
 * (human‑friendly string) or undefined.
 *
 * This mirrors the logic that lives inside `AppointmentDialog` when saving
 * appointments, but factoring it out makes it easy to unit test.
 */
export function deriveLabelFromOptions(
  options: ComboboxOption[],
  value?: string,
): string | undefined {
  if (!value) return undefined
  const found = options.find((o) => o.value === value)
  return found?.label
}
