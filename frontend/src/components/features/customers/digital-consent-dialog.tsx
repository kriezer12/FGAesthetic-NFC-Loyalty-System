import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SignaturePad } from "@/components/ui/signature-pad"
import { Info } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { uploadToSupabase } from "@/lib/supabase-storage"
import { jsPDF } from "jspdf"

interface DigitalConsentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerName: string
  customerId: string
  appointmentId: string
  treatmentName?: string
  onSuccess: () => void
}

const DEFAULT_CONSENT_TEXT = `
By signing below, I acknowledge and agree to the following:

1. PROCEDURE CONSENT: I consent to undergo the treatment(s) as discussed with the staff.
2. DISCLOSURE OF INFORMATION: I have disclosed all relevant medical history, allergies, and current medications.
3. UNDERSTANDING RISKS: I understand that as with any aesthetic procedure, there are inherent risks, side effects, and possibilities of complications.
4. RESULTS: I acknowledge that no guarantee has been given by anyone as to the results that may be obtained.
5. AFTERCARE: I agree to follow the aftercare instructions provided to me.
6. DIGITAL SIGNATURE: I agree that my electronic signature is the legal equivalent of my manual signature.
`

export function DigitalConsentDialog({
  open,
  onOpenChange,
  customerName,
  customerId,
  appointmentId,
  treatmentName,
  onSuccess,
}: DigitalConsentDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const generateCombinedDocumentImage = async (signatureBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Could not get canvas context"))
        return
      }

      // Set canvas size (A4-ish ratio: 800x1100)
      canvas.width = 800
      canvas.height = 1100
      
      // Drawing logic (Same as before)
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = "#e5e7eb"
      ctx.lineWidth = 1
      ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10)
      ctx.fillStyle = "#111827"
      ctx.font = "bold 24px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("TREATMENT CONSENT FORM", canvas.width / 2, 60)
      ctx.strokeStyle = "#374151"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(50, 80)
      ctx.lineTo(750, 80)
      ctx.stroke()
      ctx.textAlign = "left"
      ctx.fillStyle = "#374151"
      ctx.font = "bold 16px sans-serif"
      ctx.fillText(`Customer: ${customerName}`, 50, 120)
      ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 50, 145)
      if (treatmentName) {
        ctx.fillText(`Treatment: ${treatmentName}`, 50, 170)
      }
      ctx.font = "normal 12px sans-serif"
      ctx.fillStyle = "#6b7280"
      ctx.fillText(`Appointment ID: ${appointmentId}`, 50, 195)
      ctx.fillStyle = "#1f2937"
      ctx.font = "normal 14px sans-serif"
      const lines = DEFAULT_CONSENT_TEXT.split("\n")
      let y = 240
      lines.forEach(line => {
        ctx.fillText(line.trim(), 50, y)
        y += 22
      })
      y = Math.max(y + 60, 800)
      ctx.strokeStyle = "#374151"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(50, y)
      ctx.lineTo(350, y)
      ctx.stroke()
      ctx.fillStyle = "#374151"
      ctx.font = "italic 14px sans-serif"
      ctx.fillText("Customer Signature", 50, y + 25)
      ctx.font = "normal 11px sans-serif"
      ctx.fillStyle = "#9ca3af"
      ctx.fillText(`Electronically signed on: ${new Date().toLocaleString()}`, 50, y + 45)

      const img = new Image()
      img.onload = () => {
        const sigWidth = 250
        const sigHeight = (img.height / img.width) * sigWidth
        ctx.drawImage(img, 50, y - sigHeight - 5, sigWidth, sigHeight)
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error("Could not generate document blob"))
        }, "image/png")
      }
      img.onerror = () => reject(new Error("Signature capture failed"))
      img.src = URL.createObjectURL(signatureBlob)
    })
  }

  const generatePDF = async (signatureBlob: Blob): Promise<Blob> => {
    return new Promise((resolve) => {
      const pdf = new jsPDF("p", "pt", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()

      // Header
      pdf.setFontSize(20)
      pdf.setFont("helvetica", "bold")
      pdf.text("TREATMENT CONSENT FORM", pageWidth / 2, 50, { align: "center" })

      // Horizontal line
      pdf.setDrawColor(55, 65, 81)
      pdf.setLineWidth(1.5)
      pdf.line(40, 65, pageWidth - 40, 65)

      // Customer info
      pdf.setFontSize(12)
      pdf.setFont("helvetica", "bold")
      pdf.setTextColor(55, 65, 81)
      pdf.text(`Customer: ${customerName}`, 40, 95)
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 40, 115)
      if (treatmentName) {
        pdf.text(`Treatment: ${treatmentName}`, 40, 135)
      }
      pdf.setFontSize(9)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(107, 114, 128)
      pdf.text(`Appointment ID: ${appointmentId}`, 40, 155)

      // Agreement body
      pdf.setFontSize(11)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(31, 41, 55)
      const lines = DEFAULT_CONSENT_TEXT.split("\n")
      let y = 190
      lines.forEach(line => {
        const trimmed = line.trim()
        if (!trimmed) { y += 10; return }
        // Word wrap long lines
        const wrapped = pdf.splitTextToSize(trimmed, pageWidth - 80)
        pdf.text(wrapped, 40, y)
        y += wrapped.length * 15
      })

      // Signature section
      y = Math.max(y + 50, 620)
      pdf.setDrawColor(55, 65, 81)
      pdf.setLineWidth(0.7)
      pdf.line(40, y, 280, y)
      pdf.setFontSize(11)
      pdf.setFont("helvetica", "italic")
      pdf.setTextColor(55, 65, 81)
      pdf.text("Customer Signature", 40, y + 20)
      pdf.setFontSize(8)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(156, 163, 175)
      pdf.text(`Electronically signed on: ${new Date().toLocaleString()}`, 40, y + 35)

      // Embed signature image (small JPEG)
      const sigCanvas = document.createElement("canvas")
      const sigCtx = sigCanvas.getContext("2d")
      if (!sigCtx) { resolve(pdf.output("blob")); return }

      const sigImg = new Image()
      sigImg.onload = () => {
        // Scale signature to higher resolution for clarity
        const maxW = 500
        const scale = maxW / sigImg.width
        sigCanvas.width = maxW
        sigCanvas.height = sigImg.height * scale
        // Fill white background (JPEG doesn't support transparency)
        sigCtx.fillStyle = "white"
        sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height)
        sigCtx.drawImage(sigImg, 0, 0, sigCanvas.width, sigCanvas.height)
        
        const sigDataUrl = sigCanvas.toDataURL("image/png")
        // Render signature larger in the PDF (pt units)
        const pdfSigW = 220
        const pdfSigH = (sigCanvas.height / sigCanvas.width) * pdfSigW
        pdf.addImage(sigDataUrl, "PNG", 40, y - pdfSigH - 10, pdfSigW, pdfSigH)
        
        resolve(pdf.output("blob"))
      }
      sigImg.onerror = () => {
        // Resolve without signature image
        resolve(pdf.output("blob"))
      }
      sigImg.src = URL.createObjectURL(signatureBlob)
    })
  }

  const handleCapture = async (signatureBlob: Blob) => {
    setIsSaving(true)
    setError(null)
    try {
      // 1. Generate Combined Document Image (for preview)
      const documentImageBlob = await generateCombinedDocumentImage(signatureBlob)
      
      // 2. Generate native PDF (text-based, small file size)
      const documentPdfBlob = await generatePDF(signatureBlob)

      const timestamp = Date.now()
      const imageFilename = `${appointmentId}_consent_doc_${timestamp}.png`
      const imagePath = `customer-treatment-consents/${customerId}/appointment-${appointmentId}/${imageFilename}`
      
      const pdfFilename = `${appointmentId}_consent_doc_${timestamp}.pdf`
      const pdfPath = `customer-treatment-consents/${customerId}/appointment-${appointmentId}/${pdfFilename}`

      // 3. Upload both
      const imageUpload = await uploadToSupabase("customer-picture", imagePath, documentImageBlob)
      if (!imageUpload.success) {
        throw new Error("Failed to upload document image")
      }

      // Upload PDF directly with explicit contentType (bucket may restrict MIME types)
      const { error: pdfError } = await supabase.storage
        .from("customer-picture")
        .upload(pdfPath, documentPdfBlob, {
          contentType: "application/pdf",
          cacheControl: "31536000",
          upsert: false,
        })
      
      if (pdfError) {
        console.warn("PDF upload failed, saving image only:", pdfError.message)
        // Still proceed — the image was saved successfully
      }

      // 4. Record in database
      const { error: dbError } = await supabase
        .from("treatment_consents")
        .insert({
          appointment_id: appointmentId,
          customer_id: customerId,
          consent_text: DEFAULT_CONSENT_TEXT,
          signature_path: imagePath,
          pdf_path: pdfPath,
        })

      if (dbError) {
        throw new Error(`Failed to record consent: ${dbError.message}`)
      }

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error("Error saving digital consent document:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 border-b">
          <DialogTitle>Treatment Consent Form</DialogTitle>
          <DialogDescription>
            Digital consent for {customerName} {treatmentName && `• ${treatmentName}`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            <div className="flex gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
              <Info className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold text-sm">Notice</p>
                <p className="text-xs opacity-90 mt-1">
                  Please read the agreement carefully before signing. A witness (staff) should be present during the signing.
                </p>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg border border-dashed text-sm leading-relaxed overflow-hidden">
              <h3 className="font-bold text-base px-6 py-4 uppercase text-center border-b bg-muted/20">Treatment Consent Agreement</h3>
              <ScrollArea className="h-[200px] px-6 py-4">
                <div className="whitespace-pre-wrap">
                  {DEFAULT_CONSENT_TEXT}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Customer Signature</h4>
              <SignaturePad 
                onCapture={handleCapture} 
                disabled={isSaving}
                className="border-primary/20 p-1 rounded-xl bg-primary/5"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive font-medium p-3 rounded-md bg-destructive/10 border border-destructive/20">
                {error}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-muted/10 flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
