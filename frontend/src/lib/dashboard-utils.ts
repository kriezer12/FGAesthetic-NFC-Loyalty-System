type TimeFilter = "daily" | "weekly" | "yearly"
interface RawRow { visits: number; last_visit: string | null; created_at: string | null; nfc_uid: string | null }
interface ChartPoint { label: string; count: number }

export function generateTimeBuckets(filter: TimeFilter): { label: string; start: number; end: number; count: number }[] {
  const buckets: { label: string; start: number; end: number; count: number }[] = []
  const now = new Date()
  
  if (filter === "daily") {
    // 7 days ending today
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const start = d.getTime()
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime()
      buckets.push({ label: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" }), start, end, count: 0 })
    }
  } else if (filter === "weekly") {
    // 8 weeks ending today
    for (let i = 7; i >= 0; i--) {
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 7), 23, 59, 59, 999)
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6, 0, 0, 0, 0)
      buckets.push({ label: start.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), start: start.getTime(), end: end.getTime(), count: 0 })
    }
  } else if (filter === "yearly") {
    // 12 months ending this month
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      buckets.push({ label: start.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), start: start.getTime(), end: end.getTime(), count: 0 })
    }
  }
  return buckets
}

export function computeChart(rows: RawRow[], filter: TimeFilter, dateKey: "last_visit" | "created_at"): ChartPoint[] {
  const buckets = generateTimeBuckets(filter)
  
  for (const row of rows) {
    const val = row[dateKey]
    if (!val) continue
    
    // Parse the date robustly
    const time = new Date(val).getTime()
    if (isNaN(time)) continue
    
    // Find matching bucket
    for (const b of buckets) {
      if (time >= b.start && time <= b.end) {
        b.count++
        break
      }
    }
  }
  
  return buckets.map(b => ({ label: b.label, count: b.count }))
}
