"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/db"
import {
  type ActionState,
  successState,
  errorState,
  zodErrorsToFieldErrors,
} from "@/lib/actions"
import { parseLkrToCents } from "@/lib/currency"
import { CLASS_COLOURS, GRADES } from "@/lib/constants"

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format")

const classGroupSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  subjectId: z.string().min(1, "Subject is required"),
  grade: z.enum(GRADES, { message: "Select a valid grade" }),
  defaultMonthlyFee: z.number().int().min(0).optional(),
  colour: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Select a valid colour")
    .refine((value) => CLASS_COLOURS.includes(value as (typeof CLASS_COLOURS)[number]), {
      message: "Select a valid colour",
    }),
})

const updateClassGroupSchema = classGroupSchema.extend({
  id: z.string().min(1, "Class ID is required"),
})

const scheduleSlotSchema = z
  .object({
    classGroupId: z.string().min(1, "Class is required"),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema,
    isTestSlot: z.boolean().default(false),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  })

const updateScheduleSlotSchema = scheduleSlotSchema
  .extend({
    id: z.string().min(1, "Schedule slot ID is required"),
  })
  .omit({ classGroupId: true })

const revalidateClassPaths = () => {
  revalidatePath("/classes")
  revalidatePath("/schedule")
  revalidatePath("/")
}

const parseOptionalFee = (value: FormDataEntryValue | null): number | undefined => {
  const raw = value?.toString().trim()
  if (!raw) return undefined
  return parseLkrToCents(raw)
}

const parseBooleanField = (value: FormDataEntryValue | null): boolean => {
  const raw = value?.toString().toLowerCase()
  return raw === "true" || raw === "on" || raw === "1"
}

export const createClassGroup = async (
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState<{ id: string }>> => {
  const parsed = classGroupSchema.safeParse({
    name: formData.get("name"),
    subjectId: formData.get("subjectId"),
    grade: formData.get("grade"),
    defaultMonthlyFee: parseOptionalFee(formData.get("defaultMonthlyFee")),
    colour: formData.get("colour"),
  })

  if (!parsed.success) {
    return errorState("Validation failed", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  try {
    const classGroup = await prisma.classGroup.create({
      data: {
        name: parsed.data.name,
        subjectId: parsed.data.subjectId,
        grade: parsed.data.grade,
        defaultMonthlyFee: parsed.data.defaultMonthlyFee ?? null,
        colour: parsed.data.colour,
      },
    })

    revalidateClassPaths()
    return successState("Class created successfully", { id: classGroup.id })
  } catch {
    return errorState("Failed to create class")
  }
}

export const updateClassGroup = async (
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const feeRaw = formData.get("defaultMonthlyFee")?.toString().trim()
  const hasFeeField = formData.has("defaultMonthlyFee")

  const parsed = updateClassGroupSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    subjectId: formData.get("subjectId"),
    grade: formData.get("grade"),
    defaultMonthlyFee: hasFeeField && feeRaw ? parseLkrToCents(feeRaw) : undefined,
    colour: formData.get("colour"),
  })

  if (!parsed.success) {
    return errorState("Validation failed", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  try {
    await prisma.classGroup.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        subjectId: parsed.data.subjectId,
        grade: parsed.data.grade,
        defaultMonthlyFee: hasFeeField ? (feeRaw ? parsed.data.defaultMonthlyFee ?? null : null) : undefined,
        colour: parsed.data.colour,
      },
    })

    revalidateClassPaths()
    return successState("Class updated successfully")
  } catch {
    return errorState("Failed to update class")
  }
}

export const deleteClassGroup = async (id: string): Promise<ActionState> => {
  if (!id) {
    return errorState("Class ID is required")
  }

  try {
    await prisma.classGroup.delete({
      where: { id },
    })

    revalidateClassPaths()
    return successState("Class deleted successfully")
  } catch {
    return errorState("Failed to delete class")
  }
}

export const addEnrollment = async (
  classGroupId: string,
  studentId: string
): Promise<ActionState<{ id: string }>> => {
  const parsed = z
    .object({
      classGroupId: z.string().min(1, "Class is required"),
      studentId: z.string().min(1, "Student is required"),
    })
    .safeParse({ classGroupId, studentId })

  if (!parsed.success) {
    return errorState("Validation failed", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  try {
    const enrollment = await prisma.enrollment.create({
      data: {
        classGroupId: parsed.data.classGroupId,
        studentId: parsed.data.studentId,
      },
    })

    revalidateClassPaths()
    return successState("Student enrolled successfully", { id: enrollment.id })
  } catch {
    return errorState("Failed to enroll student. They may already be enrolled.")
  }
}

export const removeEnrollment = async (enrollmentId: string): Promise<ActionState> => {
  if (!enrollmentId) {
    return errorState("Enrollment ID is required")
  }

  try {
    await prisma.enrollment.delete({
      where: { id: enrollmentId },
    })

    revalidateClassPaths()
    return successState("Enrollment removed successfully")
  } catch {
    return errorState("Failed to remove enrollment")
  }
}

export const createScheduleSlot = async (
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState<{ id: string }>> => {
  const dayOfWeekRaw = formData.get("dayOfWeek")?.toString()

  const parsed = scheduleSlotSchema.safeParse({
    classGroupId: formData.get("classGroupId"),
    dayOfWeek: dayOfWeekRaw ? Number.parseInt(dayOfWeekRaw, 10) : undefined,
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    isTestSlot: parseBooleanField(formData.get("isTestSlot")),
  })

  if (!parsed.success) {
    return errorState("Validation failed", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  try {
    const slot = await prisma.scheduleSlot.create({
      data: parsed.data,
    })

    revalidateClassPaths()
    return successState("Schedule slot created successfully", { id: slot.id })
  } catch {
    return errorState("Failed to create schedule slot")
  }
}

export const updateScheduleSlot = async (
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const dayOfWeekRaw = formData.get("dayOfWeek")?.toString()

  const parsed = updateScheduleSlotSchema.safeParse({
    id: formData.get("id"),
    dayOfWeek: dayOfWeekRaw ? Number.parseInt(dayOfWeekRaw, 10) : undefined,
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    isTestSlot: parseBooleanField(formData.get("isTestSlot")),
  })

  if (!parsed.success) {
    return errorState("Validation failed", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  const { id, ...data } = parsed.data

  try {
    await prisma.scheduleSlot.update({
      where: { id },
      data,
    })

    revalidateClassPaths()
    return successState("Schedule slot updated successfully")
  } catch {
    return errorState("Failed to update schedule slot")
  }
}

export const deleteScheduleSlot = async (id: string): Promise<ActionState> => {
  if (!id) {
    return errorState("Schedule slot ID is required")
  }

  try {
    await prisma.scheduleSlot.delete({
      where: { id },
    })

    revalidateClassPaths()
    return successState("Schedule slot deleted successfully")
  } catch {
    return errorState("Failed to delete schedule slot")
  }
}
