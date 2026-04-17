import { Bell, X, Trash2, Calendar, Clock } from "lucide-react"
import { useMissedNotifications } from "@/contexts/missed-notifications-context"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"


export function NavbarNotificationBell() {
  const { missedNotifications, removeMissedNotification, clearAllMissedNotifications } =
    useMissedNotifications()
  
  const count = missedNotifications.length


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

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`relative flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${
              count > 0
                ? "text-primary hover:bg-primary/20 focus-visible:bg-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 focus-visible:text-foreground focus-visible:bg-secondary/50"
            }`}
            aria-label={`Notifications${count > 0 ? ` (${count} missed)` : ""}`}
          >
            <Bell
              className={`h-4 w-4 sm:h-5 sm:w-5 ${count > 0 ? "bell-shake" : ""}`}
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
        </PopoverTrigger>

        <PopoverContent 
          align="end" 
          className="w-80 p-0 overflow-hidden rounded-xl bg-background/95 backdrop-blur-xl border border-border shadow-2xl z-55"
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
                type="button"
                onClick={() => {
                  clearAllMissedNotifications()
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive focus-visible:text-destructive transition-colors px-2 py-1 rounded-md hover:bg-destructive/10 focus-visible:bg-destructive/10 outline-none"
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
              <div className="divide-y divide-border/50">
                {missedNotifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    className="notification-item-animate group flex items-start gap-3 px-4 py-3 hover:bg-muted/40 focus-within:bg-muted/40 transition-colors"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {notification.type === "warning" ? (
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-yellow-500/15">
                          <Clock className="h-4 w-4 text-primary" />
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
                      type="button"
                      onClick={() => removeMissedNotification(notification.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted focus-visible:bg-muted outline-none"
                      aria-label="Dismiss notification"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

    </>
  )
}
