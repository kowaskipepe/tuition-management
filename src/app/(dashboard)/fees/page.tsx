import Link from "next/link"
import { Suspense } from "react"
import { InvoiceStatus } from "@prisma/client"
import { FileText, TrendingUp, Wallet, AlertCircle, Percent } from "lucide-react"
import { getAgingBuckets } from "@/actions/fees"
import { AgingChart } from "@/components/fees/aging-chart"
import { FeesFilters } from "@/components/fees/fees-filters"
import { InvoiceActions } from "@/components/fees/invoice-actions"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { INVOICE_STATUS_LABELS } from "@/lib/constants"
import { formatLkr } from "@/lib/currency"
import { formatDate, periodMonthLabel } from "@/lib/dates"
import { prisma } from "@/lib/db"

type FeesPageProps = {
  searchParams: Promise<{ status?: string; periodMonth?: string }>
}

const getInvoiceOutstanding = (
  amountDue: number,
  discount: number,
  payments: { amount: number }[]
): number => {
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  return Math.max(amountDue - discount - totalPaid, 0)
}

export default async function FeesPage({ searchParams }: FeesPageProps) {
  const { status, periodMonth } = await searchParams

  const where: {
    status?: InvoiceStatus
    periodMonth?: string
  } = {}

  if (status && status !== "all" && Object.keys(INVOICE_STATUS_LABELS).includes(status)) {
    where.status = status as InvoiceStatus
  }

  if (periodMonth && periodMonth !== "all") {
    where.periodMonth = periodMonth
  }

  const [invoices, periodMonths, agingBuckets] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        student: { select: { id: true, name: true } },
        payments: { select: { amount: true } },
      },
      orderBy: [{ periodMonth: "desc" }, { student: { name: "asc" } }],
    }),
    prisma.invoice.findMany({
      select: { periodMonth: true },
      distinct: ["periodMonth"],
      orderBy: { periodMonth: "desc" },
    }),
    getAgingBuckets(),
  ])

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.amountDue, 0)
  const totalCollected = invoices.reduce(
    (sum, inv) => sum + inv.payments.reduce((pSum, p) => pSum + p.amount, 0),
    0
  )
  const totalOutstanding = invoices
    .filter((inv) => inv.status !== InvoiceStatus.WAIVED)
    .reduce(
      (sum, inv) => sum + getInvoiceOutstanding(inv.amountDue, inv.discount, inv.payments),
      0
    )
  const collectionRate =
    totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0

  const kpis = [
    {
      title: "Total Billed",
      value: formatLkr(totalBilled),
      icon: Wallet,
    },
    {
      title: "Collected",
      value: formatLkr(totalCollected),
      icon: TrendingUp,
    },
    {
      title: "Outstanding",
      value: formatLkr(totalOutstanding),
      icon: AlertCircle,
    },
    {
      title: "Collection Rate",
      value: `${collectionRate}%`,
      icon: Percent,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees"
        description="Track invoices, payments, and outstanding balances"
        actions={
          <Button render={<Link href="/fees/run" aria-label="Generate monthly invoices" />}>
            <FileText />
            Generate Invoices
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <kpi.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AgingChart buckets={agingBuckets} />

      <div className="space-y-4">
        <Suspense fallback={<Skeleton className="h-10 w-full max-w-md" />}>
          <FeesFilters periodMonths={periodMonths.map((p) => p.periodMonth)} />
        </Suspense>

        {invoices.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-10" />}
            title="No invoices found"
            description="Generate monthly invoices or adjust your filters."
            action={
              <Button render={<Link href="/fees/run" />}>
                <FileText />
                Generate Invoices
              </Button>
            }
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Billed</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const outstanding = getInvoiceOutstanding(
                      invoice.amountDue,
                      invoice.discount,
                      invoice.payments
                    )

                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.student.name}</TableCell>
                        <TableCell>{periodMonthLabel(invoice.periodMonth)}</TableCell>
                        <TableCell>{formatLkr(invoice.amountDue)}</TableCell>
                        <TableCell>{formatLkr(invoice.discount)}</TableCell>
                        <TableCell>{formatLkr(outstanding)}</TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={invoice.status}
                            label={INVOICE_STATUS_LABELS[invoice.status]}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <InvoiceActions
                            invoiceId={invoice.id}
                            studentName={invoice.student.name}
                            amountDue={invoice.amountDue}
                            discount={invoice.discount}
                            status={invoice.status}
                            outstanding={outstanding}
                          />
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
    </div>
  )
}
