import Link from "next/link"
import {
  Users,
  Wallet,
  TrendingUp,
  AlertCircle,
  Calendar,
  ClipboardList,
  Clock,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/shared/status-badge"
import { MonthlyChart, AgingChart } from "@/components/charts/dashboard-charts"
import { formatLkr } from "@/lib/currency"
import { formatDate, formatTime } from "@/lib/dates"
import { getDashboardData } from "@/lib/queries/dashboard"

const PENDING_ICONS = {
  overdue_invoice: Wallet,
  unmarked_attendance: Calendar,
  ungraded_assignment: ClipboardList,
  missing_test_marks: AlertCircle,
} as const

export default async function DashboardPage() {
  const data = await getDashboardData()

  const agingChartData = [
    { bucket: "0-30", amount: data.agingBuckets["0-30"] },
    { bucket: "31-60", amount: data.agingBuckets["31-60"] },
    { bucket: "61-90", amount: data.agingBuckets["61-90"] },
    { bucket: "90+", amount: data.agingBuckets["90+"] },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${data.teacherName}`}
        description="Your tuition centre at a glance."
        actions={
          <Button render={<Link href="/fees/run" />}>
            Generate Monthly Invoices
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="size-4" />
              Active Students
            </CardDescription>
            <CardTitle className="text-3xl">{data.kpis.activeStudents}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wallet className="size-4" />
              Total Billed
            </CardDescription>
            <CardTitle className="text-3xl">{formatLkr(data.kpis.totalBilled)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="size-4" />
              Collected
            </CardDescription>
            <CardTitle className="text-3xl text-green-600 dark:text-green-400">
              {formatLkr(data.kpis.totalCollected)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertCircle className="size-4" />
              Outstanding ({data.kpis.collectionRate}% collected)
            </CardDescription>
            <CardTitle className="text-3xl text-destructive">
              {formatLkr(data.kpis.totalOutstanding)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fee Collection Trend</CardTitle>
            <CardDescription>Billed vs collected by month</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyChart data={data.monthlyChart} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Aging</CardTitle>
            <CardDescription>Overdue invoice buckets</CardDescription>
          </CardHeader>
          <CardContent>
            <AgingChart data={agingChartData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-5" />
              Today&apos;s Classes
            </CardTitle>
            <CardDescription>{formatDate(new Date())}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.todayClasses.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No classes scheduled for today
              </p>
            ) : (
              <div className="space-y-3">
                {data.todayClasses.map((session) => (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{session.className}</p>
                      <p className="text-sm text-muted-foreground">{session.subject}</p>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <div>
                        <p className="text-sm font-medium">
                          {formatTime(session.startTime)} – {formatTime(session.endTime)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.attendanceMarked}/{session.enrollmentCount} marked
                        </p>
                      </div>
                      {session.isTest && <Badge variant="secondary">Test</Badge>}
                      <StatusBadge status={session.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              Pending Actions
            </CardTitle>
            <CardDescription>Items needing your attention</CardDescription>
          </CardHeader>
          <CardContent>
            {data.pendingActions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                All caught up! No pending actions.
              </p>
            ) : (
              <div className="space-y-2">
                {data.pendingActions.map((action, i) => {
                  const Icon = PENDING_ICONS[action.type]
                  return (
                    <Link
                      key={`${action.type}-${i}`}
                      href={action.href}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{action.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(action.date)}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
