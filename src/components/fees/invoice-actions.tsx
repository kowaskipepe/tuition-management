"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { InvoiceStatus, PaymentMethod } from "@prisma/client"
import { toast } from "sonner"
import { Banknote, MoreHorizontal, Percent, Ban } from "lucide-react"
import { recordPayment, updateInvoiceDiscount, waiveInvoice } from "@/actions/fees"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatLkr } from "@/lib/currency"

type InvoiceActionsProps = {
  invoiceId: string
  studentName: string
  amountDue: number
  discount: number
  status: InvoiceStatus
  outstanding: number
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "BANK", label: "Bank Transfer" },
  { value: "ONLINE", label: "Online" },
]

export const InvoiceActions = ({
  invoiceId,
  studentName,
  amountDue,
  discount,
  status,
  outstanding,
}: InvoiceActionsProps) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [discountOpen, setDiscountOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("CASH")
  const [reference, setReference] = useState("")
  const [receiptNo, setReceiptNo] = useState("")
  const [discountAmount, setDiscountAmount] = useState("")

  const isWaived = status === InvoiceStatus.WAIVED
  const isPaid = status === InvoiceStatus.PAID

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh()
    })
  }

  const handleRecordPayment = async () => {
    const result = await recordPayment(invoiceId, amount, method, reference || undefined, receiptNo || undefined)
    if (result.success) {
      toast.success(result.message)
      setPaymentOpen(false)
      setAmount("")
      setReference("")
      setReceiptNo("")
      handleRefresh()
    } else {
      toast.error(result.message)
    }
  }

  const handleUpdateDiscount = async () => {
    const result = await updateInvoiceDiscount(invoiceId, discountAmount)
    if (result.success) {
      toast.success(result.message)
      setDiscountOpen(false)
      setDiscountAmount("")
      handleRefresh()
    } else {
      toast.error(result.message)
    }
  }

  const handleWaive = async () => {
    const result = await waiveInvoice(invoiceId)
    if (result.success) {
      toast.success(result.message)
      handleRefresh()
    } else {
      toast.error(result.message)
    }
  }

  if (isWaived) {
    return null
  }

  return (
    <div className="flex items-center gap-1">
      {!isPaid && outstanding > 0 && (
        <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
          <DialogTrigger
            render={
              <Button variant="outline" size="sm" aria-label={`Record payment for ${studentName}`}>
                <Banknote />
                Pay
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                {studentName} — outstanding {formatLkr(outstanding)}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor={`amount-${invoiceId}`}>Amount (LKR)</Label>
                <Input
                  id={`amount-${invoiceId}`}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={(outstanding / 100).toString()}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`method-${invoiceId}`}>Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                  <SelectTrigger id={`method-${invoiceId}`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`reference-${invoiceId}`}>Reference (optional)</Label>
                <Input
                  id={`reference-${invoiceId}`}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`receipt-${invoiceId}`}>Receipt No. (optional)</Label>
                <Input
                  id={`receipt-${invoiceId}`}
                  value={receiptNo}
                  onChange={(e) => setReceiptNo(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleRecordPayment}
                disabled={isPending || !amount}
                aria-label="Confirm payment"
              >
                Record Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="More invoice actions">
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              setDiscountAmount((discount / 100).toString())
              setDiscountOpen(true)
            }}
          >
            <Percent />
            Apply Discount
          </DropdownMenuItem>
          {!isPaid && (
            <DropdownMenuItem variant="destructive" onClick={handleWaive}>
              <Ban />
              Waive Invoice
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={discountOpen} onOpenChange={setDiscountOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
            <DialogDescription>
              {studentName} — billed {formatLkr(amountDue)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor={`discount-${invoiceId}`}>Discount (LKR)</Label>
            <Input
              id={`discount-${invoiceId}`}
              type="number"
              min="0"
              step="0.01"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleUpdateDiscount}
              disabled={isPending || !discountAmount}
              aria-label="Confirm discount"
            >
              Update Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
