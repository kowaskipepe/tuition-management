import Link from "next/link"
import { notFound } from "next/navigation"
import {
  AttendanceStatus,
  type Invoice,
  type Payment,
  type Attendance,
  type ClassSession,
  type ClassGroup,
} from "@prisma/client"
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  Printer,
  Wallet,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ATTENDANCE_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  STUDENT_STATUS_LABELS,
  calculatePercentage,
} from "@/lib/constants"
import { formatLkr } from "@/lib/currency"
import { formatDate, periodMonthLabel } from "@/lib/dates"
import { prisma } from "@/lib/db"
import { cn } from "@/lib/utils"

type StudentDetailPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

type InvoiceWithPayments = Invoice & { payments: Payment[] }

type AttendanceWithSession = Attendance & {
  session: ClassSession & { classGroup: ClassGroup }
}

const TABS = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "fees", label: "Fees", icon: Wallet },
  { id: "attendance", label: "Attendance", icon: Calendar },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "tests", label: "Tests", icon: FileText },
] as const

type TabId = (typeof TABS)[number]["id"]

const ATTENDED_STATUSES: AttendanceStatus[] = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.LATE,
  AttendanceStatus.EXCUSED,
]

const getAttendancePercentage = (records: AttendanceWithSession[]) => {
  if (records.length === 0) return 0
  const attended = records.filter((record) => ATTENDED_STATUSES.includes(record.status)).length
  return calculatePercentage(attended, records.length)
}

const getInvoicePaidTotal = (invoice: InvoiceWithPayments) =>
  invoice.payments.reduce((sum, payment) => sum + payment.amount, 0)

const DetailField = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 font-medium">{value || "—"}</dd>
  </div>
)

