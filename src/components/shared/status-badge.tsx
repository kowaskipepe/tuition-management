import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { StudentStatus, InvoiceStatus, AttendanceStatus, SubmissionStatus } from "@prisma/client"

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  PAUSED: "secondary",
  LEFT: "outline",
  UNPAID: "destructive",
  PARTIAL: "secondary",
  PAID: "default",
  WAIVED: "outline",
  PRESENT: "default",
  ABSENT: "destructive",
  LATE: "secondary",
  EXCUSED: "outline",
  PENDING: "secondary",
  SUBMITTED: "default",
  GRADED: "default",
  MISSING: "destructive",
  SCHEDULED: "secondary",
  COMPLETED: "default",
  CANCELLED: "outline",
}

type StatusBadgeProps = {
  status: StudentStatus | InvoiceStatus | AttendanceStatus | SubmissionStatus | string
  label?: string
  className?: string
}

export const StatusBadge = ({ status, label, className }: StatusBadgeProps) => {
  const variant = STATUS_VARIANTS[status] ?? "outline"
  const displayLabel = label ?? status.charAt(0) + status.slice(1).toLowerCase()

  return (
    <Badge variant={variant} className={cn("capitalize", className)}>
      {displayLabel}
    </Badge>
  )
}
