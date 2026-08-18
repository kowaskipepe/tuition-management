"use server"

import { revalidatePath } from "next/cache"
import { InvoiceStatus, PaymentMethod, StudentStatus } from "@prisma/client"
import { differenceInDays, startOfDay } from "date-fns"
import { z } from "zod"
import {
  type ActionState,
  successState,
  errorState,
  zodErrorsToFieldErrors,
} from "@/lib/actions"
import { parseLkrToCents } from "@/lib/currency"
import { prisma } from "@/lib/db"

const periodMonthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Period must be in YYYY-MM format")

const amountSchema = z.union([
  z.string().min(1, "Amount is required").transform(parseLkrToCents),
  z.number().transform((value) => Math.round(value)),
])

const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  amount: amountSchema.refine((cents) => cents > 0, "Amount must be greater than zero"),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().optional(),
  receiptNo: z.string().optional(),
  paidAt: z.coerce.date(),
})

const updateInvoiceDiscountSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  discount: amountSchema.refine((cents) => cents >= 0, "Discount cannot be negative"),
})

const invoiceIdSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
})

export interface AgingBuckets {
  "0-30": number
  "31-60": number
  "61-90": number
  "90+": number
}

const revalidateFeePaths = () => {
  revalidatePath("/fees")
  revalidatePath("/")
}

const buildDueDate = (periodMonth: string, dueDayOfMonth: number): Date => {
  const [year, month] = periodMonth.split("-").map((part) => Number.parseInt(part, 10))
  const lastDay = new Date(year, month, 0).getDate()
  const day = Math.min(dueDayOfMonth, lastDay)
  return new Date(year, month - 1, day)
}

export const recalculateInvoiceStatus = async (invoiceId: string): Promise<InvoiceStatus> => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  })

  if (!invoice) {
    throw new Error("Invoice not found")
  }

  if (invoice.status === InvoiceStatus.WAIVED) {
    return InvoiceStatus.WAIVED
  }

  const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0)
  const netDue = Math.max(invoice.amountDue - invoice.discount, 0)

  let status: InvoiceStatus = InvoiceStatus.UNPAID
  if (totalPaid >= netDue) {
    status = InvoiceStatus.PAID
  } else if (totalPaid > 0) {
    status = InvoiceStatus.PARTIAL
  }

  if (status !== invoice.status) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status },
    })
  }

  return status
}

export const generateMonthlyInvoices = async (
  periodMonth: string
): Promise<ActionState<{ created: number }>> => {
  const parsed = z
    .object({ periodMonth: periodMonthSchema })
    .safeParse({ periodMonth })

  if (!parsed.success) {
    return errorState(
      "Invalid period month",
      zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors)
    )
  }

  try {
    const settings = await prisma.settings.findFirst()
    const dueDayOfMonth = settings?.dueDayOfMonth ?? 5
    const dueDate = buildDueDate(parsed.data.periodMonth, dueDayOfMonth)

    const activeStudents = await prisma.student.findMany({
      where: { status: StudentStatus.ACTIVE },
      select: { id: true, monthlyFee: true },
    })

    const existingInvoices = await prisma.invoice.findMany({
      where: { periodMonth: parsed.data.periodMonth },
      select: { studentId: true },
    })

    const existingStudentIds = new Set(existingInvoices.map((invoice) => invoice.studentId))

    const invoicesToCreate = activeStudents
      .filter((student) => !existingStudentIds.has(student.id))
      .map((student) => ({
        studentId: student.id,
        periodMonth: parsed.data.periodMonth,
        amountDue: student.monthlyFee,
        dueDate,
        discount: 0,
        status: InvoiceStatus.UNPAID,
      }))

    if (invoicesToCreate.length === 0) {
      revalidateFeePaths()
      return successState("All active students already have invoices for this period", { created: 0 })
    }

    const result = await prisma.invoice.createMany({
      data: invoicesToCreate,
    })

    revalidateFeePaths()
    return successState(`Created ${result.count} invoice${result.count === 1 ? "" : "s"}`, {
      created: result.count,
    })
  } catch {
    return errorState("Failed to generate monthly invoices")
  }
}

