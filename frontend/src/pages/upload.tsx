/**
 * Upload Page
 * ===========
 *
 * Picture upload with WebP conversion, compression, and file management.
 * Lists all stored files from Supabase — click a card to view details,
 * rename, or delete.
 */

import { useEffect, useState, useRef, useCallback } from "react"
import {
  Upload,
  Image,
  AlertCircle,
  CheckCircle,
  Zap,
  Trash2,
  Pencil,
  RefreshCw,
  FileImage,
  X,
  ExternalLink,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { validateFile, type ValidationError } from "@/lib/file-validation"
import {
  convertToWebP,
  generateFileName,
  formatFileSize,
} from "@/lib/image-utils"
import {
  uploadToSupabase,
  listFiles,
  deleteFromSupabase,
  renameInSupabase,
  type StoredFile,
} from "@/lib/supabase-storage"

const BUCKET = "customer-picture"
const FOLDER = "uploads"

export default function UploadPage() {
  useEffect(() => {
    document.title = "Upload - FG Aesthetic Centre"
  }, [])

  // ── Upload state ──
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [processing, setProcessing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // ── File list state ──
  const [storedFiles, setStoredFiles] = useState<StoredFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)

  // ── Detail dialog state ──
  const [selectedFile, setSelectedFile] = useState<StoredFile | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState("")
  const [renaming, setRenaming] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ── Load stored files ──
  const fetchFiles = useCallback(async () => {
    setLoadingFiles(true)
    try {
      const result = await listFiles(BUCKET, FOLDER)
      if (result.success) {
        setStoredFiles(result.files)
      }
    } finally {
      setLoadingFiles(false)
    }
  }, [])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  // ── Drag & drop handlers ──
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const files = e.dataTransfer.files
    if (files && files[0]) {
      processFile(files[0])
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) processFile(file)
  }

  // ── Process → Upload pipeline ──
  const processFile = (file: File) => {
    setValidationErrors([])
    setMessage(null)

    const errors = validateFile(file)
    if (errors.length > 0) {
      setValidationErrors(errors)
      setMessage({ type: "error", text: errors.map((e) => e.message).join(", ") })
      return
    }

    processAndUpload(file)
  }

  const processAndUpload = async (file: File) => {
    setProcessing(true)
    setMessage(null)

    try {
      const processed = await convertToWebP(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.8,
      })

      setProcessing(false)
      setUploading(true)

      const fileName = generateFileName(file.name, "webp")
      const result = await uploadToSupabase(
        BUCKET,
        `${FOLDER}/${fileName}`,
        processed.blob
      )

      if (!result.success || !result.url) {
        throw new Error(result.error ?? "Upload failed")
      }

      setMessage({ type: "success", text: `✓ Uploaded: ${fileName}` })
      fetchFiles()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Processing failed"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setProcessing(false)
      setUploading(false)
    }
  }

  // ── Open detail dialog ──
  const openDetail = (file: StoredFile) => {
    setSelectedFile(file)
    setIsRenaming(false)
    setRenameValue("")
    setConfirmDelete(false)
  }

  const closeDetail = () => {
    setSelectedFile(null)
    setIsRenaming(false)
    setRenameValue("")
    setConfirmDelete(false)
  }

  // ── Rename handler ──
  const startRename = () => {
    if (!selectedFile) return
    setRenameValue(selectedFile.name.replace(/\.[^.]+$/, ""))
    setIsRenaming(true)
    setConfirmDelete(false)
  }

  const handleRename = async () => {
    if (!selectedFile || !renameValue.trim()) return
    setRenaming(true)
    try {
      const ext = selectedFile.name.split(".").pop() ?? "webp"
      const sanitized = renameValue
        .trim()
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9-_]/g, "-")
      const newName = `${sanitized}.${ext}`
      const newPath = `${FOLDER}/${newName}`

      const result = await renameInSupabase(BUCKET, selectedFile.path, newPath)
      if (!result.success) throw new Error(result.error)

      setMessage({ type: "success", text: `Renamed to: ${newName}` })
      closeDetail()
      fetchFiles()
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Rename failed"
      setMessage({ type: "error", text: msg })
    } finally {
      setRenaming(false)
    }
  }

  // ── Delete handler ──
  const handleDelete = async () => {
    if (!selectedFile) return
    setDeleting(true)
    try {
      const result = await deleteFromSupabase(BUCKET, selectedFile.path)
      if (!result.success) throw new Error(result.error)
      setMessage({ type: "success", text: `Deleted: ${selectedFile.name}` })
      closeDetail()
      fetchFiles()
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Delete failed"
      setMessage({ type: "error", text: msg })
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Picture Upload</h1>
        <p className="text-muted-foreground mt-2">
          Upload images with automatic WebP conversion · Click a file to view details
        </p>
      </div>

      {/* ── Upload Zone ── */}
      <Card className="p-6">
        <div className="space-y-4">
          <div
            ref={dropZoneRef}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-input")?.click()}
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-all cursor-pointer ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5"
            }`}
          >
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {processing || uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Zap className="h-8 w-8 text-primary animate-pulse" />
                <p className="text-sm font-medium">
                  {processing ? "Converting to WebP…" : "Uploading to Supabase…"}
                </p>
              </div>
            ) : (
              <>
                <Image className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Drop your image here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPEG, PNG, GIF, WebP · Max 50 MB
                </p>
              </>
            )}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg space-y-1">
              {validationErrors.map((error, idx) => (
                <div key={idx} className="flex gap-2 text-sm text-red-800 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Status Message */}
          {message && (
            <div
              className={`p-3 rounded-lg text-sm flex gap-2 ${
                message.type === "success"
                  ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}
        </div>
      </Card>

      {/* ── Stored Files Grid ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileImage className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Stored Files</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {storedFiles.length}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFiles}
            disabled={loadingFiles}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loadingFiles ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loadingFiles && storedFiles.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground text-sm">
            Loading files…
          </Card>
        ) : storedFiles.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground text-sm">
            No files uploaded yet. Drop an image above to get started.
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {storedFiles.map((file) => (
              <Card
                key={file.id}
                className="group cursor-pointer overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
                onClick={() => openDetail(file)}
              >
                <div className="aspect-square bg-muted relative">
                  <img
                    src={file.signedUrl}
                    alt={file.name}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Unified Detail Dialog ── */}
      <Dialog open={!!selectedFile} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="sm:max-w-lg">
          {selectedFile && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6 break-all">{selectedFile.name}</DialogTitle>
                <DialogDescription>File details and actions</DialogDescription>
              </DialogHeader>

              {/* Preview */}
              <div className="rounded-lg overflow-hidden bg-muted">
                <img
                  src={selectedFile.signedUrl}
                  alt={selectedFile.name}
                  className="w-full max-h-64 object-contain"
                />
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <Label className="text-muted-foreground text-xs">Type</Label>
                  <p className="font-medium">{selectedFile.mimeType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Size</Label>
                  <p className="font-medium">{formatFileSize(selectedFile.size)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Uploaded</Label>
                  <p className="font-medium">{formatDate(selectedFile.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Path</Label>
                  <p className="font-medium text-xs break-all">{selectedFile.path}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground text-xs">Public URL</Label>
                  <a
                    href={selectedFile.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline flex items-center gap-1 break-all mt-0.5"
                  >
                    Open in new tab
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              </div>

              <Separator />

              {/* ── Rename Section ── */}
              {isRenaming ? (
                <div className="space-y-3">
                  <Label htmlFor="rename-input" className="text-sm font-medium">
                    New filename
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="rename-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename()}
                      placeholder="new-filename"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={handleRename}
                      disabled={renaming || !renameValue.trim()}
                    >
                      {renaming ? "Saving…" : <Save className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsRenaming(false)}
                      disabled={renaming}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Extension will be preserved. Special characters are replaced with dashes.
                  </p>
                </div>
              ) : confirmDelete ? (
                /* ── Delete Confirmation ── */
                <div className="space-y-3">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                    Are you sure? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1"
                    >
                      {deleting ? "Deleting…" : "Yes, delete permanently"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── Action Buttons ── */
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={startRename} className="flex-1">
                    <Pencil className="h-4 w-4 mr-1.5" />
                    Rename
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDelete(true)}
                    className="flex-1 text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
