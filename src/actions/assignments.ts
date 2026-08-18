"use server"

import { SubmissionStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/db"
import {
  type ActionState,
  errorState,
  successState,
  zodErrorsToFieldErrors,
} from "@/lib/actions"

const createAssignmentSchema = z.object({
  classGroupId: z.string().min(1, "Class group is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.coerce.date(),
  maxMarks: z.number().int().min(1).default(100),
  sessionId: z.string().optional(),
})

const updateAssignmentSchema = z.object({
  id: z.string().min(1),
  classGroupId: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  dueDate: z.coerce.date().optional(),
  maxMarks: z.number().int().min(1).optional(),
  sessionId: z.string().nullable().optional(),
})

const deleteAssignmentSchema = z.object({
  id: z.string().min(1),
})

const updateSubmissionSchema = z.object({
  assignmentId: z.string().min(1),
  studentId: z.string().min(1),
  status: z.nativeEnum(SubmissionStatus),
  marks: z.number().int().min(0).nullable().optional(),
  feedback: z.string().nullable().optional(),
})

const autoCreateSubmissionsSchema = z.object({
  assignmentId: z.string().min(1),
  classGroupId: z.string().min(1),
})

export const autoCreateSubmissions = async (
  assignmentId: string,
  classGroupId: string
): Promise<ActionState<{ count: number }>> => {
  const parsed = autoCreateSubmissionsSchema.safeParse({ assignmentId, classGroupId })

  if (!parsed.success) {
    return errorState("Invalid submission data", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { classGroupId: parsed.data.classGroupId },
      select: { studentId: true },
    })

    if (enrollments.length === 0) {
      return successState("No enrolled students", { count: 0 })
    }

    const existing = await prisma.submission.findMany({
      where: { assignmentId: parsed.data.assignmentId },
      select: { studentId: true },
    })
    const existingStudentIds = new Set(existing.map((submission) => submission.studentId))

    const newEnrollments = enrollments.filter(
      (enrollment) => !existingStudentIds.has(enrollment.studentId)
    )

    if (newEnrollments.length === 0) {
      return successState("Submissions already exist", { count: 0 })
    }

    const result = await prisma.submission.createMany({
      data: newEnrollments.map((enrollment) => ({
        assignmentId: parsed.data.assignmentId,
        studentId: enrollment.studentId,
        status: SubmissionStatus.PENDING,
      })),
    })

    return successState("Submissions created", { count: result.count })
  } catch {
    return errorState("Failed to create submissions")
  }
}

export const createAssignment = async (
  classGroupId: string,
  title: string,
  description: string | undefined,
  dueDate: Date | string,
  maxMarks = 100,
  sessionId?: string
): Promise<ActionState<{ id: string }>> => {
  const parsed = createAssignmentSchema.safeParse({
    classGroupId,
    title,
    description,
    dueDate,
    maxMarks,
    sessionId,
  })

  if (!parsed.success) {
    return errorState("Invalid assignment data", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  try {
    const assignment = await prisma.assignment.create({
      data: parsed.data,
    })

    const submissionResult = await autoCreateSubmissions(assignment.id, assignment.classGroupId)

    if (!submissionResult.success) {
      return errorState(submissionResult.message)
    }

    revalidatePath("/assignments")
    return successState("Assignment created", { id: assignment.id })
  } catch {
    return errorState("Failed to create assignment")
  }
}

export const updateAssignment = async (
  id: string,
  data: {
    classGroupId?: string
    title?: string
    description?: string | null
    dueDate?: Date | string
    maxMarks?: number
    sessionId?: string | null
  }
): Promise<ActionState> => {
  const parsed = updateAssignmentSchema.safeParse({ id, ...data })

  if (!parsed.success) {
    return errorState("Invalid assignment data", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  const { id: assignmentId, ...updateData } = parsed.data

  try {
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: updateData,
    })

    revalidatePath("/assignments")
    return successState("Assignment updated")
  } catch {
    return errorState("Failed to update assignment")
  }
}

export const deleteAssignment = async (id: string): Promise<ActionState> => {
  const parsed = deleteAssignmentSchema.safeParse({ id })

  if (!parsed.success) {
    return errorState("Invalid assignment id")
  }

  try {
    await prisma.assignment.delete({
      where: { id: parsed.data.id },
    })

    revalidatePath("/assignments")
    return successState("Assignment deleted")
  } catch {
    return errorState("Failed to delete assignment")
  }
}

export const updateSubmission = async (
  assignmentId: string,
  studentId: string,
  status: SubmissionStatus,
  marks?: number | null,
  feedback?: string | null
): Promise<ActionState> => {
  const parsed = updateSubmissionSchema.safeParse({
    assignmentId,
    studentId,
    status,
    marks,
    feedback,
  })

  if (!parsed.success) {
    return errorState("Invalid submission data", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  const { assignmentId: aid, studentId: sid, status: submissionStatus, marks: submissionMarks, feedback: submissionFeedback } =
    parsed.data

  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: aid },
      select: { maxMarks: true },
    })

    if (!assignment) {
      return errorState("Assignment not found")
    }

    if (submissionMarks != null && submissionMarks > assignment.maxMarks) {
      return errorState(`Marks cannot exceed ${assignment.maxMarks}`)
    }

    await prisma.submission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: aid,
          studentId: sid,
        },
      },
      create: {
        assignmentId: aid,
        studentId: sid,
        status: submissionStatus,
        marks: submissionMarks ?? null,
        feedback: submissionFeedback ?? null,
        submittedAt: submissionStatus === SubmissionStatus.SUBMITTED ? new Date() : null,
      },
      update: {
        status: submissionStatus,
        marks: submissionMarks ?? null,
        feedback: submissionFeedback ?? null,
        submittedAt:
          submissionStatus === SubmissionStatus.SUBMITTED || submissionStatus === SubmissionStatus.GRADED
            ? new Date()
            : null,
      },
    })

    revalidatePath("/assignments")
    return successState("Submission updated")
  } catch {
    return errorState("Failed to update submission")
  }
}
