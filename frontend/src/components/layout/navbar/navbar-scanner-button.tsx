import { useNavigate } from "react-router-dom"
import { Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"

export function NavbarScannerButton() {
  const navigate = useNavigate()

  const handleScan = () => {
    navigate("/dashboard/scan")
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleScan}
      className="text-muted-foreground hover:text-foreground"
    >
      <Smartphone className="h-5 w-5" />
      <span className="sr-only">NFC Scanner</span>
    </Button>
  )
}
