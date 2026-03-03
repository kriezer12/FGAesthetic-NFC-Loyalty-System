import { useState } from "react"
import * as React from "react"
import {
  Bell,
  CreditCard,
  Palette,
  Shield,
  Store,
  User,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSection?: SettingsSection
}

type SettingsSection =
  | "general"
  | "appearance"
  | "account"
  | "notifications"
  | "loyalty"
  | "security"

interface NavItem {
  id: SettingsSection
  label: string
  icon: React.ElementType
  description: string
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "general",
    label: "General",
    icon: Store,
    description: "Manage your business name, timezone and regional settings.",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    description: "Customise the look and feel of the dashboard.",
  },
  {
    id: "account",
    label: "Account",
    icon: User,
    description: "Update your personal details and preferences.",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Control what alerts and email digests you receive.",
  },
  {
    id: "loyalty",
    label: "Loyalty & Points",
    icon: CreditCard,
    description: "Configure point multipliers, tiers and redemption rules.",
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    description: "Change your password and manage active sessions.",
  },
]

// ---------------------------------------------------------------------------
// Section content placeholders
// ---------------------------------------------------------------------------

function SectionPlaceholder({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <div className="flex flex-col gap-6">
      {/* Section heading */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary">
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div>
          <h3 className="font-semibold text-base leading-none">{item.label}</h3>
          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
        </div>
      </div>

      {/* Placeholder rows */}
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
            <div className="flex flex-col gap-1">
              <div className="h-3.5 w-32 rounded bg-muted animate-pulse" />
              <div className="h-3 w-52 rounded bg-muted/70 animate-pulse" />
            </div>
            <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center italic">
        {item.label} settings coming soon.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function SettingsModal({ open, onOpenChange, initialSection = "general" }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection)

  // Sync to initialSection whenever the modal opens
  React.useEffect(() => {
    if (open) setActiveSection(initialSection)
  }, [open, initialSection])

  const activeItem = NAV_ITEMS.find((n) => n.id === activeSection)!

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full" variant="top-right-centered">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your preferences and account configuration.
          </DialogDescription>
        </DialogHeader>

        {/* Two-column layout: sidebar + content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <nav className="w-44 shrink-0 border-r flex flex-col gap-0.5 p-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = item.id === activeSection
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Content area */}
          <div className="flex-1">
            <SectionPlaceholder item={activeItem} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
