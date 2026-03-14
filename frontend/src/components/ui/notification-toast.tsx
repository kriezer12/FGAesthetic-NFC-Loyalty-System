import * as React from "react"
import { cn } from "@/lib/utils"
import { X, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface NotificationToastProps {
  id: string
  title: string
  message: string
  onClose: (id: string) => void
  onAutoDismiss?: (id: string) => void
  type?: "info" | "warning" | "success"
}

export function NotificationToast({
  id,
  title,
  message,
  onClose,
  onAutoDismiss,
  type = "info",
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 10)
    
    // Play sound
    try {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3")
      audio.volume = 0.5
      audio.play().catch(err => console.warn("Audio playback blocked by browser:", err))
    } catch (err) {
      console.error("Failed to play notification sound:", err)
    }

    return () => clearTimeout(timer)
  }, [])

  const handleClose = React.useCallback(() => {
    setIsVisible(false)
    setTimeout(() => onClose(id), 300) // Wait for animation out
  }, [id, onClose])

  const handleAutoDismiss = React.useCallback(() => {
    setIsVisible(false)
    setTimeout(() => {
      if (onAutoDismiss) {
        onAutoDismiss(id)
      } else {
        onClose(id)
      }
    }, 300)
  }, [id, onClose, onAutoDismiss])

  React.useEffect(() => {
    // Auto-dismiss after 20 seconds
    const timer = setTimeout(() => {
      handleAutoDismiss()
    }, 20000)

    return () => clearTimeout(timer)
  }, [handleAutoDismiss])

  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 transition-all duration-300 ease-in-out transform",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        type === "warning" ? "border-l-4 border-yellow-500" : "border-l-4 border-primary"
      )}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {type === "warning" ? (
              <Clock className="h-6 w-6 text-yellow-500" aria-hidden="true" />
            ) : (
              <Calendar className="h-6 w-6 text-primary" aria-hidden="true" />
            )}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-gray-900">{title}</p>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <Button
              variant="ghost"
              size="icon-xs"
              className="inline-flex text-gray-400 hover:text-gray-500"
              onClick={handleClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
