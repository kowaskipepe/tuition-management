"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import type { Student } from "@prisma/client"
import { StudentStatus } from "@prisma/client"
import { toast } from "sonner"
import { Archive, MoreHorizontal, Pencil, RotateCcw, Search } from "lucide-react"
import { updateStudentStatus } from "@/actions/students"
import { StudentFormDialog } from "@/components/students/student-form-dialog"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { STUDENT_STATUS_LABELS } from "@/lib/constants"
import { formatLkr } from "@/lib/currency"

type StudentsTableProps = {
  students: Student[]
}

const STATUS_FILTERS = ["ALL", "ACTIVE", "PAUSED", "LEFT"] as const

export const StudentsTable = ({ students }: StudentsTableProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const search = searchParams.get("search") ?? ""
  const status = searchParams.get("status") ?? "ALL"

  const handleSearchChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value.trim()) {
      params.set("search", value)
    } else {
      params.delete("search")
    }
    router.push(`/students?${params.toString()}`)
  }

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "ALL") {
      params.delete("status")
    } else {
      params.set("status", value)
    }
    router.push(`/students?${params.toString()}`)
  }

  const handleEdit = (student: Student) => {
    setEditStudent(student)
    setDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditStudent(null)
    }
  }

  const handleStatusUpdate = (student: Student, newStatus: StudentStatus) => {
    startTransition(async () => {
      const result = await updateStudentStatus(student.id, newStatus)
      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="relative flex-1 space-y-1.5">
            <Label htmlFor="student-search">Search</Label>
            <Search className="pointer-events-none absolute top-8.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              id="student-search"
              type="search"
              placeholder="Search by name, guardian, phone, or school..."
              defaultValue={search}
              className="pl-8"
              onChange={(event) => handleSearchChange(event.target.value)}
              aria-label="Search students"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status-filter">Status</Label>
            <Select value={status} onValueChange={(value) => handleStatusChange(value as string)}>
              <SelectTrigger id="status-filter" className="w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((filter) => (
                  <SelectItem key={filter} value={filter}>
                    {filter === "ALL" ? "All statuses" : STUDENT_STATUS_LABELS[filter as StudentStatus]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Guardian</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Monthly Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <Link
                      href={`/students/${student.id}`}
                      className="font-medium hover:underline"
                    >
                      {student.name}
                    </Link>
                  </TableCell>
                  <TableCell>Grade {student.grade}</TableCell>
                  <TableCell>{student.guardianName ?? "—"}</TableCell>
                  <TableCell>{student.phone ?? student.guardianPhone ?? "—"}</TableCell>
                  <TableCell>{formatLkr(student.monthlyFee)}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={student.status}
                      label={STUDENT_STATUS_LABELS[student.status]}
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${student.name}`}
                            disabled={isPending}
                          >
                            <MoreHorizontal />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(student)}>
                          <Pencil />
                          Edit
                        </DropdownMenuItem>
                        {student.status === StudentStatus.ACTIVE ? (
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(student, StudentStatus.PAUSED)}
                          >
                            <Archive />
                            Archive
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(student, StudentStatus.ACTIVE)}
                          >
                            <RotateCcw />
                            Reactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <StudentFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        student={editStudent ?? undefined}
      />
    </>
  )
}
