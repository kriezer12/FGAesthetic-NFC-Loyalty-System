import { useState } from "react"
import { Megaphone, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface AnnouncementCreatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AnnouncementCreatorModal({ open, onOpenChange }: AnnouncementCreatorModalProps) {
  const { userProfile } = useAuth()
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")

  if (userProfile?.role !== "super_admin") return null

  const handleBroadcast = async () => {
    if (!message.trim()) return
    
    setIsSubmitting(true)
    setStatus("idle")
    
    try {
      const { error } = await supabase
        .from("announcements")
        .insert([
          {
            message: message.trim(),
            role_target: "staff",
            created_by: userProfile?.id,
          },
        ])

      if (error) {
        console.error("Broadcast error:", error)
        setStatus("error")
      } else {
        setStatus("success")
        setMessage("")
        setTimeout(() => {
          setStatus("idle")
          onOpenChange(false)
        }, 1500)
      }
    } catch (e) {
      setStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur-xl border-primary/20">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Global Announcement</DialogTitle>
              <DialogDescription className="text-xs">
                Broadcast a message immediately to all staff members.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="relative group">
            <Textarea
              placeholder="Type your message here..."
              className="min-h-[150px] resize-none border-primary/10 focus:border-primary/40 bg-primary/5 transition-all text-sm leading-relaxed"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
            />
            <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground font-medium bg-background/50 px-2 py-1 rounded border border-border backdrop-blur-sm">
              {message.length} characters
            </div>
          </div>

          {status === "success" && (
            <div className="text-center py-2 bg-green-500/10 border border-green-500/20 rounded-lg animate-in fade-in zoom-in-95">
              <p className="text-xs font-bold text-green-600">Broadcast successful!</p>
            </div>
          )}
          
          {status === "error" && (
            <div className="text-center py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs font-bold text-red-600">Failed to broadcast. Please try again.</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="font-semibold text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleBroadcast}
            disabled={isSubmitting || !message.trim()}
            className="gap-2 h-10 px-6 font-bold text-xs"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Broadcast Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
