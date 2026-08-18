"use server"

import type { Settings } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/db"
import {
  type ActionState,
  errorState,
  successState,
  zodErrorsToFieldErrors,
} from "@/lib/actions"

const updateSettingsSchema = z.object({
  teacherName: z.string().min(1, "Teacher name is required"),
  teacherPhone: z.string().nullable().optional(),
  teacherEmail: z.string().email("Invalid email").nullable().optional().or(z.literal("")),
  defaultFee: z.number().int().min(0),
  dueDayOfMonth: z.number().int().min(1).max(28),
})

const DEFAULT_SETTINGS = {
  teacherName: "Tuition Master",
  defaultFee: 500000,
  dueDayOfMonth: 5,
} as const

export const getSettings = async (): Promise<Settings> => {
  const existing = await prisma.settings.findFirst()

  if (existing) {
    return existing
  }

  return prisma.settings.create({
    data: DEFAULT_SETTINGS,
  })
}

export const updateSettingsForm = async (
  _prevState: ActionState<Settings>,
  formData: FormData
): Promise<ActionState<Settings>> => {
  const defaultFeeRaw = formData.get("defaultFee")?.toString() ?? "0"
  const defaultFee = Math.round(parseFloat(defaultFeeRaw.replace(/,/g, "")) * 100)

  return updateSettings(
    formData.get("teacherName")?.toString() ?? "",
    formData.get("teacherPhone")?.toString() || null,
    formData.get("teacherEmail")?.toString() || null,
    defaultFee,
    parseInt(formData.get("dueDayOfMonth")?.toString() ?? "5", 10)
  )
}

export const updateSettings = async (
  teacherName: string,
  teacherPhone: string | null | undefined,
  teacherEmail: string | null | undefined,
  defaultFee: number,
  dueDayOfMonth: number
): Promise<ActionState<Settings>> => {
  const parsed = updateSettingsSchema.safeParse({
    teacherName,
    teacherPhone: teacherPhone || null,
    teacherEmail: teacherEmail || null,
    defaultFee,
    dueDayOfMonth,
  })

  if (!parsed.success) {
    return errorState("Invalid settings data", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  try {
    const existing = await prisma.settings.findFirst()

    const settings = existing
      ? await prisma.settings.update({
          where: { id: existing.id },
          data: {
            teacherName: parsed.data.teacherName,
            teacherPhone: parsed.data.teacherPhone ?? null,
            teacherEmail: parsed.data.teacherEmail || null,
            defaultFee: parsed.data.defaultFee,
            dueDayOfMonth: parsed.data.dueDayOfMonth,
          },
        })
      : await prisma.settings.create({
          data: {
            teacherName: parsed.data.teacherName,
            teacherPhone: parsed.data.teacherPhone ?? null,
            teacherEmail: parsed.data.teacherEmail || null,
            defaultFee: parsed.data.defaultFee,
            dueDayOfMonth: parsed.data.dueDayOfMonth,
          },
        })

    revalidatePath("/settings")
    revalidatePath("/")
    return successState("Settings updated", settings)
  } catch {
    return errorState("Failed to update settings")
  }
}
