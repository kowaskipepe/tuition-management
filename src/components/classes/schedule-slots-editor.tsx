"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  createScheduleSlot,
  updateScheduleSlot,
  deleteScheduleSlot,
} from "@/actions/classes"
import { initialActionState, type ActionState } from "@/lib/actions"
import { DAY_NAMES, DAY_NAMES_FULL, formatTime } from "@/lib/dates"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"

type ScheduleSlotItem = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isTestSlot: boolean
}

type ScheduleSlotsEditorProps = {
  classGroupId: string
  slots: ScheduleSlotItem[]
}

type SlotFormProps = {
  classGroupId: string
  slot?: ScheduleSlotItem
  onCancel?: () => void
  onSuccess?: () => void
}

const SlotForm = ({ classGroupId, slot, onCancel, onSuccess }: SlotFormProps) => {
  const isEdit = Boolean(slot)
  const [createState, createFormAction, isCreatePending] = useActionState(
    async (prevState: ActionState, formData: FormData): Promise<ActionState> => {
      const result = await createScheduleSlot(prevState, formData)
      return {
        success: result.success,
        message: result.message,
        errors: result.errors,
      }
    },
    initialActionState()
  )
  const [updateState, updateFormAction, isUpdatePending] = useActionState(
    updateScheduleSlot,
    initialActionState()
  )
  const state = isEdit ? updateState : createState
  const formAction = isEdit ? updateFormAction : createFormAction
  const isPending = isEdit ? isUpdatePending : isCreatePending

  const [dayOfWeek, setDayOfWeek] = useState(String(slot?.dayOfWeek ?? 1))
  const [isTestSlot, setIsTestSlot] = useState(slot?.isTestSlot ?? false)

  useEffect(() => {
    if (!state.message) return
    if (state.success) {
      toast.success(state.message)
      onSuccess?.()
      return
    }
    toast.error(state.message)
  }, [state, onSuccess])

  return (
    <form action={formAction} className="grid gap-3 rounded-lg border bg-muted/30 p-4">
      {isEdit && slot && <input type="hidden" name="id" value={slot.id} />}
      {!isEdit && <input type="hidden" name="classGroupId" value={classGroupId} />}
      <input type="hidden" name="dayOfWeek" value={dayOfWeek} />
      <input type="hidden" name="isTestSlot" value={String(isTestSlot)} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Day</Label>
          <Select
            value={dayOfWeek}
            onValueChange={(value) => setDayOfWeek(value ?? "1")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAY_NAMES.map((day, index) => (
                <SelectItem key={day} value={String(index)}>
                  {DAY_NAMES_FULL[index]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2 pb-1">
          <Switch
            checked={isTestSlot}
            onCheckedChange={setIsTestSlot}
            aria-label="Mark as test slot"
          />
          <Label className="cursor-pointer">Test slot</Label>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`start-${slot?.id ?? "new"}`}>Start time</Label>
          <Input
            id={`start-${slot?.id ?? "new"}`}
            name="startTime"
            type="time"
            defaultValue={slot?.startTime ?? "16:00"}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`end-${slot?.id ?? "new"}`}>End time</Label>
          <Input
            id={`end-${slot?.id ?? "new"}`}
            name="endTime"
            type="time"
            defaultValue={slot?.endTime ?? "18:00"}
            required
          />
        </div>
      </div>

      {state.errors && (
        <div className="space-y-1">
          {Object.entries(state.errors).map(([field, messages]) => (
            <p key={field} className="text-xs text-destructive">
              {messages[0]}
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving..." : isEdit ? "Update Slot" : "Add Slot"}
        </Button>
      </div>
    </form>
  )
}

export const ScheduleSlotsEditor = ({ classGroupId, slots }: ScheduleSlotsEditorProps) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null)

  const handleDelete = (slotId: string) => {
    startTransition(async () => {
      const result = await deleteScheduleSlot(slotId)
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
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-4" />
            Schedule Slots
          </CardTitle>
          <CardDescription>
            Weekly recurring time slots used to generate sessions.
          </CardDescription>
        </div>
        {!showAddForm && (
          <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)}>
            <Plus className="size-4" data-icon="inline-start" />
            Add Slot
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <SlotForm
            classGroupId={classGroupId}
            onCancel={() => setShowAddForm(false)}
            onSuccess={() => {
              setShowAddForm(false)
              router.refresh()
            }}
          />
        )}

        {slots.length === 0 && !showAddForm ? (
          <EmptyState
            title="No schedule slots"
            description="Add weekly time slots to generate class sessions automatically."
            action={
              <Button size="sm" onClick={() => setShowAddForm(true)}>
                <Plus className="size-4" data-icon="inline-start" />
                Add First Slot
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {slots.map((slot) => (
              <li key={slot.id}>
                {editingSlotId === slot.id ? (
                  <SlotForm
                    classGroupId={classGroupId}
                    slot={slot}
                    onCancel={() => setEditingSlotId(null)}
                    onSuccess={() => {
                      setEditingSlotId(null)
                      router.refresh()
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{DAY_NAMES[slot.dayOfWeek]}</span>
                        <span className="text-muted-foreground">
                          {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                        </span>
                        {slot.isTestSlot && <Badge variant="secondary">Test</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditingSlotId(slot.id)}
                        aria-label="Edit schedule slot"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(slot.id)}
                        disabled={isPending}
                        aria-label="Delete schedule slot"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
