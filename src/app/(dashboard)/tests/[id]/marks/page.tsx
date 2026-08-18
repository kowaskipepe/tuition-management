import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { MarksGrid } from "@/components/tests/marks-grid"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/dates"
import { prisma } from "@/lib/db"

export default async function TestMarksPage({
  params,
}: PageProps<"/tests/[id]/marks">) {
  const { id } = await params

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      classGroup: {
        include: {
          subject: true,
          enrollments: {
            include: { student: true },
            orderBy: { student: { name: "asc" } },
          },
        },
      },
      questions: {
        orderBy: { number: "asc" },
        include: { scores: true },
      },
      results: true,
    },
  })

  if (!assessment) {
    notFound()
  }

  const initialScores: Record<string, Record<string, number>> = {}
  for (const question of assessment.questions) {
    for (const score of question.scores) {
      if (!initialScores[score.studentId]) {
        initialScores[score.studentId] = {}
      }
      initialScores[score.studentId][question.id] = score.marks
    }
  }

  const resultsMap: Record<string, { totalMarks: number; grade: string | null }> = {}
  for (const result of assessment.results) {
    resultsMap[result.studentId] = {
      totalMarks: result.totalMarks,
      grade: result.grade,
    }
  }

  const students = assessment.classGroup.enrollments.map((enrollment) => ({
    id: enrollment.student.id,
    name: enrollment.student.name,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" render={<Link href="/tests" aria-label="Back to tests" />}>
          <ArrowLeft />
        </Button>
        <PageHeader
          title={assessment.title}
          description={`Marks entry · ${assessment.classGroup.name}`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Class</CardDescription>
            <CardTitle className="flex items-center gap-2 text-base">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: assessment.classGroup.colour }}
              />
              {assessment.classGroup.name}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Subject</CardDescription>
            <CardTitle className="text-base">
              <Badge variant="outline">{assessment.classGroup.subject.name}</Badge>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Test Date</CardDescription>
            <CardTitle className="text-base">{formatDate(assessment.testDate)}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Max Marks</CardDescription>
            <CardTitle className="text-base">
              {assessment.maxMarks} ({assessment.questions.length} questions)
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per-Question Marks</CardTitle>
          <CardDescription>
            Enter marks for each student and question. Totals and grades are calculated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MarksGrid
            assessmentId={assessment.id}
            assessmentMaxMarks={assessment.maxMarks}
            questions={assessment.questions.map((question) => ({
              id: question.id,
              number: question.number,
              text: question.text,
              maxMarks: question.maxMarks,
            }))}
            students={students}
            initialScores={initialScores}
            results={resultsMap}
          />
        </CardContent>
      </Card>
    </div>
  )
}
