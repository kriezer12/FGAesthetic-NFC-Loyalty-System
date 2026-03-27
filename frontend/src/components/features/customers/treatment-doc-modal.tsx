import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Image, ChevronDown, Download, Trash2, FileText, Plus } from "lucide-react"
import type { Appointment } from "@/types/appointment"

interface Photo {
  id: string
  url: string
  type: 'before' | 'after' | 'other'
}

interface TreatmentDocModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedAppointment: Appointment | null
  treatmentGalleryUploading: boolean
  handleTreatmentPhotoUpload: (file: File, type: 'before' | 'after' | 'other') => Promise<void>
  treatmentConsentUploading: boolean
  handleTreatmentConsentFormUpload: (file: File) => Promise<void>
  treatmentGalleryError: string
  treatmentConsentError: string
  treatmentGroupIsPackage: boolean
  treatmentGroupTotalSessions: number
  treatmentGroupCompletedSessions: number
  treatmentGroupRemainingSessions: number
  treatmentGroupSessionsSorted: Appointment[]
  getAppointmentStatusVariant: (status: string | undefined) => "success" | "destructive" | "warning" | "info" | "outline"
  openRescheduleAppointment: (appt: Appointment) => void
  uploadSectionOpen: {
    beforeAfter: boolean
    forms: boolean
    miscellaneous: boolean
  }
  setUploadSectionOpen: (fn: (prev: {
    beforeAfter: boolean
    forms: boolean
    miscellaneous: boolean
  }) => {
    beforeAfter: boolean
    forms: boolean
    miscellaneous: boolean
  }) => void
  treatmentPhotos: Photo[]
  setEnlargedImage: (url: string | null) => void
  downloadImageAsJpeg: (url: string, name: string) => void
  handleDeleteTreatmentPhoto: (photo: Photo) => Promise<void>
  treatmentConsentUploaded: boolean
  treatmentConsentUrl: string
  handleDeleteTreatmentConsentForm: () => Promise<void>
  navigate: (path: string, state?: { state: { appointmentId: string } }) => void
}

