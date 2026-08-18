"use client"

import { SubmissionStatus } from "@prisma/client"
import { SubmissionRow } from "@/components/assignments/submission-row"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface StudentSubmission {
  studentId: string
  studentName: string
  status: SubmissionStatus
  marks: number | null
}

interface SubmissionsTableProps {
  assignmentId: string
  maxMarks: number
  rows: StudentSubmission[]
}

export function SubmissionsTable({ assignmentId, maxMarks, rows }: SubmissionsTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No students enrolled in this class yet.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Marks</TableHead>
          <TableHead className="w-[100px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <SubmissionRow
            key={row.studentId}
            assignmentId={assignmentId}
            studentId={row.studentId}
            studentName={row.studentName}
            initialStatus={row.status}
            initialMarks={row.marks}
            maxMarks={maxMarks}
          />
        ))}
      </TableBody>
    </Table>
  )
}
