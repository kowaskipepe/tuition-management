import Link from "next/link"
import { BookOpen, Users, CalendarClock } from "lucide-react"
import { prisma } from "@/lib/db"
import { formatLkr } from "@/lib/currency"
import { PageHeader } from "@/components/layout/page-header"
import { ClassFormDialog } from "@/components/classes/class-form-dialog"
import { SubjectManager } from "@/components/classes/subject-manager"
import { EmptyState } from "@/components/shared/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function ClassesPage() {
  const [classGroups, subjects] = await Promise.all([
    prisma.classGroup.findMany({
      include: {
        subject: { select: { name: true } },
        _count: {
          select: {
            enrollments: true,
            scheduleSlots: true,
          },
        },
      },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
    }),
    prisma.subject.findMany({
      include: {
        _count: { select: { classGroups: true } },
      },
      orderBy: { name: "asc" },
    }),
  ])

  const subjectOptions = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        description="Manage class groups, subjects, schedules, and enrollments."
        actions={<ClassFormDialog subjects={subjectOptions} />}
      />

      <SubjectManager subjects={subjects} />

      {classGroups.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-10" />}
          title="No classes yet"
          description="Create your first class group to start enrolling students and scheduling sessions."
          action={<ClassFormDialog subjects={subjectOptions} />}
        />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classGroups.map((classGroup) => (
                  <TableRow key={classGroup.id}>
                    <TableCell>
                      <Link
                        href={`/classes/${classGroup.id}`}
                        className="flex items-center gap-2 font-medium hover:underline"
                      >
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: classGroup.colour }}
                          aria-hidden
                        />
                        {classGroup.name}
                      </Link>
                    </TableCell>
                    <TableCell>{classGroup.subject.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">Grade {classGroup.grade}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="size-3.5 text-muted-foreground" />
                        {classGroup._count.enrollments}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="size-3.5 text-muted-foreground" />
                        {classGroup._count.scheduleSlots} slot
                        {classGroup._count.scheduleSlots === 1 ? "" : "s"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {classGroup.defaultMonthlyFee != null
                        ? formatLkr(classGroup.defaultMonthlyFee)
                        : "—"}
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
