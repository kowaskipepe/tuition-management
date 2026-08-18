import { startOfDay, endOfDay, addDays, isBefore } from "date-fns"
import { prisma } from "@/lib/db"
import { getAgingBuckets } from "@/actions/fees"

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>

export const getDashboardData = async () => {
  const today = new Date()
  const todayStart = startOfDay(today)
  const todayEnd = endOfDay(today)

  const [
    activeStudents,
    invoices,
    todaySessions,
    overdueInvoices,
    unmarkedSessions,
    ungradedAssignments,
    recentAssessments,
    settings,
  ] = await Promise.all([
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.invoice.findMany({
      include: { payments: true, student: { select: { name: true } } },
    }),
    prisma.classSession.findMany({
      where: { date: { gte: todayStart, lte: todayEnd } },
      include: {
        classGroup: { include: { subject: true } },
        attendances: true,
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.invoice.findMany({
      where: {
        status: { in: ["UNPAID", "PARTIAL"] },
        dueDate: { lt: todayStart },
      },
      include: { student: { select: { name: true, id: true } } },
      take: 10,
    }),
    prisma.classSession.findMany({
      where: {
        status: "COMPLETED",
        date: { gte: addDays(todayStart, -14) },
      },
      include: {
        classGroup: { select: { name: true } },
        attendances: true,
      },
    }),
    prisma.submission.findMany({
      where: { status: { in: ["SUBMITTED", "PENDING"] } },
      include: {
        student: { select: { name: true } },
        assignment: { select: { title: true, dueDate: true, id: true } },
      },
      take: 10,
    }),
    prisma.assessment.findMany({
      include: {
        classGroup: { select: { name: true } },
        questions: { include: { scores: true } },
        results: true,
      },
      orderBy: { testDate: "desc" },
      take: 5,
    }),
    prisma.settings.findFirst(),
  ])

  let totalBilled = 0
  let totalCollected = 0
  const monthlyData: Record<string, { billed: number; collected: number }> = {}

  for (const invoice of invoices) {
    const netDue = invoice.amountDue - invoice.discount
    totalBilled += netDue
    const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
    totalCollected += paid

    if (!monthlyData[invoice.periodMonth]) {
      monthlyData[invoice.periodMonth] = { billed: 0, collected: 0 }
    }
    monthlyData[invoice.periodMonth].billed += netDue
    monthlyData[invoice.periodMonth].collected += paid
  }

  const totalOutstanding = totalBilled - totalCollected
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0

  const monthlyChart = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, data]) => ({
      month,
      billed: data.billed / 100,
      collected: data.collected / 100,
    }))

  const agingBuckets = await getAgingBuckets()

  const sessionsNeedingAttendance = await Promise.all(
    unmarkedSessions.map(async (session) => {
      const enrollmentCount = await prisma.enrollment.count({
        where: { classGroupId: session.classGroupId },
      })
      if (session.attendances.length < enrollmentCount && enrollmentCount > 0) {
        return {
          id: session.id,
          className: session.classGroup.name,
          date: session.date,
        }
      }
      return null
    })
  )

  const pendingAttendance = sessionsNeedingAttendance.filter(Boolean) as {
    id: string
    className: string
    date: Date
  }[]

  const pendingGrading = ungradedAssignments.filter(
    (s) => s.status === "SUBMITTED" || (s.status === "PENDING" && isBefore(s.assignment.dueDate, today))
  )

  const missingTestMarks = recentAssessments.filter((assessment) => {
    const enrolledCount = assessment.results.length
    const fullyScored = assessment.results.filter((r) => r.totalMarks > 0).length
    return enrolledCount > 0 && fullyScored < enrolledCount
  })

  const pendingActions = [
    ...overdueInvoices.map((inv) => ({
      type: "overdue_invoice" as const,
      title: `${inv.student.name} — overdue fee`,
      href: `/students/${inv.student.id}`,
      date: inv.dueDate,
    })),
    ...pendingAttendance.map((s) => ({
      type: "unmarked_attendance" as const,
      title: `${s.className} — attendance not marked`,
      href: `/sessions/${s.id}`,
      date: s.date,
    })),
    ...pendingGrading.map((s) => ({
      type: "ungraded_assignment" as const,
      title: `${s.assignment.title} — ${s.student.name}`,
      href: `/assignments/${s.assignment.id}`,
      date: s.assignment.dueDate,
    })),
    ...missingTestMarks.map((a) => ({
      type: "missing_test_marks" as const,
      title: `${a.title} — marks incomplete`,
      href: `/tests/${a.id}/marks`,
      date: a.testDate,
    })),
  ].slice(0, 15)

  const todayClassesWithEnrollment = await Promise.all(
    todaySessions.map(async (session) => {
      const enrollmentCount = await prisma.enrollment.count({
        where: { classGroupId: session.classGroupId },
      })
      return {
        id: session.id,
        className: session.classGroup.name,
        subject: session.classGroup.subject.name,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        attendanceMarked: session.attendances.length,
        enrollmentCount,
        isTest: session.isTest,
      }
    })
  )

  return {
    kpis: {
      activeStudents,
      totalBilled,
      totalCollected,
      totalOutstanding,
      collectionRate,
    },
    monthlyChart,
    agingBuckets,
    todayClasses: todayClassesWithEnrollment,
    pendingActions,
    teacherName: settings?.teacherName ?? "Tuition Master",
  }
}
