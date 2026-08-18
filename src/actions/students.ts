"use server"

import { revalidatePath } from "next/cache"
import { StudentStatus } from "@prisma/client"
import { z } from "zod"
import {
  type ActionState,
  successState,
  errorState,
  zodErrorsToFieldErrors,
} from "@/lib/actions"
import { GRADES } from "@/lib/constants"
import { parseLkrToCents } from "@/lib/currency"
import { prisma } from "@/lib/db"

const optionalString = z.string().trim().optional()

const monthlyFeeSchema = z
  .string()
  .trim()
  .min(1, "Monthly fee is required")
  .transform(parseLkrToCents)
  .refine((cents) => cents > 0, "Monthly fee must be greater than zero")

const studentFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  guardianName: optionalString,
  guardianPhone: optionalString,
  phone: optionalString,
  school: optionalString,
  grade: z.enum(GRADES, { message: "Select a valid grade" }),
  monthlyFee: monthlyFeeSchema,
  notes: optionalString,
})

const createStudentSchema = studentFieldsSchema

const updateStudentSchema = studentFieldsSchema.extend({
  id: z.string().min(1, "Student ID is required"),
})

const updateStudentStatusSchema = z.object({
  id: z.string().min(1, "Student ID is required"),
  status: z.nativeEnum(StudentStatus),
})

const deleteStudentSchema = z.object({
  id: z.string().min(1, "Student ID is required"),
})

const revalidateStudentPaths = () => {
  revalidatePath("/students")
  revalidatePath("/")
}

const parseStudentFormData = (formData: FormData) => ({
  name: formData.get("name"),
  guardianName: formData.get("guardianName")?.toString().trim() || undefined,
  guardianPhone: formData.get("guardianPhone")?.toString().trim() || undefined,
  phone: formData.get("phone")?.toString().trim() || undefined,
  school: formData.get("school")?.toString().trim() || undefined,
  grade: formData.get("grade"),
  monthlyFee: formData.get("monthlyFee")?.toString().trim(),
  notes: formData.get("notes")?.toString().trim() || undefined,
})

export const createStudent = async (
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const parsed = createStudentSchema.safeParse(parseStudentFormData(formData))

  if (!parsed.success) {
    return errorState("Validation failed", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  try {
    await prisma.student.create({
      data: {
        name: parsed.data.name,
        guardianName: parsed.data.guardianName || null,
        guardianPhone: parsed.data.guardianPhone || null,
        phone: parsed.data.phone || null,
        school: parsed.data.school || null,
        grade: parsed.data.grade,
        monthlyFee: parsed.data.monthlyFee,
        notes: parsed.data.notes || null,
      },
    })

    revalidateStudentPaths()
    return successState("Student created successfully")
  } catch {
    return errorState("Failed to create student")
  }
}

export const updateStudent = async (
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const parsed = updateStudentSchema.safeParse({
    id: formData.get("id"),
    ...parseStudentFormData(formData),
  })

  if (!parsed.success) {
    return errorState("Validation failed", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  try {
    await prisma.student.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        guardianName: parsed.data.guardianName || null,
        guardianPhone: parsed.data.guardianPhone || null,
        phone: parsed.data.phone || null,
        school: parsed.data.school || null,
        grade: parsed.data.grade,
        monthlyFee: parsed.data.monthlyFee,
        notes: parsed.data.notes || null,
      },
    })

    revalidateStudentPaths()
    return successState("Student updated successfully")
  } catch {
    return errorState("Failed to update student")
  }
}

export const updateStudentStatus = async (
  id: string,
  status: StudentStatus
): Promise<ActionState> => {
  const parsed = updateStudentStatusSchema.safeParse({ id, status })

  if (!parsed.success) {
    return errorState("Validation failed", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  try {
    await prisma.student.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
    })

    revalidateStudentPaths()
    return successState("Student status updated successfully")
  } catch {
    return errorState("Failed to update student status")
  }
}

export const deleteStudent = async (id: string): Promise<ActionState> => {
  const parsed = deleteStudentSchema.safeParse({ id })

  if (!parsed.success) {
    return errorState("Validation failed", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  try {
    await prisma.student.delete({
      where: { id: parsed.data.id },
    })

    revalidateStudentPaths()
    return successState("Student deleted successfully")
  } catch {
    return errorState("Failed to delete student")
  }
}
