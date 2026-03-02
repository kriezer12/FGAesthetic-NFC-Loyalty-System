import { Loader2, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CardFooter } from "@/components/ui/card"

type RegisterCardFooterActionsProps = {
  isLoading: boolean
  onCancel: () => void
}

export function RegisterCardFooterActions({ isLoading, onCancel }: RegisterCardFooterActionsProps) {
  return (
    <CardFooter className="flex gap-2 sticky bottom-0 bg-background pt-4">
      <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
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
    </CardFooter>
  )
}
