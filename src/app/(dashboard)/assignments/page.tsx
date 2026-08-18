import Link from "next/link"
import { ClipboardList } from "lucide-react"
import { SubmissionStatus } from "@prisma/client"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/dates"
import { prisma } from "@/lib/db"

const getSubmissionStats = (
  submissions: { status: SubmissionStatus }[],
  enrolledCount: number
) => {
  const graded = submissions.filter((s) => s.status === SubmissionStatus.GRADED).length
  const submitted = submissions.filter(
    (s) => s.status === SubmissionStatus.SUBMITTED || s.status === SubmissionStatus.GRADED
  ).length
  const pending = submissions.filter((s) => s.status === SubmissionStatus.PENDING).length
  const missing = submissions.filter((s) => s.status === SubmissionStatus.MISSING).length
  const total = Math.max(submissions.length, enrolledCount)

  return { graded, submitted, pending, missing, total }
}

export default async function AssignmentsPage() {
  const assignments = await prisma.assignment.findMany({
    include: {
      classGroup: {
        include: { subject: true },
      },
      submissions: {
        select: { status: true },
      },
      _count: {
        select: { submissions: true },
      },
    },
    orderBy: { dueDate: "desc" },
  })

  const classEnrollmentCounts = await prisma.enrollment.groupBy({
    by: ["classGroupId"],
    _count: { studentId: true },
  })
  const enrollmentMap = new Map(
    classEnrollmentCounts.map((entry) => [entry.classGroupId, entry._count.studentId])
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        description="Track homework and submission progress across classes"
      />

      {assignments.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-10" />}
          title="No assignments yet"
          description="Create assignments from a class session or add them here when available."
        />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Max Marks</TableHead>
                  <TableHead>Submissions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => {
                  const enrolledCount = enrollmentMap.get(assignment.classGroupId) ?? 0
                  const stats = getSubmissionStats(assignment.submissions, enrolledCount)
                  const isOverdue = new Date(assignment.dueDate) < new Date()

                  return (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <Link
                          href={`/assignments/${assignment.id}`}
                          className="font-medium hover:underline"
                        >
                          {assignment.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: assignment.classGroup.colour }}
                          />
                          <span>{assignment.classGroup.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {assignment.classGroup.subject.name}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{formatDate(assignment.dueDate)}</span>
                          {isOverdue && (
                            <StatusBadge status="MISSING" label="Overdue" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{assignment.maxMarks}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-sm">
                          <span>
                            {stats.submitted}/{stats.total} submitted
                          </span>
                          <span className="text-muted-foreground">
                            {stats.graded} graded · {stats.pending} pending
                            {stats.missing > 0 && ` · ${stats.missing} missing`}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
