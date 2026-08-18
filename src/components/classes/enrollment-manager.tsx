"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { UserMinus, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { addEnrollment, removeEnrollment } from "@/actions/classes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EmptyState } from "@/components/shared/empty-state"

type EnrolledStudent = {
  enrollmentId: string
  id: string
  name: string
  grade: string
}

type AvailableStudent = {
  id: string
  name: string
  grade: string
}

type EnrollmentManagerProps = {
  classGroupId: string
  enrollments: EnrolledStudent[]
  availableStudents: AvailableStudent[]
}

export const EnrollmentManager = ({
  classGroupId,
  enrollments,
  availableStudents,
}: EnrollmentManagerProps) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedStudentId, setSelectedStudentId] = useState("")

  const handleAddEnrollment = () => {
    if (!selectedStudentId) {
      toast.error("Select a student to enroll")
      return
    }

    startTransition(async () => {
      const result = await addEnrollment(classGroupId, selectedStudentId)
      if (result.success) {
        toast.success(result.message)
        setSelectedStudentId("")
        router.refresh()
        return
      }
      toast.error(result.message)
    })
  }

  const handleRemoveEnrollment = (enrollmentId: string) => {
    startTransition(async () => {
      const result = await removeEnrollment(enrollmentId)
      if (result.success) {
        toast.success(result.message)
        router.refresh()
        return
      }
      toast.error(result.message)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enrolled Students</CardTitle>
        <CardDescription>
          {enrollments.length} student{enrollments.length === 1 ? "" : "s"} enrolled
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {availableStudents.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Select
                value={selectedStudentId || null}
                onValueChange={(value) => setSelectedStudentId(value ?? "")}
              >
                <SelectTrigger className="w-full" aria-label="Select student to enroll">
                  <SelectValue placeholder="Select student to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} · Grade {student.grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAddEnrollment}
              disabled={isPending || !selectedStudentId}
              aria-label="Add selected student to class"
            >
              <UserPlus className="size-4" data-icon="inline-start" />
              Add Student
            </Button>
          </div>
        )}

        {enrollments.length === 0 ? (
          <EmptyState
            title="No students enrolled"
            description="Add students from the dropdown above to enroll them in this class."
          />
        ) : (
          <ul className="divide-y rounded-lg border">
            {enrollments.map((student) => (
              <li
                key={student.enrollmentId}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{student.name}</p>
                  <p className="text-sm text-muted-foreground">Grade {student.grade}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveEnrollment(student.enrollmentId)}
                  disabled={isPending}
                  aria-label={`Remove ${student.name} from class`}
                >
                  <UserMinus className="size-4" data-icon="inline-start" />
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
