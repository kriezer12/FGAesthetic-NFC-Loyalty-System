import { AlertTriangle } from "lucide-react"

type CustomerAllergiesAlertProps = {
  allergies?: string | null
}

export function CustomerAllergiesAlert({ allergies }: CustomerAllergiesAlertProps) {
  if (!allergies) {
    return null
  }

  return (
    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-red-800">Allergies</p>
        <p className="text-sm text-red-600">{allergies}</p>
      </div>
    </div>
  )
}
