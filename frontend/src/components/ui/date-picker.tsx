/**
 * Date Picker Component
 * =====================
 *
 * A date picker using the shadcn Calendar component with popover.
 */

import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  className?: string
  disabled?: boolean
  placeholder?: string
  /** Allow users to type a date manually into a text field. */
  enableManualInput?: boolean
  /** Use dropdown month/year selectors instead of label-only navigation. */
  captionLayout?: "label" | "dropdown"
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DatePicker({
  value,
  onChange,
  className,
  disabled = false,
  placeholder = "Pick a date",
  enableManualInput = false,
  captionLayout = "dropdown",
}: DatePickerProps) {
  const formattedValue = value ? formatDate(value) : ""

  const handleInputChange = (raw: string) => {
    const parsed = new Date(raw)
    if (!isNaN(parsed.getTime())) {
      onChange?.(parsed)
    } else if (raw.trim() === "") {
      onChange?.(undefined)
    }
  }

  return (
    <Popover>
      <div className={cn("relative", className)}>
        {enableManualInput ? (
          <>
            <Input
              disabled={disabled}
              className={cn(
                "w-full pr-10",
                !value && "text-muted-foreground"
              )}
              placeholder={placeholder}
              value={formattedValue}
              onChange={(e) => handleInputChange(e.target.value)}
            />
            <PopoverTrigger asChild>
              <button
                type="button"
                className="absolute inset-y-0 right-2 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={disabled}
              >
                <CalendarIcon className="h-4 w-4" />
              </button>
            </PopoverTrigger>
          </>
        ) : (
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-start text-left font-normal",
                !value && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? formattedValue : <span>{placeholder}</span>}
            </Button>
          </PopoverTrigger>
        )}
      </div>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          captionLayout={captionLayout}
        />
      </PopoverContent>
    </Popover>
  )
}
