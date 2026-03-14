import { useState, useRef, useEffect } from "react"
import { Bell, X, Trash2, Calendar, Clock } from "lucide-react"
import { useMissedNotifications } from "@/contexts/missed-notifications-context"
import { Button } from "@/components/ui/button"

export function NavbarNotificationBell() {
  const { missedNotifications, removeMissedNotification, clearAllMissedNotifications } =
    useMissedNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const count = missedNotifications.length

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <>
      <style>{`
        @keyframes bellShake {
          0% { transform: rotate(0deg); }
          15% { transform: rotate(12deg); }
          30% { transform: rotate(-10deg); }
          45% { transform: rotate(8deg); }
          60% { transform: rotate(-6deg); }
          75% { transform: rotate(3deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes badgePop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes dropdownSlideIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes itemSlideIn {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .bell-shake {
          animation: bellShake 0.6s ease-in-out;
        }
        .badge-pop {
          animation: badgePop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .dropdown-animate {
          animation: dropdownSlideIn 0.2s ease-out forwards;
        }
        .notification-item-animate {
          animation: itemSlideIn 0.25s ease-out forwards;
        }
      `}</style>

      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`relative flex items-center justify-center h-9 w-9 rounded-lg transition-all duration-200 ${
            count > 0
              ? "text-primary hover:bg-primary/10"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
          aria-label={`Notifications${count > 0 ? ` (${count} missed)` : ""}`}
        >
          <Bell
            className={`h-5 w-5 ${count > 0 ? "bell-shake" : ""}`}
            key={count} // Re-trigger animation when count changes
          />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center badge-pop">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-40 animate-ping" />
              <span className="relative inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
                {count > 99 ? "99+" : count}
              </span>
            </span>
          )}
        </button>

        {isOpen && (
          <div
            ref={dropdownRef}
            className="dropdown-animate absolute right-0 top-full mt-2 w-80 max-h-[400px] overflow-hidden rounded-xl border bg-background/95 backdrop-blur-xl shadow-2xl z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Missed Notifications</span>
                {count > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold">
                    {count}
                  </span>
                )}
              </div>
              {count > 0 && (
                <button
                  onClick={() => {
                    clearAllMissedNotifications()
                    setIsOpen(false)
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-md hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear all
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto max-h-[340px]">
              {count === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Bell className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No missed notifications</p>
                </div>
              ) : (
                <div className="divide-y">
                  {missedNotifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      className="notification-item-animate group flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {notification.type === "warning" ? (
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-yellow-500/15">
                            <Clock className="h-4 w-4 text-yellow-600" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/15">
                            <Calendar className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {formatTime(notification.timestamp)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeMissedNotification(notification.id)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
                        aria-label="Dismiss notification"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