export function TreatmentDocModal({
  open,
  onOpenChange,
  selectedAppointment,
  treatmentGalleryUploading,
  handleTreatmentPhotoUpload,
  treatmentConsentUploading,
  handleTreatmentConsentFormUpload,
  treatmentGalleryError,
  treatmentConsentError,
  treatmentGroupIsPackage,
  treatmentGroupTotalSessions,
  treatmentGroupCompletedSessions,
  treatmentGroupRemainingSessions,
  treatmentGroupSessionsSorted,
  getAppointmentStatusVariant,
  openRescheduleAppointment,
  uploadSectionOpen,
  setUploadSectionOpen,
  treatmentPhotos,
  setEnlargedImage,
  downloadImageAsJpeg,
  handleDeleteTreatmentPhoto,
  treatmentConsentUploaded,
  treatmentConsentUrl,
  handleDeleteTreatmentConsentForm,
  navigate,
}: TreatmentDocModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] min-h-0 flex flex-col p-0">
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Treatment Documentation - {selectedAppointment?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedAppointment?.treatment_name && `Treatment: ${selectedAppointment.treatment_name}`}
              {selectedAppointment?.start_time && (
                <span className="block text-sm text-muted-foreground">
                  <span className="block">
                    {new Date(selectedAppointment.start_time).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea
          className="flex-1 h-full min-h-0 w-full pr-3 overflow-auto scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="space-y-6 px-6 py-4">
            {/* Hidden file inputs */}
            <input
              id="treatment-before-input"
              type="file"
              accept="image/*"
              className="hidden"
              disabled={treatmentGalleryUploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleTreatmentPhotoUpload(file, 'before')
                e.currentTarget.value = ''
              }}
            />
            <input
              id="treatment-after-input"
              type="file"
              accept="image/*"
              className="hidden"
              disabled={treatmentGalleryUploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleTreatmentPhotoUpload(file, 'after')
                e.currentTarget.value = ''
              }}
            />
            <input
              id="treatment-other-input"
              type="file"
              accept="image/*"
              className="hidden"
              disabled={treatmentGalleryUploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleTreatmentPhotoUpload(file, 'other')
                e.currentTarget.value = ''
              }}
            />
            <input
              id="treatment-consent-form-input"
              type="file"
              accept="image/*"
              className="hidden"
              disabled={treatmentConsentUploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleTreatmentConsentFormUpload(file)
                e.currentTarget.value = ''
              }}
            />

            {/* Error Messages */}
            {treatmentGalleryError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700">{treatmentGalleryError}</p>
              </div>
            )}
            {treatmentConsentError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700">{treatmentConsentError}</p>
              </div>
            )}

            {/* Treatment session summary (for packages) */}
            {treatmentGroupIsPackage && treatmentGroupTotalSessions > 0 && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Package history</p>
                    <p className="text-xs text-muted-foreground">
                      {treatmentGroupCompletedSessions} of {treatmentGroupTotalSessions} sessions completed • {treatmentGroupRemainingSessions} remaining
                    </p>
                  </div>
                  <Badge 
                    variant={treatmentGroupCompletedSessions === treatmentGroupTotalSessions ? "success" : "warning"} 
                    className="capitalize"
                  >
                    {treatmentGroupCompletedSessions === treatmentGroupTotalSessions
                      ? "Complete"
                      : "In progress"}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2">
                  {treatmentGroupSessionsSorted.map((s) => (
                    <ContextMenu key={s.id}>
                      <ContextMenuTrigger asChild>
                        <div
                          className="cursor-context-menu grid grid-cols-[1fr_auto] gap-3 rounded-lg border px-3 py-2 bg-background hover:bg-muted/30 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium">
                                  {new Date(s.start_time).toLocaleDateString(undefined, {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(s.start_time).toLocaleTimeString(undefined, {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                              <Badge variant={getAppointmentStatusVariant(s.status)} className="capitalize">
                                {s.status?.replace("-", " ") || "Unknown"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {s.notes ? s.notes : "No notes"}
                            </p>
                          </div>

                          <div className="flex items-start justify-end gap-2">
                            {s.status === "cancelled" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openRescheduleAppointment(s)}
                              >
                                Reschedule
                              </Button>
                            )}
                          </div>
                        </div>
                      </ContextMenuTrigger>

                      <ContextMenuContent>
                        <ContextMenuItem
                          onSelect={() => {
                            onOpenChange(false)
                            setTimeout(() => {
                              document
                                .querySelectorAll("[data-radix-dialog-overlay], [data-radix-context-menu-overlay]")
                                .forEach((el) => el.remove())

                              navigate("/dashboard/appointments", {
                                state: { appointmentId: s.id },
                              })
                            }, 0)
                          }}
                        >
                          Edit appointment
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))}
                </div>
              </div>
            )}

            {/* Upload sections */}
            <div className="space-y-4">
              {/* Before & After */}
              <div className="rounded-lg border bg-muted/10">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 px-4 py-3"
                  onClick={() => setUploadSectionOpen((prev: any) => ({ ...prev, beforeAfter: !prev.beforeAfter }))}
                >
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Before &amp; After</p>
                      <p className="text-xs text-muted-foreground">Upload photos from the treatment session.</p>
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition ${uploadSectionOpen.beforeAfter ? "rotate-180" : ""}`} />
                </button>
                {uploadSectionOpen.beforeAfter && (
                  <div className="border-t px-4 py-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {['before', 'after'].map((type) => {
                        const photos = treatmentPhotos.filter((p) => p.type === type)
                        const label = type === 'before' ? 'Before' : 'After'
                        return (
                          <div key={type} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{label}</p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => document.getElementById(`treatment-${type}-input`)?.click()}
                                disabled={treatmentGalleryUploading}
                              >
                                Upload
                              </Button>
                            </div>
                            {photos.length > 0 ? (
                              <div className="grid grid-cols-2 gap-3">
                                {photos.map((photo) => (
                                  <div key={photo.id} className="relative overflow-hidden rounded-xl border bg-muted">
                                    <button type="button" className="absolute inset-0 z-10" onClick={() => setEnlargedImage(photo.url)} />
                                    <img src={photo.url} alt={type} className="h-24 w-full object-cover" />
                                    <div className="absolute bottom-1 right-1 flex gap-1 z-20">
                                      <Button size="icon" variant="ghost" className="h-8 w-8 p-0" onClick={() => downloadImageAsJpeg(photo.url, `${type}-photo`)}>
                                        <Download className="h-4 w-4" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDeleteTreatmentPhoto(photo)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No photos added yet.</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Consent Form */}
              <div className="rounded-lg border bg-muted/10">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 px-4 py-3"
                  onClick={() => setUploadSectionOpen((prev: any) => ({ ...prev, forms: !prev.forms }))}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Consent Form</p>
                      <p className="text-xs text-muted-foreground">Upload a signed consent form or treatment notes.</p>
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition ${uploadSectionOpen.forms ? "rotate-180" : ""}`} />
                </button>
                {uploadSectionOpen.forms && (
                  <div className="border-t px-4 py-4">
                    {treatmentConsentUploaded && treatmentConsentUrl ? (
                      <div className="flex flex-col gap-3">
                        <div className="relative overflow-hidden rounded-xl border bg-muted">
                          <button type="button" className="absolute inset-0 z-10" onClick={() => setEnlargedImage(treatmentConsentUrl)} />
                          <img src={treatmentConsentUrl} alt="Consent Form" className="h-40 w-full object-cover" />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => downloadImageAsJpeg(treatmentConsentUrl, 'consent-form')}>Download</Button>
                          <Button size="sm" variant="destructive" onClick={handleDeleteTreatmentConsentForm}>Delete</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">No consent form uploaded yet.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => document.getElementById('treatment-consent-form-input')?.click()}
                          disabled={treatmentConsentUploading}
                        >
                          Upload
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Miscellaneous */}
              <div className="rounded-lg border bg-muted/10">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 px-4 py-3"
                  onClick={() => setUploadSectionOpen((prev: any) => ({ ...prev, miscellaneous: !prev.miscellaneous }))}
                >
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Miscellaneous</p>
                      <p className="text-xs text-muted-foreground">Upload other reference images or notes.</p>
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition ${uploadSectionOpen.miscellaneous ? "rotate-180" : ""}`} />
                </button>
                {uploadSectionOpen.miscellaneous && (
                  <div className="border-t px-4 py-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {treatmentPhotos.filter((p) => p.type === 'other').map((photo) => (
                        <div key={photo.id} className="relative overflow-hidden rounded-xl border bg-muted">
                          <button type="button" className="absolute inset-0 z-10" onClick={() => setEnlargedImage(photo.url)} />
                          <img src={photo.url} alt="Misc" className="h-24 w-full object-cover" />
                          <div className="absolute bottom-1 right-1 flex gap-1 z-20">
                            <Button size="icon" variant="ghost" className="h-8 w-8 p-0" onClick={() => downloadImageAsJpeg(photo.url, `other-photo-${photo.id}`)}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDeleteTreatmentPhoto(photo)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <button
                        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-xs text-muted-foreground hover:border-primary hover:bg-primary/5"
                        onClick={() => document.getElementById('treatment-other-input')?.click()}
                        disabled={treatmentGalleryUploading}
                      >
                        <Plus className="h-5 w-5 text-primary" />
                        Add Photo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
