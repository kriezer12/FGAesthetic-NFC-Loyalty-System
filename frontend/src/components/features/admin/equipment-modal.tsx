import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  SelectNative 
} from "@/components/ui/select-native"
import { ChevronDown } from "lucide-react"
import { Equipment, EquipmentStatus } from "@/types/equipment"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

interface EquipmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipment: Equipment | null
  onSave: (data: any) => Promise<void>
}

export function EquipmentModal({ open, onOpenChange, equipment, onSave }: EquipmentModalProps) {
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    serial_number: "",
    status: "active" as EquipmentStatus,
    branch_id: "",
    last_maintained_at: "",
  })

  useEffect(() => {
    if (equipment) {
      setFormData({
        name: equipment.name,
        description: equipment.description || "",
        serial_number: equipment.serial_number || "",
        status: equipment.status,
        branch_id: equipment.branch_id,
        last_maintained_at: equipment.last_maintained_at ? equipment.last_maintained_at.split('T')[0] : "",
      })
    } else {
      setFormData({
        name: "",
        description: "",
        serial_number: "",
        status: "active",
        branch_id: userProfile?.branch_id || "",
        last_maintained_at: "",
      })
    }
  }, [equipment, userProfile])

  useEffect(() => {
    const fetchBranches = async () => {
      if (userProfile?.role === 'super_admin') {
        const { data } = await supabase.from('branches').select('id, name').order('name')
        setBranches(data || [])
      }
    }
    fetchBranches()
  }, [userProfile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave({
        ...formData,
        last_maintained_at: formData.last_maintained_at || null,
      })
      onOpenChange(false)
    } catch (err) {
      console.error("Save equipment error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background border border-border">
        <DialogHeader>
          <DialogTitle>{equipment ? "Edit Equipment" : "Add New Equipment"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Equipment Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Laser Machine XR-2"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the equipment..."
              className="resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                placeholder="SN-12345"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <div className="relative">
                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <SelectNative
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as EquipmentStatus })}
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="out_of_order">Out of Order</option>
                </SelectNative>
              </div>
            </div>
          </div>
          {userProfile?.role === 'super_admin' && (
            <div className="grid gap-2">
              <Label htmlFor="branch">Branch</Label>
              <div className="relative">
                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <SelectNative
                  id="branch"
                  value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                  required
                >
                  <option value="" disabled>Select branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </SelectNative>
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="last_maintained">Last Maintained At</Label>
            <Input
              id="last_maintained"
              type="date"
              value={formData.last_maintained_at}
              onChange={(e) => setFormData({ ...formData, last_maintained_at: e.target.value })}
            />
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : equipment ? "Save Changes" : "Create Equipment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
