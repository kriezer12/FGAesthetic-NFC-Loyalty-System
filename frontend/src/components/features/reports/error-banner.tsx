import { AlertCircle, X } from "lucide-react"
import { useState } from "react"

interface ErrorBannerProps {
  error: string
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6 flex gap-3 items-start group">
      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-destructive">Failed to load reports</p>
        <p className="text-sm text-destructive/80 mt-1">{error}</p>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive/60 hover:text-destructive p-1 flex-shrink-0"
        aria-label="Dismiss error"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
