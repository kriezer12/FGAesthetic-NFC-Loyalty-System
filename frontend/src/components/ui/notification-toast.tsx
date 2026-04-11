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
      audio.volume = 0.3
      audio.play().catch(err => console.warn("Audio playback blocked by browser:", err))
    } catch (err) {
      console.error("Failed to play notification sound:", err)
    }

    return () => clearTimeout(timer)
  }, [])

  const handleClose = React.useCallback(() => {
    setIsVisible(false)
    setTimeout(() => onClose(id), 300)
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
    const timer = setTimeout(() => {
      handleAutoDismiss()
    }, 15000) // 15 seconds

    return () => clearTimeout(timer)
  }, [handleAutoDismiss])

  return (
    <div
      className={cn(
        "pointer-events-auto w-[380px] overflow-hidden rounded-xl bg-background/95 backdrop-blur-md shadow-2xl ring-1 ring-border transition-all duration-300 ease-in-out transform",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 scale-95",
        type === "warning" ? "border-l-4 border-yellow-500" : "border-l-4 border-primary"
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {type === "warning" ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-3">
              {message}
            </p>
          </div>
          <div className="flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={handleClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
