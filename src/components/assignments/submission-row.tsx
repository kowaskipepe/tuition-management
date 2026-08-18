"use client"

import { useState, useTransition } from "react"
import { SubmissionStatus } from "@prisma/client"
import { toast } from "sonner"
import { updateSubmission } from "@/actions/assignments"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TableCell, TableRow } from "@/components/ui/table"

const SUBMISSION_STATUSES = [
  SubmissionStatus.PENDING,
  SubmissionStatus.SUBMITTED,
  SubmissionStatus.GRADED,
  SubmissionStatus.MISSING,
] as const

interface SubmissionRowProps {
  assignmentId: string
  studentId: string
  studentName: string
  initialStatus: SubmissionStatus
  initialMarks: number | null
  maxMarks: number
}

export function SubmissionRow({
  assignmentId,
  studentId,
  studentName,
  initialStatus,
  initialMarks,
  maxMarks,
}: SubmissionRowProps) {
  const [status, setStatus] = useState(initialStatus)
  const [marks, setMarks] = useState(initialMarks?.toString() ?? "")
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    const parsedMarks = marks.trim() === "" ? null : Number.parseInt(marks, 10)

    if (parsedMarks != null && (Number.isNaN(parsedMarks) || parsedMarks < 0)) {
      toast.error("Enter a valid marks value")
      return
    }

    startTransition(async () => {
      const result = await updateSubmission(
        assignmentId,
        studentId,
        status,
        parsedMarks
      )

      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{studentName}</TableCell>
      <TableCell>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as SubmissionStatus)}
          disabled={isPending}
        >
          <SelectTrigger className="w-[140px]" aria-label={`Status for ${studentName}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUBMISSION_STATUSES.map((option) => (
              <SelectItem key={option} value={option}>
                <StatusBadge status={option} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          max={maxMarks}
          value={marks}
          onChange={(event) => setMarks(event.target.value)}
          placeholder={`0–${maxMarks}`}
          className="w-24"
          aria-label={`Marks for ${studentName}`}
          disabled={isPending}
        />
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          aria-label={`Save submission for ${studentName}`}
        >
          {isPending ? "Saving…" : "Save"}
        </Button>
      </TableCell>
    </TableRow>
  )
}
