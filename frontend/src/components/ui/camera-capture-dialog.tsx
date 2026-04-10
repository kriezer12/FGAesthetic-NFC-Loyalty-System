import React, { useRef, useState, useEffect, useCallback } from "react"
import { Camera, X, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface CameraCaptureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCapture: (file: File) => void
}

export function CameraCaptureDialog({
  open,
  onOpenChange,
  onCapture,
}: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string>("")

  const startCamera = useCallback(async () => {
    setError("")
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      setError("Could not access camera. Please check permissions.")
    }
  }, [stream])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }, [stream])

  useEffect(() => {
    if (open) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [open]) // Intentionally not including startCamera/stopCamera to avoid loops

  const captureImage = () => {
    if (!videoRef.current) return

    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        })
        onCapture(file)
        onOpenChange(false)
      }
    }, "image/jpeg", 0.9)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Capture Photo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error ? (
            <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-md border text-center p-4">
              <p className="text-sm text-red-500 mb-2">{error}</p>
              <Button onClick={startCamera} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" /> Try Again
              </Button>
            </div>
          ) : (
            <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={captureImage} disabled={!!error || !stream}>
              <Camera className="w-4 h-4 mr-2" /> Capture
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
