import Link from "next/link"
import { notFound } from "next/navigation"
import { SubmissionStatus } from "@prisma/client"
import { ArrowLeft } from "lucide-react"
import { SubmissionsTable } from "@/components/assignments/submissions-table"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/dates"
import { prisma } from "@/lib/db"

export default async function AssignmentDetailPage({
  params,
}: PageProps<"/assignments/[id]">) {
  const { id } = await params

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      classGroup: {
        include: {
          subject: true,
          enrollments: {
            include: { student: true },
            orderBy: { student: { name: "asc" } },
          },
        },
      },
      submissions: true,
    },
  })

  if (!assignment) {
    notFound()
  }

  const submissionMap = new Map(
    assignment.submissions.map((submission) => [submission.studentId, submission])
  )

  const rows = assignment.classGroup.enrollments.map((enrollment) => {
    const submission = submissionMap.get(enrollment.studentId)

    return {
      studentId: enrollment.studentId,
      studentName: enrollment.student.name,
      status: submission?.status ?? SubmissionStatus.PENDING,
      marks: submission?.marks ?? null,
    }
  })

  const gradedCount = rows.filter((row) => row.status === SubmissionStatus.GRADED).length
  const submittedCount = rows.filter(
    (row) =>
      row.status === SubmissionStatus.SUBMITTED ||
      row.status === SubmissionStatus.GRADED
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" render={<Link href="/assignments" aria-label="Back to assignments" />}>
          <ArrowLeft />
        </Button>
        <PageHeader
          title={assignment.title}
          description={assignment.description ?? undefined}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Class</CardDescription>
            <CardTitle className="flex items-center gap-2 text-base">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: assignment.classGroup.colour }}
              />
              {assignment.classGroup.name}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Subject</CardDescription>
            <CardTitle className="text-base">
              <Badge variant="outline">{assignment.classGroup.subject.name}</Badge>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Due Date</CardDescription>
            <CardTitle className="text-base">{formatDate(assignment.dueDate)}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Progress</CardDescription>
            <CardTitle className="text-base">
              {submittedCount}/{rows.length} submitted · {gradedCount} graded
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Submissions</CardTitle>
          <CardDescription>
            Update status and marks for each student (max {assignment.maxMarks} marks)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubmissionsTable
            assignmentId={assignment.id}
            maxMarks={assignment.maxMarks}
            rows={rows}
          />
        </CardContent>
      </Card>
    </div>
  )
}