export default async function StudentDetailPage({ params, searchParams }: StudentDetailPageProps) {
  const { id } = await params
  const { tab: tabParam } = await searchParams
  const tab: TabId = TABS.some((item) => item.id === tabParam) ? (tabParam as TabId) : "overview"

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: {
          classGroup: {
            include: { subject: true },
          },
        },
        orderBy: { enrolledAt: "desc" },
      },
      invoices: {
        include: { payments: { orderBy: { paidAt: "desc" } } },
        orderBy: { periodMonth: "desc" },
      },
      attendances: {
        include: {
          session: {
            include: { classGroup: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      submissions: {
        include: {
          assignment: {
            include: { classGroup: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      results: {
        include: {
          assessment: {
            include: { classGroup: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!student) {
    notFound()
  }

  const attendancePercentage = getAttendancePercentage(student.attendances)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/students" aria-label="Back to students" />}>
          <ArrowLeft />
          Back
        </Button>
      </div>

      <PageHeader
        title={student.name}
        description={`Grade ${student.grade}${student.school ? ` · ${student.school}` : ""}`}
        actions={
          <StatusBadge
            status={student.status}
            label={STUDENT_STATUS_LABELS[student.status]}
          />
        }
      />

      <nav aria-label="Student sections" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        {TABS.map((item) => {
          const Icon = item.icon
          const isActive = tab === item.id
          return (
            <Link
              key={item.id}
              href={`/students/${id}?tab=${item.id}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
              <CardDescription>Contact details and fee configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Name" value={student.name} />
                <DetailField label="Grade" value={`Grade ${student.grade}`} />
                <DetailField label="Guardian" value={student.guardianName} />
                <DetailField label="Guardian Phone" value={student.guardianPhone} />
                <DetailField label="Phone" value={student.phone} />
                <DetailField label="School" value={student.school} />
                <DetailField label="Monthly Fee" value={formatLkr(student.monthlyFee)} />
                <DetailField label="Joined" value={formatDate(student.joinedAt)} />
                <div className="sm:col-span-2">
                  <DetailField label="Notes" value={student.notes} />
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enrolled Classes</CardTitle>
              <CardDescription>
                {student.enrollments.length === 0
                  ? "Not enrolled in any classes"
                  : `${student.enrollments.length} class${student.enrollments.length === 1 ? "" : "es"}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {student.enrollments.length === 0 ? (
                <EmptyState
                  title="No enrollments"
                  description="This student is not enrolled in any classes yet."
                  className="border-0 p-6"
                />
              ) : (
                <ul className="space-y-3">
                  {student.enrollments.map((enrollment) => (
                    <li
                      key={enrollment.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: enrollment.classGroup.colour }}
                          aria-hidden="true"
                        />
                        <div>
                          <p className="font-medium">{enrollment.classGroup.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {enrollment.classGroup.subject.name} · Grade {enrollment.classGroup.grade}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Since {formatDate(enrollment.enrolledAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "fees" && (
        <Card>
          <CardHeader>
            <CardTitle>Fee Invoices</CardTitle>
            <CardDescription>Monthly invoices and payment history</CardDescription>
          </CardHeader>
          <CardContent>
            {student.invoices.length === 0 ? (
              <EmptyState
                title="No invoices"
                description="No fee invoices have been generated for this student yet."
                className="border-0 p-6"
              />
            ) : (
              <div className="space-y-6">
                {student.invoices.map((invoice) => {
                  const paidTotal = getInvoicePaidTotal(invoice)
                  const netDue = invoice.amountDue - invoice.discount
                  const outstanding = Math.max(netDue - paidTotal, 0)

                  return (
                    <div key={invoice.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">{periodMonthLabel(invoice.periodMonth)}</p>
                          <p className="text-sm text-muted-foreground">
                            Due {formatDate(invoice.dueDate)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span>Billed: {formatLkr(invoice.amountDue)}</span>
                          {invoice.discount > 0 && (
                            <span>Discount: {formatLkr(invoice.discount)}</span>
                          )}
                          <span>Paid: {formatLkr(paidTotal)}</span>
                          {outstanding > 0 && (
                            <span className="font-medium text-destructive">
                              Outstanding: {formatLkr(outstanding)}
                            </span>
                          )}
                          <StatusBadge
                            status={invoice.status}
                            label={INVOICE_STATUS_LABELS[invoice.status]}
                          />
                        </div>
                      </div>

                      {invoice.payments.length > 0 && (
                        <>
                          <Separator className="my-4" />
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Amount</TableHead>
                                  <TableHead>Method</TableHead>
                                  <TableHead>Reference</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {invoice.payments.map((payment) => (
                                  <TableRow key={payment.id}>
                                    <TableCell>{formatDate(payment.paidAt)}</TableCell>
                                    <TableCell>{formatLkr(payment.amount)}</TableCell>
                                    <TableCell className="capitalize">
                                      {payment.method.toLowerCase()}
                                    </TableCell>
                                    <TableCell>{payment.reference ?? payment.receiptNo ?? "—"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "attendance" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Card className="flex-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Attendance Rate</CardTitle>
                <CardDescription>Based on the last {student.attendances.length} sessions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall</span>
                  <span className="text-2xl font-bold">{attendancePercentage}%</span>
                </div>
                <Progress value={attendancePercentage} aria-label="Attendance percentage" />
              </CardContent>
            </Card>

            <Button
              variant="outline"
              render={
                <Link
                  href={`/reports/students/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open printable attendance report"
                />
              }
            >
              <Printer />
              Printable Report
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Attendance</CardTitle>
              <CardDescription>Latest session attendance records</CardDescription>
            </CardHeader>
            <CardContent>
              {student.attendances.length === 0 ? (
                <EmptyState
                  title="No attendance records"
                  description="Attendance will appear here once sessions are marked."
                  className="border-0 p-6"
                />
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {student.attendances.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{formatDate(record.session.date)}</TableCell>
                          <TableCell>{record.session.classGroup.name}</TableCell>
                          <TableCell>
                            <StatusBadge
                              status={record.status}
                              label={ATTENDANCE_STATUS_LABELS[record.status]}
                            />
                          </TableCell>
                          <TableCell>{record.note ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "assignments" && (
        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
            <CardDescription>Homework submissions and grades</CardDescription>
          </CardHeader>
          <CardContent>
            {student.submissions.length === 0 ? (
              <EmptyState
                title="No assignments"
                description="Assignment submissions will appear here once assigned."
                className="border-0 p-6"
              />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Marks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">{submission.assignment.title}</TableCell>
                        <TableCell>{submission.assignment.classGroup.name}</TableCell>
                        <TableCell>{formatDate(submission.assignment.dueDate)}</TableCell>
                        <TableCell>
                          <StatusBadge status={submission.status} />
                        </TableCell>
                        <TableCell>
                          {submission.marks != null
                            ? `${submission.marks} / ${submission.assignment.maxMarks}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "tests" && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>Assessment scores and grades</CardDescription>
          </CardHeader>
          <CardContent>
            {student.results.length === 0 ? (
              <EmptyState
                title="No test results"
                description="Test results will appear here once assessments are graded."
                className="border-0 p-6"
              />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assessment</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Test Date</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.results.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.assessment.title}</TableCell>
                        <TableCell>{result.assessment.classGroup.name}</TableCell>
                        <TableCell>{formatDate(result.assessment.testDate)}</TableCell>
                        <TableCell>
                          {result.totalMarks} / {result.assessment.maxMarks}
                        </TableCell>
                        <TableCell>{result.grade ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
