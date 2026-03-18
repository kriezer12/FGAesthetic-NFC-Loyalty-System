/**
 * Combobox Component
 * ==================
 *
 * A searchable dropdown select component built with shadcn/ui Command and Popover.
 * Supports custom rendering, filtering, and keyboard navigation.
 */

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ComboboxOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  /** Width of the popover content (default: match trigger width) */
  popoverWidth?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  className,
  disabled = false,
  popoverWidth,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0 overflow-hidden", popoverWidth ?? "w-[--radix-popover-trigger-width]")}
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <ScrollArea className="h-64">
            <CommandList className="max-h-none overflow-visible">
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    disabled={option.disabled}
                    onSelect={() => {
                      onValueChange?.(option.value)
                      setOpen(false)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      {option.description && (
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
