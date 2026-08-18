"use client"

import type { ReactElement } from "react"
import { useActionState, useEffect, useState } from "react"
import { Plus, Pencil } from "lucide-react"
import { toast } from "sonner"
import { createClassGroup, updateClassGroup } from "@/actions/classes"
import { initialActionState, type ActionState } from "@/lib/actions"
import { CLASS_COLOURS, GRADES } from "@/lib/constants"
import { centsToDisplay } from "@/lib/currency"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { cn } from "@/lib/utils"

type SubjectOption = {
  id: string
  name: string
}

export type ClassGroupFormValues = {
  id: string
  name: string
  subjectId: string
  grade: string
  defaultMonthlyFee: number | null
  colour: string
}

type ClassFormDialogProps = {
  subjects: SubjectOption[]
  classGroup?: ClassGroupFormValues
  trigger?: ReactElement
}

type ClassFormBodyProps = {
  subjects: SubjectOption[]
  classGroup?: ClassGroupFormValues
  onSuccess: () => void
  onCancel: () => void
}

const ClassFormBody = ({ subjects, classGroup, onSuccess, onCancel }: ClassFormBodyProps) => {
  const isEdit = Boolean(classGroup)
  const [colour, setColour] = useState(classGroup?.colour ?? CLASS_COLOURS[0])
  const [subjectId, setSubjectId] = useState(classGroup?.subjectId ?? subjects[0]?.id ?? "")
  const [grade, setGrade] = useState(classGroup?.grade ?? "")

  const [createState, createFormAction, isCreatePending] = useActionState(
    async (prevState: ActionState, formData: FormData): Promise<ActionState> => {
      const result = await createClassGroup(prevState, formData)
      return { success: result.success, message: result.message, errors: result.errors }
    },
    initialActionState()
  )
  const [updateState, updateFormAction, isUpdatePending] = useActionState(
    updateClassGroup,
    initialActionState()
  )
  const state = isEdit ? updateState : createState
  const formAction = isEdit ? updateFormAction : createFormAction
  const isPending = isEdit ? isUpdatePending : isCreatePending

  useEffect(() => {
    if (!state.message) return
    if (state.success) {
      toast.success(state.message)
      onSuccess()
      return
    }
    toast.error(state.message)
  }, [state, onSuccess])

  return (
    <form action={formAction} className="grid gap-4">
      {isEdit && classGroup && <input type="hidden" name="id" value={classGroup.id} />}
      <input type="hidden" name="colour" value={colour} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="grade" value={grade} />

      <div className="grid gap-2">
        <Label htmlFor="class-name">Name</Label>
        <Input
          id="class-name"
          name="name"
          defaultValue={classGroup?.name ?? ""}
          placeholder="e.g. Grade 10 Maths – Morning"
          required
        />
        {state.errors?.name && <p className="text-xs text-destructive">{state.errors.name[0]}</p>}
      </div>

      <div className="grid gap-2">
        <Label>Subject</Label>
        <Select value={subjectId || null} onValueChange={(value) => setSubjectId(value ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.errors?.subjectId && (
          <p className="text-xs text-destructive">{state.errors.subjectId[0]}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label>Grade</Label>
        <Select value={grade || null} onValueChange={(value) => setGrade(value ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select grade" />
          </SelectTrigger>
          <SelectContent>
            {GRADES.map((gradeOption) => (
              <SelectItem key={gradeOption} value={gradeOption}>
                Grade {gradeOption}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.errors?.grade && <p className="text-xs text-destructive">{state.errors.grade[0]}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="defaultMonthlyFee">Default Monthly Fee (LKR)</Label>
        <Input
          id="defaultMonthlyFee"
          name="defaultMonthlyFee"
          type="number"
          min={0}
          step={1}
          defaultValue={
            classGroup?.defaultMonthlyFee != null ? centsToDisplay(classGroup.defaultMonthlyFee) : ""
          }
          placeholder="Optional"
        />
      </div>

      <div className="grid gap-2">
        <Label>Colour</Label>
        <div className="flex flex-wrap gap-2">
          {CLASS_COLOURS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setColour(option)}
              className={cn(
                "size-8 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                colour === option ? "border-foreground scale-110" : "border-transparent"
              )}
              style={{ backgroundColor: option }}
              aria-label={`Select colour ${option}`}
              aria-pressed={colour === option}
            />
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Class"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export const ClassFormDialog = ({ subjects, classGroup, trigger }: ClassFormDialogProps) => {
  const isEdit = Boolean(classGroup)
  const [open, setOpen] = useState(false)
  const formKey = classGroup?.id ?? "new"

  const defaultTrigger = isEdit ? (
    <Button variant="outline" size="sm">
      <Pencil className="size-4" data-icon="inline-start" />
      Edit
    </Button>
  ) : (
    <Button>
      <Plus className="size-4" data-icon="inline-start" />
      Create Class
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? defaultTrigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Class" : "Create Class"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update class details, subject, grade, and fee."
              : "Add a new class group with subject, grade, and schedule colour."}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <ClassFormBody
            key={formKey}
            subjects={subjects}
            classGroup={classGroup}
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
