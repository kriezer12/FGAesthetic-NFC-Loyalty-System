import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DatePickerProps {
  label: string
  value: string
  onChange: (date: string) => void
  required?: boolean
  id?: string
}

function parseManualDate(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const monthNames: { [key: string]: number } = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  }

  // Try MM/DD/YYYY or MM/DD/YY format
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (slashMatch) {
    let month = parseInt(slashMatch[1]) - 1
    const day = parseInt(slashMatch[2])
    let year = parseInt(slashMatch[3])
    
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year
    }
    
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  // Try "Month Day, Year" or "Month Day Year" format
  const monthMatch = trimmed.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/i)
  if (monthMatch) {
    const monthName = monthMatch[1].toLowerCase()
    const monthIndex = monthNames[monthName]
    if (monthIndex !== undefined) {
      const day = parseInt(monthMatch[2])
      const year = parseInt(monthMatch[3])
      if (day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }
  }

  return null
}

export function DatePicker({ label, value, onChange, required = false, id = "date-picker" }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [month, setMonth] = useState(0)
  const [year, setYear] = useState(new Date().getFullYear())
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  const daysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()

  const days = Array.from({ length: daysInMonth(month, year) }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDayOfMonth }, () => null)
  const calendarDays = [...emptyDays, ...days]

  const handleDayClick = (day: number) => {
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(dateString)
    setIsOpen(false)
  }

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    const [y, m, d] = dateString.split("-")
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    setInputValue(input)

    const parsed = parseManualDate(input)
    if (parsed) {
      const [y, m, d] = parsed.split("-")
      setMonth(parseInt(m) - 1)
      setYear(parseInt(y))
      onChange(parsed)
    }
  }

  const handleInputBlur = () => {
    if (inputValue && !value) {
      setInputValue("")
    }
  }

  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split("-")
      setMonth(parseInt(m) - 1)
      setYear(parseInt(y))
      setInputValue(formatDate(value))
    }
  }, [value])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setContainerWidth(inputRef.current.offsetWidth)
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"]
  const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const selectedDate = value ? value.split("-") : null
  const isSelected = (day: number) =>
    selectedDate &&
    day === parseInt(selectedDate[2]) &&
    month === parseInt(selectedDate[1]) - 1 &&
    year === parseInt(selectedDate[0])

  return (
    <div ref={containerRef} className="space-y-1.5 relative">
      <Label htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          placeholder="Select a date or type (11/30/2004 or November 30, 2004)"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onClick={() => setIsOpen(!isOpen)}
          className="bg-background"
          required={required}
        />
        {isOpen && (
          <div 
            className="absolute top-full left-0 mt-2 z-50 bg-card border border-input rounded-md shadow-lg p-4"
            style={{ width: containerWidth || "auto" }}
          >
            <div className="space-y-4">
              {/* Month/Year Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-accent rounded text-foreground transition-colors"
                  type="button"
                >
                  ←
                </button>
                <div className="flex items-center gap-2">
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="px-2 py-1 rounded border border-input bg-background text-sm text-foreground"
                  >
                    {monthNames.map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="px-2 py-1 rounded border border-input bg-background text-sm text-foreground"
                  >
                    {Array.from({ length: 100 }, (_, i) => year - 50 + i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-accent rounded text-foreground transition-colors"
                  type="button"
                >
                  →
                </button>
              </div>

              {/* Day of Week Header */}
              <div className="grid grid-cols-7 gap-1">
                {dayOfWeek.map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => (
                  <button
                    key={index}
                    onClick={() => day && handleDayClick(day)}
                    disabled={!day}
                    className={`
                      aspect-square text-sm rounded font-medium transition-colors
                      ${!day
                        ? "invisible"
                        : isSelected(day)
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "hover:bg-accent text-foreground cursor-pointer"
                      }
                    `}
                    type="button"
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

