export const GOLD = "var(--color-primary)"

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
