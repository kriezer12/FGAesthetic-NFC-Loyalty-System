import { useState, type KeyboardEvent } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { useBranches, type Branch } from "@/hooks/use-branches"
import { Building2, Plus, ArrowLeft, Loader2, Mail, Phone, MapPin, Trash2, Pencil } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatPhilippinePhone, formatPhoneLiveInput, validatePhilippinePhone, isAllowedPhoneKey } from "@/components/features/nfc/register-card-parts/phone-utils"
interface BranchManagementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BranchManagementModal({ open, onOpenChange }: BranchManagementModalProps) {
  const { branches, loading, createBranch, deleteBranch, updateBranch } = useBranches()
  const [isAdding, setIsAdding] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneLiveInput(e.target.value)
    setFormData((prev) => ({ ...prev, phone: formatted }))
    if (phoneError) setPhoneError(null)
  }

  const handlePhoneBlur = () => {
    if (formData.phone.trim()) {
      const formatted = formatPhilippinePhone(formData.phone)
      setFormData((prev) => ({ ...prev, phone: formatted }))
      setPhoneError(validatePhilippinePhone(formatted))
    } else {
      setPhoneError(null)
    }
  }

  const handlePhoneKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isAllowedPhoneKey(e.key)) {
      e.preventDefault()
    }
  }

  const handleEditClick = (branch: Branch) => {
    setIsEditing(true)
    setEditingBranchId(branch.id)
    setFormData({
      name: branch.name,
      address: branch.address || "",
      phone: branch.phone || "",
      email: branch.email || "",
    })
    setIsAdding(true) // Reuse the same form view
    setPhoneError(null)
  }

  const handleCancelForm = () => {
    setIsAdding(false)
    setIsEditing(false)
    setEditingBranchId(null)
    setFormData({ name: "", address: "", phone: "", email: "" })
    setPhoneError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) return

    setIsSubmitting(true)

    let error;
    if (isEditing && editingBranchId) {
      const { error: updateError } = await updateBranch(editingBranchId, formData)
      error = updateError
    } else {
      const { error: createError } = await createBranch(formData)
      error = createError
    }

    setIsSubmitting(false)

    if (!error) {
      handleCancelForm()
    } else {
      console.error(isEditing ? "Failed to update branch:" : "Failed to create branch:", error)
      alert(isEditing ? "Failed to update branch. Please try again." : "Failed to create branch. Please try again.")
    }
  }

  const handleDelete = async () => {
    if (!branchToDelete || deleteConfirmText !== branchToDelete.name) return

    setIsDeleting(true)
    const { error } = await deleteBranch(branchToDelete.id)
    setIsDeleting(false)

    if (!error) {
      setBranchToDelete(null)
      setDeleteConfirmText("")
    } else {
      console.error("Failed to delete branch:", error)
      alert("Failed to delete branch. Please try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] gap-0 p-0 overflow-hidden bg-background border-border/50">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Branch Management
              </DialogTitle>
              <DialogDescription>
                {branchToDelete 
                  ? "Confirm deletion of branch." 
                  : isAdding 
                    ? isEditing ? "Update existing branch details." : "Create a new branch location." 
                    : "View and manage all branch locations."}
              </DialogDescription>
            </div>
            {!isAdding && !branchToDelete && (
              <div className="w-[100px]" /> /* spacer to keep flex justify-between balanced if needed, or just remove */
            )}
            {isAdding && !branchToDelete && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCancelForm}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to List
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="p-6">
          {branchToDelete ? (
            <div className="space-y-4 p-4 pt-2 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-lg font-bold">Delete Branch</h3>
              <p className="text-sm text-muted-foreground max-w-[300px] mx-auto">
                Are you sure you want to delete <strong className="text-foreground">{branchToDelete.name}</strong>? 
                This action cannot be undone. Please type the branch name below to confirm.
              </p>
              <div className="max-w-[280px] mx-auto mt-4">
                <Input 
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={branchToDelete.name}
                  className="text-center"
                />
              </div>
              <div className="flex justify-center gap-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => { setBranchToDelete(null); setDeleteConfirmText(""); }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  disabled={deleteConfirmText !== branchToDelete.name || isDeleting} 
                  onClick={handleDelete}
                  className="min-w-[120px]"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : "Confirm Delete"}
                </Button>
              </div>
            </div>
          ) : isAdding ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <Field>
                  <FieldLabel htmlFor="name">Branch Name*</FieldLabel>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Dasmariñas Branch"
                    required
                    className="bg-muted/20"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="address">Full Address</FieldLabel>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="123 Dasmariñas City, Cavite"
                    className="bg-muted/20"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      onBlur={handlePhoneBlur}
                      onKeyDown={handlePhoneKeyDown}
                      placeholder="+63 99X XXX XXXX"
                      className={`bg-muted/20 ${phoneError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    {phoneError && (
                      <p className="text-xs text-destructive mt-1">{phoneError}</p>
                    )}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="email">Email Address</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="branch@example.com"
                      className="bg-muted/20"
                    />
                  </Field>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelForm}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isEditing ? "Saving..." : "Creating..."}
                    </>
                  ) : (
                    isEditing ? "Save Changes" : "Create Branch"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <ScrollArea className="h-[360px] pr-4 -mr-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                    <p className="text-sm font-medium">Fetching branches...</p>
                  </div>
                ) : branches.length > 0 ? (
                  <div className="grid gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAdding(true)} 
                      className="w-full gap-2 border-dashed font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors py-6 mb-2"
                    >
                      <Plus className="h-4 w-4" /> Add Branch
                    </Button>
                    {branches.map((branch) => (
                      <div
                        key={branch.id}
                        className="group relative flex flex-col p-4 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-300"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <h4 className="font-bold text-lg leading-none">{branch.name}</h4>
                          </div>
                          <div className="flex -mr-2 -mt-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={() => handleEditClick(branch)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => { setBranchToDelete(branch); setDeleteConfirmText(""); }}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2 mt-2">
                          {branch.address && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/60" />
                              <span>{branch.address}</span>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {branch.phone && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
                                <Phone className="h-3 w-3 shrink-0 text-primary/40" />
                                <span>{branch.phone}</span>
                              </div>
                            )}
                            {branch.email && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
                                <Mail className="h-3 w-3 shrink-0 text-primary/40" />
                                <span>{branch.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-center p-6 bg-muted/20 rounded-2xl border border-dashed">
                    <Building2 className="h-12 w-12 text-muted-foreground/20 mb-4" />
                    <h3 className="text-lg font-semibold text-muted-foreground">No Branches Yet</h3>
                    <p className="text-sm text-muted-foreground/60 max-w-[250px] mx-auto mt-2">
                      Get started by adding your first branch location to the system.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAdding(true)} 
                      className="mt-6 gap-2"
                    >
                      <Plus className="h-4 w-4" /> Add your first branch
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
