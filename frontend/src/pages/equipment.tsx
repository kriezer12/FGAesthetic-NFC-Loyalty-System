import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Navigate } from "react-router-dom"
import { useEquipment } from "@/hooks/use-equipment"
import { Equipment, EquipmentStatus } from "@/types/equipment"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Wrench, 
  Plus, 
  Search, 
  RefreshCw, 
  Settings2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Construction,
  Building2,
  ChevronDown
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { EquipmentModal } from "@/components/features/admin/equipment-modal"
import { SelectNative } from "@/components/ui/select-native"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function EquipmentPage() {
  useEffect(() => {
    document.title = "Equipment - FG Aesthetic Centre"
  }, [])

  const { userProfile, loading: authLoading } = useAuth()
  const { 
    equipment, 
    loading: equipmentLoading, 
    error, 
    fetchEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment
  } = useEquipment()

  const [searchTerm, setSearchTerm] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(null)
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all")

  useEffect(() => {
    const fetchBranches = async () => {
      if (userProfile?.role === 'super_admin') {
        const { data } = await supabase.from('branches').select('id, name').order('name')
        setBranches(data || [])
      }
    }
    fetchBranches()
  }, [userProfile])

  const filteredEquipment = useMemo(() => {
    let result = equipment
    
    if (selectedBranchId !== "all") {
      result = result.filter(e => e.branch_id === selectedBranchId)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter((e) => 
        e.name.toLowerCase().includes(term) || 
        e.serial_number?.toLowerCase().includes(term) ||
        e.description?.toLowerCase().includes(term)
      )
    }
    
    return result
  }, [equipment, searchTerm, selectedBranchId])

  const statusStats = useMemo(() => {
    return {
      active: equipment.filter(e => e.status === 'active').length,
      maintenance: equipment.filter(e => e.status === 'maintenance').length,
      outOfOrder: equipment.filter(e => e.status === 'out_of_order').length,
    }
  }, [equipment])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!userProfile || !["super_admin", "branch_admin"].includes(userProfile.role)) {
    return <Navigate to="/dashboard" replace />
  }

  const handleAddEquipment = () => {
    setEditingEquipment(null)
    setModalOpen(true)
  }

  const handleEditEquipment = (e: Equipment) => {
    setEditingEquipment(e)
    setModalOpen(true)
  }

  const handleDeleteClick = (e: Equipment) => {
    setEquipmentToDelete(e)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (equipmentToDelete) {
      await deleteEquipment(equipmentToDelete.id)
      setEquipmentToDelete(null)
    }
  }

  const handleSaveEquipment = async (data: any) => {
    if (editingEquipment) {
      await updateEquipment(editingEquipment.id, data)
    } else {
      await createEquipment(data)
    }
  }

  const getStatusBadge = (status: EquipmentStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 gap-1"><CheckCircle2 className="h-3 w-3" /> Active</Badge>
      case 'maintenance':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20 gap-1"><Construction className="h-3 w-3" /> Maintenance</Badge>
      case 'out_of_order':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 gap-1"><AlertCircle className="h-3 w-3" /> Out of Order</Badge>
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment Management</h1>
          <p className="text-muted-foreground">Manage clinic equipment, track maintenance, and monitor status.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchEquipment} disabled={equipmentLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${equipmentLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleAddEquipment}>
            <Plus className="h-4 w-4 mr-2" />
            Add Equipment
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipment.length}</div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{statusStats.active}</div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Maintenance</CardTitle>
            <Construction className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{statusStats.maintenance}</div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Branch</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {userProfile.role === 'super_admin' ? 'All Branches' : (userProfile.branch_name || 'Main Branch')}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search equipment..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {userProfile?.role === 'super_admin' && (
          <div className="relative w-full md:w-auto min-w-[200px]">
            <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <SelectNative
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="pr-8"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </SelectNative>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEquipment.length === 0 ? (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl border-border bg-muted/30">
            <div className="flex flex-col items-center gap-2">
              <Wrench className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-muted-foreground">No equipment found.</p>
              <Button variant="link" onClick={handleAddEquipment}>Add your first equipment</Button>
            </div>
          </div>
        ) : (
          filteredEquipment.map((e) => (
            <Card key={e.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {userProfile.role === 'super_admin' && (
                        <Badge variant="outline" className="text-[10px] h-4">
                          {e.branch?.name}
                        </Badge>
                      )}
                      {getStatusBadge(e.status)}
                    </div>
                    <CardTitle className="text-xl font-bold tracking-tight">{e.name}</CardTitle>
                    <CardDescription className="line-clamp-1">{e.serial_number || "No serial number"}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4 space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                  {e.description || "No description provided."}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-4">
                  <div className="space-y-1">
                    <p className="uppercase tracking-wider font-semibold">Last Maintenance</p>
                    <p>{e.last_maintained_at ? format(new Date(e.last_maintained_at), 'MMM d, yyyy') : 'Never'}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-border" onClick={() => handleEditEquipment(e)}>
                      <Settings2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-border text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteClick(e)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <EquipmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        equipment={editingEquipment}
        onSave={handleSaveEquipment}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-background border border-border shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{equipmentToDelete?.name}</strong>. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              className="bg-destructive text-white hover:bg-destructive/90 transition-colors"
            >
              Delete Equipment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
