"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { InvoiceStatus } from "@prisma/client"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { INVOICE_STATUS_LABELS } from "@/lib/constants"
import { periodMonthLabel } from "@/lib/dates"

type FeesFiltersProps = {
  periodMonths: string[]
}

export const FeesFilters = ({ periodMonths }: FeesFiltersProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()

  const status = searchParams.get("status") ?? "all"
  const periodMonth = searchParams.get("periodMonth") ?? "all"

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/fees?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="status-filter">Status</Label>
        <Select
          value={status}
          onValueChange={(value) => handleFilterChange("status", value ?? "all")}
        >
          <SelectTrigger id="status-filter" className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {INVOICE_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="period-filter">Period</Label>
        <Select
          value={periodMonth}
          onValueChange={(value) => handleFilterChange("periodMonth", value ?? "all")}
        >
          <SelectTrigger id="period-filter" className="w-44">
            <SelectValue placeholder="All periods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All periods</SelectItem>
            {periodMonths.map((month) => (
              <SelectItem key={month} value={month}>
                {periodMonthLabel(month)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
