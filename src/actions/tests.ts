"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/db"
import {
  type ActionState,
  errorState,
  successState,
  zodErrorsToFieldErrors,
} from "@/lib/actions"
import { calculateGrade, calculatePercentage } from "@/lib/constants"

const questionInputSchema = z.object({
  number: z.number().int().min(1),
  text: z.string().min(1, "Question text is required"),
  maxMarks: z.number().int().min(1),
  topicId: z.string().optional(),
})

const createAssessmentSchema = z.object({
  classGroupId: z.string().min(1, "Class group is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  testDate: z.coerce.date(),
  questions: z.array(questionInputSchema).min(1, "At least one question is required"),
})

const updateAssessmentSchema = z.object({
  id: z.string().min(1),
  classGroupId: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  testDate: z.coerce.date().optional(),
})

const deleteAssessmentSchema = z.object({
  id: z.string().min(1),
})

const saveQuestionScoresSchema = z.object({
  assessmentId: z.string().min(1),
  scores: z.array(
    z.object({
      questionId: z.string().min(1),
      studentId: z.string().min(1),
      marks: z.number().int().min(0),
    })
  ),
})

const recalculateResultsSchema = z.object({
  assessmentId: z.string().min(1),
})

export const recalculateResults = async (assessmentId: string): Promise<ActionState<{ count: number }>> => {
  const parsed = recalculateResultsSchema.safeParse({ assessmentId })

  if (!parsed.success) {
    return errorState("Invalid assessment id")
  }

  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: parsed.data.assessmentId },
      include: {
        questions: {
          include: {
            scores: true,
          },
        },
        classGroup: {
          include: {
            enrollments: {
              select: { studentId: true },
            },
          },
        },
      },
    })

    if (!assessment) {
      return errorState("Assessment not found")
    }

    const maxMarks = assessment.questions.reduce((sum, question) => sum + question.maxMarks, 0)
    const studentIds = assessment.classGroup.enrollments.map((enrollment) => enrollment.studentId)

    const totalsByStudent = new Map<string, number>()

    for (const studentId of studentIds) {
      totalsByStudent.set(studentId, 0)
    }

    for (const question of assessment.questions) {
      for (const score of question.scores) {
        const current = totalsByStudent.get(score.studentId) ?? 0
        totalsByStudent.set(score.studentId, current + score.marks)
      }
    }

    await prisma.$transaction(
      Array.from(totalsByStudent.entries()).map(([studentId, totalMarks]) => {
        const percentage = calculatePercentage(totalMarks, maxMarks)
        const grade = calculateGrade(percentage)

        return prisma.result.upsert({
          where: {
            assessmentId_studentId: {
              assessmentId: parsed.data.assessmentId,
              studentId,
            },
          },
          create: {
            assessmentId: parsed.data.assessmentId,
            studentId,
            totalMarks,
            grade,
          },
          update: {
            totalMarks,
            grade,
          },
        })
      })
    )

    revalidatePath("/tests")
    return successState("Results recalculated", { count: totalsByStudent.size })
  } catch {
    return errorState("Failed to recalculate results")
  }
}

export const createAssessment = async (
  classGroupId: string,
  title: string,
  description: string | undefined,
  testDate: Date | string,
  questions: { number: number; text: string; maxMarks: number; topicId?: string }[]
): Promise<ActionState<{ id: string }>> => {
  const parsed = createAssessmentSchema.safeParse({
    classGroupId,
    title,
    description,
    testDate,
    questions,
  })

  if (!parsed.success) {
    return errorState("Invalid assessment data", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  const maxMarks = parsed.data.questions.reduce((sum, question) => sum + question.maxMarks, 0)

  try {
    const assessment = await prisma.$transaction(async (tx) => {
      const created = await tx.assessment.create({
        data: {
          classGroupId: parsed.data.classGroupId,
          title: parsed.data.title,
          description: parsed.data.description,
          testDate: parsed.data.testDate,
          maxMarks,
          questions: {
            create: parsed.data.questions,
          },
        },
      })

      const enrollments = await tx.enrollment.findMany({
        where: { classGroupId: parsed.data.classGroupId },
        select: { studentId: true },
      })

      if (enrollments.length > 0) {
        await tx.result.createMany({
          data: enrollments.map((enrollment) => ({
            assessmentId: created.id,
            studentId: enrollment.studentId,
            totalMarks: 0,
            grade: calculateGrade(0),
          })),
        })
      }

      return created
    })

    revalidatePath("/tests")
    return successState("Assessment created", { id: assessment.id })
  } catch {
    return errorState("Failed to create assessment")
  }
}

export const updateAssessment = async (
  id: string,
  data: {
    classGroupId?: string
    title?: string
    description?: string | null
    testDate?: Date | string
  }
): Promise<ActionState> => {
  const parsed = updateAssessmentSchema.safeParse({ id, ...data })

  if (!parsed.success) {
    return errorState("Invalid assessment data", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  const { id: assessmentId, ...updateData } = parsed.data

  try {
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: updateData,
    })

    revalidatePath("/tests")
    return successState("Assessment updated")
  } catch {
    return errorState("Failed to update assessment")
  }
}

export const deleteAssessment = async (id: string): Promise<ActionState> => {
  const parsed = deleteAssessmentSchema.safeParse({ id })

  if (!parsed.success) {
    return errorState("Invalid assessment id")
  }

  try {
    await prisma.assessment.delete({
      where: { id: parsed.data.id },
    })

    revalidatePath("/tests")
    return successState("Assessment deleted")
  } catch {
    return errorState("Failed to delete assessment")
  }
}

export const saveQuestionScores = async (
  assessmentId: string,
  scores: { questionId: string; studentId: string; marks: number }[]
): Promise<ActionState> => {
  const parsed = saveQuestionScoresSchema.safeParse({ assessmentId, scores })

  if (!parsed.success) {
    return errorState("Invalid score data", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  try {
    const questions = await prisma.question.findMany({
      where: {
        assessmentId: parsed.data.assessmentId,
        id: { in: parsed.data.scores.map((score) => score.questionId) },
      },
      select: { id: true, maxMarks: true },
    })

    const questionMap = new Map(questions.map((question) => [question.id, question.maxMarks]))

    for (const score of parsed.data.scores) {
      const maxMarks = questionMap.get(score.questionId)
      if (maxMarks == null) {
        return errorState("One or more questions do not belong to this assessment")
      }
      if (score.marks > maxMarks) {
        return errorState(`Marks cannot exceed ${maxMarks} for a question`)
      }
    }

    await prisma.$transaction(
      parsed.data.scores.map((score) =>
        prisma.questionScore.upsert({
          where: {
            questionId_studentId: {
              questionId: score.questionId,
              studentId: score.studentId,
            },
          },
          create: {
            questionId: score.questionId,
            studentId: score.studentId,
            marks: score.marks,
          },
          update: {
            marks: score.marks,
          },
        })
      )
    )

    const recalcResult = await recalculateResults(parsed.data.assessmentId)
    if (!recalcResult.success) {
      return errorState(recalcResult.message)
    }

    revalidatePath("/tests")
    revalidatePath(`/tests/${parsed.data.assessmentId}/marks`)
    return successState("Scores saved")
  } catch {
    return errorState("Failed to save scores")
  }
}
