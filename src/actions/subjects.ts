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

const subjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional(),
})

const updateSubjectSchema = subjectSchema.extend({
  id: z.string().min(1, "Subject ID is required"),
})

const revalidateSubjectPaths = () => {
  revalidatePath("/classes")
  revalidatePath("/schedule")
  revalidatePath("/")
}

export const createSubject = async (
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState<{ id: string }>> => {
  const parsed = subjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description")?.toString() || undefined,
  })

  if (!parsed.success) {
    return errorState("Validation failed", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  try {
    const subject = await prisma.subject.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
      },
    })

    revalidateSubjectPaths()
    return successState("Subject created successfully", { id: subject.id })
  } catch {
    return errorState("Failed to create subject")
  }
}

export const updateSubject = async (
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const parsed = updateSubjectSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description")?.toString() || undefined,
  })

  if (!parsed.success) {
    return errorState("Validation failed", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  try {
    await prisma.subject.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
      },
    })

    revalidateSubjectPaths()
    return successState("Subject updated successfully")
  } catch {
    return errorState("Failed to update subject")
  }
}

export const deleteSubject = async (id: string): Promise<ActionState> => {
  if (!id) {
    return errorState("Subject ID is required")
  }

  try {
    await prisma.subject.delete({
      where: { id },
    })

    revalidateSubjectPaths()
    return successState("Subject deleted successfully")
  } catch {
    return errorState("Failed to delete subject. Remove linked classes first.")
  }
}
