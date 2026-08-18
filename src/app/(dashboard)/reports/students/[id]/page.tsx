import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { MarksTrendChart } from "@/components/charts/dashboard-charts"
import { formatLkr } from "@/lib/currency"
import { formatDate, periodMonthLabel } from "@/lib/dates"
import { calculatePercentage } from "@/lib/constants"
import { ArrowLeft } from "lucide-react"
import { PrintReportButton } from "@/components/reports/print-report-button"

type Props = {
  params: Promise<{ id: string }>
}

export default async function StudentReportPage({ params }: Props) {
  const { id } = await params

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: { classGroup: { include: { subject: true } } },
      },
      attendances: {
        include: { session: { include: { classGroup: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      invoices: {
        include: { payments: true },
        orderBy: { periodMonth: "desc" },
      },
      results: {
        include: { assessment: true },
        orderBy: { assessment: { testDate: "asc" } },
      },
      submissions: {
        include: { assignment: true },
        orderBy: { assignment: { dueDate: "desc" } },
        take: 20,
      },
    },
  })

  if (!student) notFound()

  const totalAttendance = student.attendances.length
  const presentCount = student.attendances.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE"
  ).length
  const attendancePct =
    totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0

  const marksTrend = student.results.map((r) => ({
    label: r.assessment.title.slice(0, 15),
    percentage: calculatePercentage(r.totalMarks, r.assessment.maxMarks),
  }))

  const totalFeesDue = student.invoices.reduce(
    (sum, inv) => sum + inv.amountDue - inv.discount,
    0
  )
  const totalPaid = student.invoices.reduce(
    (sum, inv) => sum + inv.payments.reduce((s, p) => s + p.amount, 0),
    0
  )

  const topicScores = await prisma.questionScore.findMany({
    where: { studentId: id },
    include: {
      question: {
        include: { topic: true, assessment: true },
      },
    },
  })

  const topicMastery: Record<string, { obtained: number; total: number }> = {}
  for (const score of topicScores) {
    const topicName = score.question.topic?.title ?? "General"
    if (!topicMastery[topicName]) {
      topicMastery[topicName] = { obtained: 0, total: 0 }
    }
    topicMastery[topicName].obtained += score.marks
    topicMastery[topicName].total += score.question.maxMarks
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <PageHeader
        title={`Progress Report — ${student.name}`}
        description={`Grade ${student.grade} · Generated ${formatDate(new Date())}`}
        actions={
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" render={<Link href="/reports" />}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <PrintReportButton />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{attendancePct}%</p>
            <p className="text-sm text-muted-foreground">
              {presentCount} of {totalAttendance} sessions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fee Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatLkr(totalPaid)}</p>
            <p className="text-sm text-muted-foreground">
              of {formatLkr(totalFeesDue)} paid
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tests Taken
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{student.results.length}</p>
            <p className="text-sm text-muted-foreground">assessments completed</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Marks Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <MarksTrendChart data={marksTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Topic Mastery</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(topicMastery).length === 0 ? (
              <p className="text-sm text-muted-foreground">No topic data yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(topicMastery).map(([topic, scores]) => {
                  const pct = calculatePercentage(scores.obtained, scores.total)
                  return (
                    <div key={topic}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{topic}</span>
                        <span className="font-medium">{pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {student.invoices.map((invoice) => {
              const paid = invoice.payments.reduce((s, p) => s + p.amount, 0)
              return (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{periodMonthLabel(invoice.periodMonth)}</p>
                    <p className="text-sm text-muted-foreground">
                      Due {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-medium">{formatLkr(paid)}</p>
                      <p className="text-sm text-muted-foreground">
                        of {formatLkr(invoice.amountDue - invoice.discount)}
                      </p>
                    </div>
                    <StatusBadge status={invoice.status} />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enrolled Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {student.enrollments.map((e) => (
              <span
                key={e.id}
                className="rounded-full border px-3 py-1 text-sm"
              >
                {e.classGroup.name} ({e.classGroup.subject.name})
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
