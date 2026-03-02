import { History, Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

type CustomerPointsActionsProps = {
  isUpdating: boolean
  currentPoints: number
  showHistory: boolean
  onRedeem: () => void
  onAdd: () => void
  onToggleHistory: () => void
}

export function CustomerPointsActions({
  isUpdating,
  currentPoints,
  showHistory,
  onRedeem,
  onAdd,
  onToggleHistory,
}: CustomerPointsActionsProps) {
  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onRedeem}
          disabled={isUpdating || currentPoints < 10}
        >
          <Minus className="h-4 w-4 mr-2" />
          Redeem 10
        </Button>
        <Button
          className="flex-1"
          onClick={onAdd}
          disabled={isUpdating}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add 10
        </Button>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={onToggleHistory}
      >
        <History className="h-4 w-4 mr-2" />
        {showHistory ? "Hide" : "View"} Check-in History
      </Button>
    </>
  )
}
