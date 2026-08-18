"use client"

import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

export const PrintReportButton = () => {
  const handlePrint = () => {
    window.print()
  }

  return (
    <Button variant="outline" onClick={handlePrint} aria-label="Print report">
      <Printer className="size-4" />
      Print
    </Button>
  )
}
