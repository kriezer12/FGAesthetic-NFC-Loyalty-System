import { Star, Zap, Trophy } from "lucide-react"
import type { Customer } from "@/types/customer"

type LoyaltyPointsDisplayProps = {
  points: number
  maxPointsForStars?: number
  showProgression?: boolean
}

/**
 * Renders loyalty points with visual stars and tier-based displays
 * - Shows filled stars for every tier (e.g., 250 points = 5 stars)
 * - Displays point count with sparkle animations
 * - More engaging than raw numbers
 */
export function LoyaltyPointsDisplay({
  points,
  maxPointsForStars = 1000,
  showProgression = false,
}: LoyaltyPointsDisplayProps) {
  // Calculate stars (1 star per 50 points, max 5 stars)
  const starsEarned = Math.min(Math.floor(points / 50), 5)
  const pointsToNextStar = points % 50 === 0 ? 50 : 50 - (points % 50)
  const previousStarThreshold = starsEarned * 50

  // Determine tier level
  const getTierInfo = () => {
    if (points < 250) return { name: "Bronze", color: "from-amber-600 to-amber-500", icon: null }
    if (points < 500) return { name: "Silver", color: "from-slate-400 to-slate-300", icon: null }
    if (points < 1000) return { name: "Gold", color: "from-yellow-400 to-yellow-300", icon: null }
    return { name: "Platinum", color: "from-purple-400 to-pink-400", icon: <Zap className="w-4 h-4" /> }
  }

  const tier = getTierInfo()

  return (
    <div className="space-y-4">
      {/* Star Rating Display */}
      <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
        {/* Stars */}
        <div className="flex gap-1 justify-center">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`transform transition-all duration-300 ${
                i < starsEarned
                  ? "scale-100 animate-pulse"
                  : "scale-90 opacity-30"
              }`}
            >
              <Star
                className={`w-6 h-6 ${
                  i < starsEarned
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Points Display */}
        <div className="text-center">
          <p className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {points.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground font-medium tracking-wide">LOYALTY POINTS</p>
        </div>

        {/* Tier Badge */}
        <div
          className={`px-3 py-1 rounded-full bg-gradient-to-r ${tier.color} text-white text-xs font-semibold flex items-center gap-1 shadow-sm`}
        >
          {tier.icon && tier.icon}
          {tier.name}
        </div>

        {/* Next Star Progress */}
        <div className="w-full max-w-xs space-y-1.5">
          <div className="flex justify-between items-center gap-2">
            <span className="text-xs text-muted-foreground">Progress to next star</span>
            <span className="text-xs font-medium text-primary">{50 - pointsToNextStar}/50</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden border border-primary/10">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
              style={{ width: `${((50 - pointsToNextStar) / 50) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tier Progression Info */}
      {showProgression && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tier Progress</p>
          <div className="space-y-1.5">
            {[
              { threshold: 250, label: "Silver", reached: points >= 250 },
              { threshold: 500, label: "Gold", reached: points >= 500 },
              { threshold: 1000, label: "Platinum", reached: points >= 1000 },
            ].map((tier, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 text-xs p-2 rounded bg-muted/50">
                <span className={tier.reached ? "font-semibold text-primary" : "text-muted-foreground"}>
                  {tier.label}
                </span>
                <span className="text-muted-foreground">{tier.threshold} pts</span>
                {tier.reached && <Trophy className="w-3 h-3 text-primary" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
