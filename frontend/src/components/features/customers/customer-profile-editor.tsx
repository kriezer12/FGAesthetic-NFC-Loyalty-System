import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { Button } from "@/components/ui/button"
import type { Customer } from "@/types/customer"

interface ProfileForm {
  first_name: string
  middle_name: string
  last_name: string
  email: string
  phone: string
  date_of_birth: string
  gender: string
  skin_type: string
  address: string
  emergency_contact: string
  allergies: string
  notes: string
}

interface CustomerProfileEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profileForm: ProfileForm
  setProfileForm: (form: ProfileForm | ((prev: ProfileForm) => ProfileForm)) => void
  savingProfile: boolean
  onSave: () => Promise<void>
  selectedCustomer: Customer | null
  setScanMessage: (msg: string | null) => void
  setReassignPrompt: (prompt: any) => void
  setAssignNfcModalOpen: (open: boolean) => void
  setShouldReopenProfileEditor: (open: boolean) => void
}

export function CustomerProfileEditor({
  open,
  onOpenChange,
  profileForm,
  setProfileForm,
  savingProfile,
  onSave,
  selectedCustomer,
  setScanMessage,
  setReassignPrompt,
  setAssignNfcModalOpen,
  setShouldReopenProfileEditor,
}: CustomerProfileEditorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update the selected customer's profile information.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 h-full min-h-0 px-6 py-4">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="first_name" className="text-sm font-medium">First Name <span className="text-destructive">*</span></label>
              <Input
                id="first_name"
                value={profileForm.first_name}
                autoComplete="given-name"
                onChange={(e) => setProfileForm((prev) => ({ ...prev, first_name: e.target.value }))}
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="middle_name" className="text-sm font-medium">Middle Name</label>
              <Input
                id="middle_name"
                value={profileForm.middle_name}
                autoComplete="additional-name"
                onChange={(e) => setProfileForm((prev) => ({ ...prev, middle_name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="last_name" className="text-sm font-medium">Last Name <span className="text-destructive">*</span></label>
              <Input
                id="last_name"
                value={profileForm.last_name}
                autoComplete="family-name"
                onChange={(e) => setProfileForm((prev) => ({ ...prev, last_name: e.target.value }))}
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                autoComplete="email"
                onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">Phone</label>
              <Input
                id="phone"
                value={profileForm.phone}
                autoComplete="tel"
                onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label id="label-dob" className="text-sm font-medium">Date of Birth</label>
              <DatePicker
                value={profileForm.date_of_birth ? new Date(profileForm.date_of_birth) : undefined}
                onChange={(date) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    date_of_birth: date ? date.toISOString().slice(0, 10) : "",
                  }))
                }
                captionLayout="dropdown"
                enableManualInput
                aria-labelledby="label-dob"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="gender" className="text-sm font-medium">Gender</label>
              <Input
                id="gender"
                value={profileForm.gender}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, gender: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="skin_type" className="text-sm font-medium">Skin Type</label>
              <Input
                id="skin_type"
                value={profileForm.skin_type}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, skin_type: e.target.value }))}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="address" className="text-sm font-medium">Address</label>
              <Input
                id="address"
                value={profileForm.address}
                autoComplete="street-address"
                onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="emergency_contact" className="text-sm font-medium">Emergency Contact</label>
              <Input
                id="emergency_contact"
                value={profileForm.emergency_contact}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, emergency_contact: e.target.value }))}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="nfc_uid" className="text-sm font-medium">NFC Card</label>
              <Input
                id="nfc_uid"
                value={selectedCustomer?.nfc_uid || ""}
                readOnly
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="allergies" className="text-sm font-medium">Allergies</label>
              <Textarea
                id="allergies"
                rows={3}
                value={profileForm.allergies}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, allergies: e.target.value }))}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="notes" className="text-sm font-medium">Notes</label>
              <Textarea
                id="notes"
                rows={4}
                value={profileForm.notes}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
        </ScrollArea>

        <div className="mt-2 flex items-center justify-between gap-2 p-6 border-t bg-background">
          <Button
            variant="outline"
            onClick={() => {
              setScanMessage(null)
              setReassignPrompt(null)
              setAssignNfcModalOpen(true)
              onOpenChange(false)
              setShouldReopenProfileEditor(true)
            }}
            disabled={savingProfile}
          >
            Tag New Card
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={savingProfile}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
