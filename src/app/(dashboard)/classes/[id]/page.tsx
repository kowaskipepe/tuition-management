import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { prisma } from "@/lib/db"
import { formatLkr } from "@/lib/currency"
import { formatDate, formatTime } from "@/lib/dates"
import { PageHeader } from "@/components/layout/page-header"
import { ClassFormDialog } from "@/components/classes/class-form-dialog"
import { EnrollmentManager } from "@/components/classes/enrollment-manager"
import { ScheduleSlotsEditor } from "@/components/classes/schedule-slots-editor"
import { GenerateSessionsForm } from "@/components/classes/generate-sessions-form"
import { StatusBadge } from "@/components/shared/status-badge"
import { ButtonLink } from "@/components/ui/button-link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type ClassDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function ClassDetailPage({ params }: ClassDetailPageProps) {
  const { id } = await params

  const classGroup = await prisma.classGroup.findUnique({
    where: { id },
    include: {
      subject: true,
      enrollments: {
        include: {
          student: {
            select: { id: true, name: true, grade: true },
          },
        },
        orderBy: { student: { name: "asc" } },
      },
      scheduleSlots: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
      sessions: {
        orderBy: [{ date: "desc" }, { startTime: "desc" }],
        take: 10,
      },
    },
  })

  if (!classGroup) {
    notFound()
  }

  const [subjects, availableStudents] = await Promise.all([
    prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.student.findMany({
      where: {
        status: "ACTIVE",
        id: {
          notIn: classGroup.enrollments.map((enrollment) => enrollment.studentId),
        },
      },
      select: { id: true, name: true, grade: true },
      orderBy: { name: "asc" },
    }),
  ])

  const enrollments = classGroup.enrollments.map((enrollment) => ({
    enrollmentId: enrollment.id,
    id: enrollment.student.id,
    name: enrollment.student.name,
    grade: enrollment.student.grade,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ButtonLink variant="ghost" size="sm" href="/classes">
          <ArrowLeft className="size-4" data-icon="inline-start" />
          Back to Classes
        </ButtonLink>
      </div>

      <PageHeader
        title={classGroup.name}
        description={`${classGroup.subject.name} · Grade ${classGroup.grade}`}
        actions={
          <ClassFormDialog
            subjects={subjects}
            classGroup={{
              id: classGroup.id,
              name: classGroup.name,
              subjectId: classGroup.subjectId,
              grade: classGroup.grade,
              defaultMonthlyFee: classGroup.defaultMonthlyFee,
              colour: classGroup.colour,
            }}
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Class Info</CardTitle>
          <CardDescription>Overview of this class group.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-sm text-muted-foreground">Subject</dt>
              <dd className="font-medium">{classGroup.subject.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Grade</dt>
              <dd>
                <Badge variant="outline">Grade {classGroup.grade}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Default Monthly Fee</dt>
              <dd className="font-medium">
                {classGroup.defaultMonthlyFee != null
                  ? formatLkr(classGroup.defaultMonthlyFee)
                  : "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Colour</dt>
              <dd className="flex items-center gap-2">
                <span
                  className="size-4 rounded-full border"
                  style={{ backgroundColor: classGroup.colour }}
                  aria-hidden
                />
                <span className="font-mono text-sm">{classGroup.colour}</span>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <EnrollmentManager
          classGroupId={classGroup.id}
          enrollments={enrollments}
          availableStudents={availableStudents}
        />
        <ScheduleSlotsEditor classGroupId={classGroup.id} slots={classGroup.scheduleSlots} />
      </div>

      <GenerateSessionsForm classGroupId={classGroup.id} />

      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
          <CardDescription>
            Latest sessions for this class. Click a row to view session details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {classGroup.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sessions yet. Add schedule slots and generate sessions to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classGroup.sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <Link
                        href={`/sessions/${session.id}`}
                        className="font-medium hover:underline"
                      >
                        {formatDate(session.date)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTime(session.startTime)} – {formatTime(session.endTime)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={session.status} />
                    </TableCell>
                    <TableCell>
                      {session.isTest ? (
                        <Badge variant="secondary">Test</Badge>
                      ) : (
                        <span className="text-muted-foreground">Regular</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