export const recordPayment = async (
  invoiceId: string,
  amount: string | number,
  method: PaymentMethod,
  reference?: string,
  receiptNo?: string,
  paidAt?: Date
): Promise<ActionState<{ paymentId: string }>> => {
  const parsed = recordPaymentSchema.safeParse({
    invoiceId,
    amount,
    method,
    reference,
    receiptNo,
    paidAt: paidAt ?? new Date(),
  })

  if (!parsed.success) {
    return errorState(
      "Invalid payment details",
      zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors)
    )
  }

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parsed.data.invoiceId },
    })

    if (!invoice) {
      return errorState("Invoice not found")
    }

    if (invoice.status === InvoiceStatus.WAIVED) {
      return errorState("Cannot record payment for a waived invoice")
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId: parsed.data.invoiceId,
        amount: parsed.data.amount,
        method: parsed.data.method,
        reference: parsed.data.reference,
        receiptNo: parsed.data.receiptNo,
        paidAt: parsed.data.paidAt,
      },
    })

    await recalculateInvoiceStatus(parsed.data.invoiceId)

    revalidateFeePaths()
    return successState("Payment recorded successfully", { paymentId: payment.id })
  } catch {
    return errorState("Failed to record payment")
  }
}

export const updateInvoiceDiscount = async (
  invoiceId: string,
  discount: string | number
): Promise<ActionState> => {
  const parsed = updateInvoiceDiscountSchema.safeParse({ invoiceId, discount })

  if (!parsed.success) {
    return errorState(
      "Invalid discount",
      zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors)
    )
  }

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parsed.data.invoiceId },
    })

    if (!invoice) {
      return errorState("Invoice not found")
    }

    if (invoice.status === InvoiceStatus.WAIVED) {
      return errorState("Cannot update discount for a waived invoice")
    }

    if (parsed.data.discount > invoice.amountDue) {
      return errorState("Discount cannot exceed the invoice amount")
    }

    await prisma.invoice.update({
      where: { id: parsed.data.invoiceId },
      data: { discount: parsed.data.discount },
    })

    await recalculateInvoiceStatus(parsed.data.invoiceId)

    revalidateFeePaths()
    return successState("Invoice discount updated successfully")
  } catch {
    return errorState("Failed to update invoice discount")
  }
}

export const waiveInvoice = async (invoiceId: string): Promise<ActionState> => {
  const parsed = invoiceIdSchema.safeParse({ invoiceId })

  if (!parsed.success) {
    return errorState(
      "Invalid invoice",
      zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors)
    )
  }

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parsed.data.invoiceId },
    })

    if (!invoice) {
      return errorState("Invoice not found")
    }

    await prisma.invoice.update({
      where: { id: parsed.data.invoiceId },
      data: { status: InvoiceStatus.WAIVED },
    })

    revalidateFeePaths()
    return successState("Invoice waived successfully")
  } catch {
    return errorState("Failed to waive invoice")
  }
}

export const getAgingBuckets = async (): Promise<AgingBuckets> => {
  const today = startOfDay(new Date())

  const invoices = await prisma.invoice.findMany({
    where: {
      status: {
        in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL],
      },
    },
    include: {
      payments: true,
    },
  })

  const buckets: AgingBuckets = {
    "0-30": 0,
    "31-60": 0,
    "61-90": 0,
    "90+": 0,
  }

  for (const invoice of invoices) {
    const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0)
    const outstanding = Math.max(invoice.amountDue - invoice.discount - totalPaid, 0)

    if (outstanding === 0) {
      continue
    }

    const daysOverdue = Math.max(differenceInDays(today, startOfDay(invoice.dueDate)), 0)

    if (daysOverdue <= 30) {
      buckets["0-30"] += outstanding
    } else if (daysOverdue <= 60) {
      buckets["31-60"] += outstanding
    } else if (daysOverdue <= 90) {
      buckets["61-90"] += outstanding
    } else {
      buckets["90+"] += outstanding
    }
  }

  return buckets
}
