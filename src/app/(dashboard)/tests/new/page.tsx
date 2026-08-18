import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { CreateAssessmentForm } from "@/components/tests/create-assessment-form"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/db"

export default async function NewTestPage() {
  const classGroups = await prisma.classGroup.findMany({
    include: { subject: true },
    orderBy: [{ subject: { name: "asc" } }, { name: "asc" }],
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" render={<Link href="/tests" aria-label="Back to tests" />}>
          <ArrowLeft />
        </Button>
        <PageHeader
          title="New Assessment"
          description="Create a test with multiple questions"
        />
      </div>

      <CreateAssessmentForm
        classGroups={classGroups.map((group) => ({
          id: group.id,
          name: group.name,
          grade: group.grade,
          subjectName: group.subject.name,
          colour: group.colour,
        }))}
      />
    </div>
  )
}
