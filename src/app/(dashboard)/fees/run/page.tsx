import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { GenerateInvoicesForm } from "@/components/fees/generate-invoices-form"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function RunInvoicesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate Invoices"
        description="Create monthly fee invoices for all active students"
        actions={
          <Button variant="outline" render={<Link href="/fees" aria-label="Back to fees" />}>
            <ArrowLeft />
            Back to Fees
          </Button>
        }
      />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Monthly Invoice Run</CardTitle>
          <CardDescription>
            Select a billing period and generate invoices based on each student&apos;s monthly fee.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GenerateInvoicesForm />
        </CardContent>
      </Card>
    </div>
  )
}
