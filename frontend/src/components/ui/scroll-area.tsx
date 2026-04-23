import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  onWheel,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  const rootRef = React.useRef<HTMLDivElement>(null)

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    onWheel?.(event)
    if (event.defaultPrevented) return

    const target = event.target as HTMLElement | null
    const nearestScrollArea = target?.closest('[data-slot="scroll-area"]')
    if (!nearestScrollArea || nearestScrollArea !== rootRef.current) {
      return
    }

    const viewport = rootRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    )
    if (!viewport) return

    const canScrollY = viewport.scrollHeight > viewport.clientHeight
    const canScrollX = viewport.scrollWidth > viewport.clientWidth
    if (!canScrollY && !canScrollX) return

    const preferVertical = Math.abs(event.deltaY) >= Math.abs(event.deltaX)

    if (canScrollY && (preferVertical || !canScrollX)) {
      viewport.scrollTop += event.deltaY
      return
    }

    if (canScrollX) {
      const delta = event.deltaX || event.deltaY
      viewport.scrollLeft += delta
    }
  }

  return (
    <ScrollAreaPrimitive.Root
      ref={rootRef}
      data-slot="scroll-area"
      className={cn("relative overflow-hidden", className)}
      onWheel={handleWheel}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="h-full w-full rounded-[inherit] overscroll-contain transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-muted-foreground/30"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
