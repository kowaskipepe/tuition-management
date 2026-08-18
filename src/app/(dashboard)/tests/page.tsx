import Link from "next/link"
import { FileText, Plus } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/dates"
import { prisma } from "@/lib/db"

export default async function TestsPage() {
  const assessments = await prisma.assessment.findMany({
    include: {
      classGroup: {
        include: { subject: true },
      },
      _count: {
        select: { questions: true, results: true },
      },
    },
    orderBy: { testDate: "desc" },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tests"
        description="Manage assessments and enter per-question marks"
        actions={
          <Button render={<Link href="/tests/new" aria-label="Create new assessment" />}>
            <Plus />
            New Assessment
          </Button>
        }
      />

      {assessments.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-10" />}
          title="No assessments yet"
          description="Create your first test to start recording marks per question."
          action={
            <Button render={<Link href="/tests/new" />}>
              <Plus />
              Create Assessment
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Test Date</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Max Marks</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell className="font-medium">{assessment.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: assessment.classGroup.colour }}
                        />
                        <span>{assessment.classGroup.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {assessment.classGroup.subject.name}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(assessment.testDate)}</TableCell>
                    <TableCell>{assessment._count.questions}</TableCell>
                    <TableCell>{assessment.maxMarks}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <Link
                            href={`/tests/${assessment.id}/marks`}
                            aria-label={`Enter marks for ${assessment.title}`}
                          />
                        }
                      >
                        Enter Marks
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
