import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { SessionDetailPanel } from "@/components/sessions/session-detail-panel"
import { PageHeader } from "@/components/layout/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { ButtonLink } from "@/components/ui/button-link"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate, formatTime } from "@/lib/dates"
import { prisma } from "@/lib/db"

type SessionPageProps = {
  params: Promise<{ id: string }>
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id } = await params

  const session = await prisma.classSession.findUnique({
    where: { id },
    include: {
      classGroup: {
        include: {
          subject: { select: { name: true } },
          enrollments: {
            include: {
              student: { select: { id: true, name: true } },
            },
            orderBy: { student: { name: "asc" } },
          },
        },
      },
      attendances: {
        select: { studentId: true, status: true },
      },
      topics: {
        select: { topicId: true },
      },
    },
  })

  if (!session) {
    notFound()
  }

  const attendanceMap = new Map(
    session.attendances.map((a) => [a.studentId, a.status])
  )

  const students = session.classGroup.enrollments.map((enrollment) => ({
    id: enrollment.student.id,
    name: enrollment.student.name,
    attendanceStatus: attendanceMap.get(enrollment.student.id) ?? null,
  }))

  const topics = await prisma.topic.findMany({
    where: {
      subjectId: session.classGroup.subjectId,
      grade: session.classGroup.grade,
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, title: true, sortOrder: true },
  })

  const linkedTopicIds = session.topics.map((t) => t.topicId)

  return (
    <div className="space-y-6">
      <PageHeader
        title={session.classGroup.name}
        description={`${session.classGroup.subject.name} · Grade ${session.classGroup.grade}`}
        actions={
          <ButtonLink variant="outline" href="/schedule" aria-label="Back to schedule">
            <ArrowLeft />
            Back to Schedule
          </ButtonLink>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 pt-6">
          <div>
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-medium">{formatDate(session.date)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Time</p>
            <p className="font-medium">
              {formatTime(session.startTime)} – {formatTime(session.endTime)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <StatusBadge status={session.status} />
          </div>
          {session.isTest && (
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <StatusBadge status="SCHEDULED" label="Test" />
            </div>
          )}
        </CardContent>
      </Card>

      <SessionDetailPanel
        sessionId={session.id}
        homeworkNote={session.homeworkNote}
        isTest={session.isTest}
        students={students}
        topics={topics}
        linkedTopicIds={linkedTopicIds}
      />
    </div>
  )
}
