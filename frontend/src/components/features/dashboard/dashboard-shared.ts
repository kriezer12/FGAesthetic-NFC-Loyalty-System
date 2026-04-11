// Semantic chart colors using CSS variables (resolved at runtime)
export const ROSE   = "var(--color-chart-1)"
export const VIOLET = "var(--color-chart-2)"
export const SKY    = "var(--color-chart-3)"
export const AMBER  = "var(--color-chart-4)"
export const EMERALD = "var(--color-chart-5)"

/** @deprecated use ROSE */
export const GOLD = ROSE

export type TimeFilter = "daily" | "weekly" | "yearly"

export const FILTER_SUBTITLES: Record<"activity" | "registrations", Record<TimeFilter, string>> = {
  activity: {
    daily: "Check-ins over the last 7 days",
    weekly: "Check-ins over the last 8 weeks",
    yearly: "Check-ins over the last 12 months",
  },
  registrations: {
    daily: "New customers in the last 7 days",
    weekly: "New customers over the last 8 weeks",
    yearly: "New customers over the last 12 months",
  },
}

export const FILTERS: { label: string; value: TimeFilter }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Yearly", value: "yearly" },
]
