"use client"

import { useActionState, useEffect, useState } from "react"
import type { Student } from "@prisma/client"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { createStudent, updateStudent } from "@/actions/students"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { GRADES } from "@/lib/constants"
import { centsToDisplay } from "@/lib/currency"
import { initialActionState } from "@/lib/actions"

type StudentFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  student?: Student
}

const FieldError = ({ message }: { message?: string }) => {
  if (!message) return null
  return <p className="text-sm text-destructive">{message}</p>
}

type StudentFormBodyProps = {
  student?: Student
  onSuccess: () => void
}

const StudentFormBody = ({ student, onSuccess }: StudentFormBodyProps) => {
  const isEdit = Boolean(student)
  const [createState, createFormAction, isCreatePending] = useActionState(
    createStudent,
    initialActionState()
  )
  const [updateState, updateFormAction, isUpdatePending] = useActionState(
    updateStudent,
    initialActionState()
  )
  const state = isEdit ? updateState : createState
  const formAction = isEdit ? updateFormAction : createFormAction
  const isPending = isEdit ? isUpdatePending : isCreatePending
  const [grade, setGrade] = useState(student?.grade ?? "")

  useEffect(() => {
    if (state.success) {
      toast.success(state.message)
      onSuccess()
    }
  }, [state.success, state.message, onSuccess])

  return (
    <form action={formAction} className="grid gap-4">
      {isEdit && student && <input type="hidden" name="id" value={student.id} />}
      <input type="hidden" name="grade" value={grade} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="student-name">Name</Label>
          <Input
            id="student-name"
            name="name"
            defaultValue={student?.name ?? ""}
            aria-invalid={Boolean(state.errors?.name)}
            required
          />
          <FieldError message={state.errors?.name?.[0]} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="guardian-name">Guardian Name</Label>
          <Input id="guardian-name" name="guardianName" defaultValue={student?.guardianName ?? ""} />
          <FieldError message={state.errors?.guardianName?.[0]} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="guardian-phone">Guardian Phone</Label>
          <Input
            id="guardian-phone"
            name="guardianPhone"
            type="tel"
            defaultValue={student?.guardianPhone ?? ""}
          />
          <FieldError message={state.errors?.guardianPhone?.[0]} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="student-phone">Phone</Label>
          <Input id="student-phone" name="phone" type="tel" defaultValue={student?.phone ?? ""} />
          <FieldError message={state.errors?.phone?.[0]} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="student-school">School</Label>
          <Input id="student-school" name="school" defaultValue={student?.school ?? ""} />
          <FieldError message={state.errors?.school?.[0]} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="student-grade">Grade</Label>
          <Select value={grade} onValueChange={(value) => setGrade(value ?? "")}>
            <SelectTrigger id="student-grade" className="w-full">
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              {GRADES.map((g) => (
                <SelectItem key={g} value={g}>
                  Grade {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={state.errors?.grade?.[0]} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="monthly-fee">Monthly Fee (LKR)</Label>
          <Input
            id="monthly-fee"
            name="monthlyFee"
            type="number"
            min="0"
            step="1"
            defaultValue={student ? centsToDisplay(student.monthlyFee) : ""}
            required
          />
          <FieldError message={state.errors?.monthlyFee?.[0]} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="student-notes">Notes</Label>
          <Textarea id="student-notes" name="notes" rows={3} defaultValue={student?.notes ?? ""} />
          <FieldError message={state.errors?.notes?.[0]} />
        </div>
      </div>

      {!state.success && state.message && !state.errors && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}

      <DialogFooter>
        <Button type="submit" disabled={isPending || !grade}>
          {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Student"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export const StudentFormDialog = ({ open, onOpenChange, student }: StudentFormDialogProps) => {
  const isEdit = Boolean(student)
  const formKey = student?.id ?? "new"

  const handleSuccess = () => onOpenChange(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Student" : "Add Student"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update student details and fee information."
              : "Register a new student with guardian and fee details."}
          </DialogDescription>
        </DialogHeader>
        {open && <StudentFormBody key={formKey} student={student} onSuccess={handleSuccess} />}
      </DialogContent>
    </Dialog>
  )
}

export const AddStudentButton = () => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} aria-label="Add new student">
        <Plus />
        Add Student
      </Button>
      <StudentFormDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
