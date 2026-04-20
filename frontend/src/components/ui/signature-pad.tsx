import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SignaturePadProps {
  onCapture: (blob: Blob) => void
  onClear?: () => void
  disabled?: boolean
  className?: string
}

export function SignaturePad({ onCapture, onClear, disabled, className }: SignaturePadProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = React.useState(false)
  const [isEmpty, setIsEmpty] = React.useState(true)

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return
    setIsDrawing(true)
    draw(e)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) ctx.beginPath()
    }
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    let x, y

    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }

    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.strokeStyle = "black"

    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsEmpty(false)
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setIsEmpty(true)
        if (onClear) onClear()
      }
    }
  }

  const handleCapture = () => {
    const canvas = canvasRef.current
    if (canvas && !isEmpty) {
      // Create a temporary canvas to add white background if needed, 
      // or just export as is (transparent if nothing drawn, but we checked isEmpty)
      canvas.toBlob((blob) => {
        if (blob) onCapture(blob)
      }, "image/webp", 0.9)
    }
  }

  // Handle window resize to keep canvas scale correct
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (rect) {
        canvas.width = rect.width
        canvas.height = 200 // Fixed height for signature
      }
    }
  }, [])

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative border rounded-lg bg-white overflow-hidden touch-none h-[200px]">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
          className="w-full h-full cursor-crosshair"
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/30 text-sm italic">
            Sign here
          </div>
        )}
      </div>
      <div className="flex justify-between items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clear}
          disabled={isEmpty || disabled}
        >
          Clear
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleCapture}
          disabled={isEmpty || disabled}
        >
          Confirm Signature
        </Button>
      </div>
    </div>
  )
}
