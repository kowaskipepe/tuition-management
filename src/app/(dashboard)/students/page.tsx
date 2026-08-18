import { Suspense } from "react"
import type { StudentStatus } from "@prisma/client"
import { Users } from "lucide-react"
import { AddStudentButton } from "@/components/students/student-form-dialog"
import { StudentsTable } from "@/components/students/students-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { prisma } from "@/lib/db"

type StudentsPageProps = {
  searchParams: Promise<{ search?: string; status?: string }>
}

const StudentsTableFallback = () => (
  <div className="space-y-4">
    <div className="flex gap-4">
      <Skeleton className="h-8 flex-1" />
      <Skeleton className="h-8 w-40" />
    </div>
    <Skeleton className="h-64 w-full" />
  </div>
)

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const params = await searchParams
  const search = params.search?.trim() ?? ""
  const statusParam = params.status?.toUpperCase() ?? "ALL"
  const validStatuses = ["ALL", "ACTIVE", "PAUSED", "LEFT"] as const
  const status = validStatuses.includes(statusParam as (typeof validStatuses)[number])
    ? statusParam
    : "ALL"

  const students = await prisma.student.findMany({
    where: {
      ...(status !== "ALL" && { status: status as StudentStatus }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { guardianName: { contains: search } },
          { phone: { contains: search } },
          { guardianPhone: { contains: search } },
          { school: { contains: search } },
        ],
      }),
    },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Manage student profiles, fees, and enrollment."
        actions={<AddStudentButton />}
      />

      {students.length === 0 ? (
        <EmptyState
          icon={<Users className="size-10" />}
          title={search || status !== "ALL" ? "No students found" : "No students yet"}
          description={
            search || status !== "ALL"
              ? "Try adjusting your search or filter criteria."
              : "Add your first student to start tracking fees and attendance."
          }
          action={!search && status === "ALL" ? <AddStudentButton /> : undefined}
        />
      ) : (
        <Suspense fallback={<StudentsTableFallback />}>
          <StudentsTable students={students} />
        </Suspense>
      )}
    </div>
  )
}
