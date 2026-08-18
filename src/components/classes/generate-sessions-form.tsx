"use client"

import { useState, useTransition } from "react"
import { CalendarRange } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { generateSessions } from "@/actions/sessions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type GenerateSessionsFormProps = {
  classGroupId: string
}

const todayIso = () => new Date().toISOString().slice(0, 10)

const monthEndIso = () => {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return end.toISOString().slice(0, 10)
}

export const GenerateSessionsForm = ({ classGroupId }: GenerateSessionsFormProps) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [startDate, setStartDate] = useState(todayIso())
  const [endDate, setEndDate] = useState(monthEndIso())

  const handleGenerate = () => {
    if (!startDate || !endDate) {
      toast.error("Select a start and end date")
      return
    }

    startTransition(async () => {
      const result = await generateSessions(classGroupId, startDate, endDate)
      if (result.success) {
        toast.success(result.message)
        router.refresh()
        return
      }
      toast.error(result.message)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarRange className="size-4" />
          Generate Sessions
        </CardTitle>
        <CardDescription>
          Create scheduled sessions from the weekly slots within a date range.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="session-start-date">Start date</Label>
            <Input
              id="session-start-date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="grid flex-1 gap-2">
            <Label htmlFor="session-end-date">End date</Label>
            <Input
              id="session-end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
          <Button onClick={handleGenerate} disabled={isPending}>
            {isPending ? "Generating..." : "Generate Sessions"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
