import { useEffect, useState } from "react"
import { History, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import type { LoyaltyReward, EarningRule } from "@/pages/loyalty-admin"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"


type CustomerPointsDashboardProps = {
  customerId: string
  isUpdating: boolean
  currentPoints: number
  showHistory: boolean
  onRedeemReward: (reward: LoyaltyReward) => void
  onEarnPoints: (rule: { id: string; description?: string; points_earned: number }) => void
  onToggleHistory: () => void
}

export function CustomerPointsDashboard({
  isUpdating,
  currentPoints,
  showHistory,
  onRedeemReward,
  onEarnPoints,
  onToggleHistory,
}: CustomerPointsDashboardProps) {
  const { hasRole } = useAuth()
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  const [rules, setRules] = useState<EarningRule[]>([])
  const [confirmationReward, setConfirmationReward] = useState<LoyaltyReward | null>(null)
  
  const canEarnPoints = hasRole(["branch_admin", "super_admin"])
  
  useEffect(() => {
    async function loadConfig() {
      const [rewRes, ruleRes] = await Promise.all([
        supabase.from("loyalty_rewards").select("*").eq("is_active", true).order("points_required", { ascending: true }),
        supabase.from("earning_rules").select("*").eq("is_active", true).order("points_earned", { ascending: true })
      ])
      if (rewRes.data) setRewards(rewRes.data)
      if (ruleRes.data) setRules(ruleRes.data)
    }
    loadConfig()
  }, [])

  // filter rewards customer can afford
  const accessibleRewards = rewards.filter((r) => r.points_required <= currentPoints)
  const nextReward = rewards.find((r) => r.points_required > currentPoints)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Gift className="h-4 w-4" /> Rewards & Points
        </h3>
        {canEarnPoints && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={isUpdating}>
                Earn Points
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-[300px] overflow-y-auto">
            {rules.length > 0 && (
              <>
                <DropdownMenuLabel>Common Rules</DropdownMenuLabel>
                {rules.map(rule => (
                  <DropdownMenuItem key={rule.id} onClick={() => onEarnPoints(rule)}>
                    <div className="flex flex-col">
                      <span className="font-medium">{rule.description || "Standard Rule"}</span>
                      <span className="text-xs text-muted-foreground">+{rule.points_earned} pts</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>

      <div className="flex flex-col gap-2">
        
        {rewards.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rewards configured.</p>
        ) : accessibleRewards.length > 0 ? (
          <div className="grid gap-2">
            {accessibleRewards.map((reward) => (
              <Button
                 key={reward.id}
                 variant="outline"
                 className="justify-between h-auto py-2 px-3 flex-wrap"
                 disabled={isUpdating}
                 onClick={() => setConfirmationReward(reward)}
               >
                <div className="text-left">
                  <div className="font-medium text-sm">{reward.reward_name}</div>
                  <div className="text-xs text-muted-foreground">{reward.description}</div>
                </div>
                <div className="font-bold text-destructive">-{reward.points_required} pts</div>
              </Button>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            No rewards unlocked yet.
          </div>
        )}

        {nextReward && (
          <p className="text-xs text-muted-foreground mt-1">
            <strong>{nextReward.points_required - currentPoints} more points</strong> needed for {nextReward.reward_name}.
          </p>
        )}
      </div>

       <Button
        variant="outline"
        className="w-full"
        onClick={onToggleHistory}
      >
        <History className="h-4 w-4 mr-2" />
        {showHistory ? "Hide Points History" : "View Points History"}
      </Button>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmationReward} onOpenChange={() => setConfirmationReward(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Reward Redemption</DialogTitle>
            <DialogDescription>
              Are you sure you want to redeem <strong>{confirmationReward?.reward_name}</strong> for <strong>{confirmationReward?.points_required} points</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setConfirmationReward(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (confirmationReward) {
                  onRedeemReward(confirmationReward)
                  setConfirmationReward(null)
                }
              }}
            >
              Confirm Redemption
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
