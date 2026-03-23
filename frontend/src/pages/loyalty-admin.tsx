import { useState, useEffect } from "react"
import { MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase"
import { generateId } from "@/components/features/calendar/calendar-parts/calendar-utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Combobox } from "@/components/ui/combobox"
import type { Service } from "@/types/service"

export interface LoyaltyReward {
  id: string
  points_required: number
  reward_treatment_id?: string
  reward_name: string
  description?: string
  is_active: boolean
}

export interface EarningRule {
  id: string
  treatment_id?: string
  points_earned: number
  is_active: boolean
  expiration_days?: number
  description?: string
  created_at?: string
}

export default function LoyaltyAdminPage() {
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  const [rules, setRules] = useState<EarningRule[]>([])
  const [services, setServices] = useState<Service[]>([])

  const [rewardModalOpen, setRewardModalOpen] = useState(false)
  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null)
  const [editingRule, setEditingRule] = useState<EarningRule | null>(null)

  const fetchRewards = async () => {
    const { data } = await supabase.from("loyalty_rewards").select("*").order("points_required", { ascending: true })
    if (data) setRewards(data)
  }

  const fetchRules = async () => {
    const { data } = await supabase.from("earning_rules").select("*").order("points_earned", { ascending: true })
    if (data) setRules(data)
  }

  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("id, name").order("name", { ascending: true })
    if (data) setServices(data as Service[])
  }

  useEffect(() => {
    fetchRewards()
    fetchRules()
    fetchServices()
  }, [])

  const calculateRemainingDays = (rule: EarningRule) => {
    if (!rule.expiration_days || !rule.created_at) return null
    const createdAt = new Date(rule.created_at)
    const expiryDate = new Date(createdAt)
    expiryDate.setDate(createdAt.getDate() + rule.expiration_days)
    
    const now = new Date()
    const diffMs = expiryDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const saveReward = async (reward: LoyaltyReward) => {
    if (reward.id) {
      await supabase.from("loyalty_rewards").update(reward).eq("id", reward.id)
    } else {
      const id = generateId()
      await supabase.from("loyalty_rewards").insert({ ...reward, id })
    }
    fetchRewards()
    setRewardModalOpen(false)
  }

  const deleteReward = async (id: string) => {
    if (!confirm("Are you sure you want to delete this reward?")) return
    await supabase.from("loyalty_rewards").delete().eq("id", id)
    fetchRewards()
  }

  const saveRule = async (rule: EarningRule) => {
    if (rule.id) {
      // Don't send created_at on update
      const { created_at, ...updateData } = rule
      await supabase.from("earning_rules").update(updateData).eq("id", rule.id)
    } else {
      const id = generateId()
      await supabase.from("earning_rules").insert({ ...rule, id, created_at: new Date().toISOString() })
    }
    fetchRules()
    setRuleModalOpen(false)
  }

  const deleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return
    await supabase.from("earning_rules").delete().eq("id", id)
    fetchRules()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Loyalty System Configuration</h1>
      </div>

      <Tabs defaultValue="rewards" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="rewards">Rewards Catalog</TabsTrigger>
          <TabsTrigger value="rules">Earning Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-lg">Available Rewards</CardTitle>
              <Button size="sm" onClick={() => { 
                setEditingReward({
                  id: "",
                  points_required: 100,
                  reward_name: "",
                  is_active: true
                })
                setRewardModalOpen(true) 
              }}>
                <Plus className="size-4 mr-2" />
                Add Reward
              </Button>
            </CardHeader>
            <CardContent>
              {rewards.length === 0 ? (
                <p className="text-sm text-muted-foreground pb-4">No rewards configured.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reward Name</TableHead>
                      <TableHead>Points Required</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rewards.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.reward_name}</TableCell>
                        <TableCell>{r.points_required}</TableCell>
                        <TableCell className="text-muted-foreground">{r.description || "—"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${r.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                            {r.is_active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingReward(r); setRewardModalOpen(true) }}>
                                <Pencil className="size-4 mr-2" />Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onClick={() => deleteReward(r.id)}>
                                <Trash2 className="size-4 mr-2" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-lg">Points Earning Rules</CardTitle>
              <Button size="sm" onClick={() => { 
                setEditingRule({
                  id: "",
                  points_earned: 10,
                  is_active: true,
                  description: ""
                })
                setRuleModalOpen(true) 
              }}>
                <Plus className="size-4 mr-2" />
                Add Rule
              </Button>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <p className="text-sm text-muted-foreground pb-4">No earning rules configured.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Linked Treatment</TableHead>
                      <TableHead>Points Earned</TableHead>
                      <TableHead>Expires In</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((r) => {
                      const daysLeft = calculateRemainingDays(r)
                      const isExpired = daysLeft !== null && daysLeft <= 0

                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.description || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {services.find(s => s.id === r.treatment_id)?.name || "All / None"}
                          </TableCell>
                          <TableCell>+{r.points_earned}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {daysLeft !== null ? (
                              <span className={daysLeft <= 1 ? "text-destructive font-medium" : ""}>
                                {daysLeft > 0 ? `${daysLeft} days left` : "Expired"}
                              </span>
                            ) : "Never"}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${r.is_active && !isExpired ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                              {isExpired ? "Expired" : r.is_active ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="size-8">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setEditingRule(r); setRuleModalOpen(true) }}>
                                  <Pencil className="size-4 mr-2" />Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => deleteRule(r.id)}>
                                  <Trash2 className="size-4 mr-2" />Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reward Modal */}
      <Dialog open={rewardModalOpen} onOpenChange={setRewardModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReward?.id ? "Edit Reward" : "New Reward"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Reward Name</Label>
              <Input
                value={editingReward?.reward_name || ""}
                onChange={(e) => setEditingReward(prev => prev ? { ...prev, reward_name: e.target.value } : null)}
                placeholder="e.g. Free Facial"
              />
            </div>
            <div className="grid gap-2">
              <Label>Link to Treatment (Optional)</Label>
              <Combobox
                options={services.map(s => ({ value: s.id, label: s.name }))}
                value={editingReward?.reward_treatment_id || ""}
                onValueChange={(val) => {
                  const svc = services.find(s => s.id === val)
                  setEditingReward(prev => prev ? { 
                    ...prev, 
                    reward_treatment_id: val,
                    reward_name: (!prev.reward_name || services.some(s => s.name === prev.reward_name)) ? (svc?.name || "") : prev.reward_name
                  } : null)
                }}
                placeholder="Select a service..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Points Required</Label>
              <Input
                type="number"
                min={1}
                value={editingReward?.points_required ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditingReward(prev => prev ? { ...prev, points_required: val === "" ? "" : (parseInt(val, 10) || 0) } : null)
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input
                value={editingReward?.description || ""}
                onChange={(e) => setEditingReward(prev => prev ? { ...prev, description: e.target.value } : null)}
                placeholder="Optional description"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="reward-active"
                checked={editingReward?.is_active ?? true}
                onCheckedChange={(v) => setEditingReward(prev => prev ? { ...prev, is_active: !!v } : null)}
              />
              <Label htmlFor="reward-active">Active</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRewardModalOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (editingReward && editingReward.reward_name.trim() && editingReward.points_required > 0) {
                saveReward(editingReward)
              }
            }}>
              Save Reward
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rule Modal */}
      <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule?.id ? "Edit Rule" : "New Rule"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input
                value={editingRule?.description || ""}
                onChange={(e) => setEditingRule(prev => prev ? { ...prev, description: e.target.value } : null)}
                placeholder="e.g. +10 Points per Visit"
              />
            </div>
            <div className="grid gap-2">
              <Label>Link to Treatment (Optional)</Label>
              <Combobox
                options={services.map(s => ({ value: s.id, label: s.name }))}
                value={editingRule?.treatment_id || ""}
                onValueChange={(val) => {
                  const svc = services.find(s => s.id === val)
                  setEditingRule(prev => prev ? { 
                    ...prev, 
                    treatment_id: val,
                    description: (!prev.description || services.some(s => s.name === prev.description)) ? (svc?.name || "") : prev.description
                  } : null)
                }}
                placeholder="Select a service..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Points Earned</Label>
              <Input
                type="number"
                min={1}
                value={editingRule?.points_earned ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditingRule(prev => prev ? { ...prev, points_earned: val === "" ? "" : (parseInt(val, 10) || 0) } : null)
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label>Expiration (Days)</Label>
              <Input
                type="number"
                min={1}
                value={editingRule?.expiration_days ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditingRule(prev => prev ? { ...prev, expiration_days: val === "" ? "" : (parseInt(val, 10) || undefined) } : null)
                }}
                placeholder="Leave blank for no expiration"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="rule-active"
                checked={editingRule?.is_active ?? true}
                onCheckedChange={(v) => setEditingRule(prev => prev ? { ...prev, is_active: !!v } : null)}
              />
              <Label htmlFor="rule-active">Active</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRuleModalOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (editingRule && editingRule.points_earned > 0) {
                saveRule(editingRule)
              }
            }}>
              Save Rule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
