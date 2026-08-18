"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileText } from "lucide-react"
import { generateMonthlyInvoices } from "@/actions/fees"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { periodMonthFromDate } from "@/lib/dates"

export const GenerateInvoicesForm = () => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [periodMonth, setPeriodMonth] = useState(periodMonthFromDate(new Date()))

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateMonthlyInvoices(periodMonth)
      if (result.success) {
        toast.success(result.message)
        router.push("/fees")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="flex max-w-md flex-col gap-6">
      <div className="space-y-1.5">
        <Label htmlFor="period-month">Billing Period</Label>
        <Input
          id="period-month"
          type="month"
          value={periodMonth}
          onChange={(e) => setPeriodMonth(e.target.value)}
          aria-label="Select billing period month"
        />
        <p className="text-sm text-muted-foreground">
          Invoices will be created for all active students who do not already have one for this period.
        </p>
      </div>
      <Button
        onClick={handleGenerate}
        disabled={isPending || !periodMonth}
        aria-label="Generate monthly invoices"
      >
        <FileText />
        {isPending ? "Generating…" : "Generate Monthly Invoices"}
      </Button>
    </div>
  )
}
