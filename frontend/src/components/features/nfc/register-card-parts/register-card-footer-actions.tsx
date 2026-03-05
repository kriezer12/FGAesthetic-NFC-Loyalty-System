import { Loader2, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"

type RegisterCardFooterActionsProps = {
  isLoading: boolean
  onCancel: () => void
}

export function RegisterCardFooterActions({ isLoading, onCancel }: RegisterCardFooterActionsProps) {
  return (
    <div className="flex gap-3 px-6 py-4 border-t bg-muted/30">
      <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isLoading}>
        Cancel
      </Button>
      <Button type="submit" className="flex-1" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Registering...
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4 mr-2" />
            Register Client
          </>
        )}
      </Button>
    </div>
  )
}
