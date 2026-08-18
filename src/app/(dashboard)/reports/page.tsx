import Link from "next/link"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { FileText, Users } from "lucide-react"

export default async function ReportsPage() {
  const students = await prisma.student.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, grade: true },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate and view student progress reports."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Student Progress Reports
            </CardTitle>
            <CardDescription>
              Printable reports with attendance, marks, fees, and topic mastery
            </CardDescription>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <EmptyState
                icon={<Users className="size-8" />}
                title="No active students"
                description="Add students to generate progress reports."
              />
            ) : (
              <div className="space-y-2">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">Grade {student.grade}</p>
                    </div>
                    <Button variant="outline" size="sm" render={<Link href={`/reports/students/${student.id}`} />}>
                      View Report
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
