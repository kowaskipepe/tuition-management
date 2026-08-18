"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { addWeeks, startOfDay } from "date-fns"
import { toast } from "sonner"
import { CalendarPlus } from "lucide-react"
import { generateSessions } from "@/actions/sessions"
import { Button } from "@/components/ui/button"

type GenerateAllSessionsButtonProps = {
  classGroupIds: string[]
}

export const GenerateAllSessionsButton = ({ classGroupIds }: GenerateAllSessionsButtonProps) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleGenerate = () => {
    if (classGroupIds.length === 0) {
      toast.error("No classes with schedule slots found")
      return
    }

    startTransition(async () => {
      const startDate = startOfDay(new Date())
      const endDate = addWeeks(startDate, 4)

      let totalCreated = 0
      let hasError = false

      for (const classGroupId of classGroupIds) {
        const result = await generateSessions(classGroupId, startDate, endDate)
        if (result.success) {
          totalCreated += result.data?.created ?? 0
        } else {
          hasError = true
          toast.error(result.message)
        }
      }

      if (!hasError || totalCreated > 0) {
        toast.success(`Created ${totalCreated} session${totalCreated === 1 ? "" : "s"} for the next 4 weeks`)
        router.refresh()
      }
    })
  }

  return (
    <Button
      onClick={handleGenerate}
      disabled={isPending || classGroupIds.length === 0}
      aria-label="Generate sessions for the next 4 weeks"
    >
      <CalendarPlus />
      {isPending ? "Generating…" : "Generate Sessions (4 Weeks)"}
    </Button>
  )
}
