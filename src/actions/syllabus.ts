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
import { GRADES } from "@/lib/constants"

const createTopicSchema = z.object({
  subjectId: z.string().min(1, "Subject is required"),
  grade: z.enum(GRADES),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
})

const updateTopicSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1).optional(),
  grade: z.enum(GRADES).optional(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

const deleteTopicSchema = z.object({
  id: z.string().min(1),
})

const reorderTopicsSchema = z.object({
  topicIds: z.array(z.string().min(1)).min(1, "At least one topic is required"),
})

export const createTopic = async (
  subjectId: string,
  grade: string,
  title: string,
  description?: string,
  sortOrder = 0
): Promise<ActionState<{ id: string }>> => {
  const parsed = createTopicSchema.safeParse({
    subjectId,
    grade,
    title,
    description,
    sortOrder,
  })

  if (!parsed.success) {
    return errorState("Invalid topic data", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  try {
    const topic = await prisma.topic.create({
      data: parsed.data,
    })

    revalidatePath("/syllabus")
    return successState("Topic created", { id: topic.id })
  } catch {
    return errorState("Failed to create topic")
  }
}

export const updateTopic = async (
  id: string,
  data: {
    subjectId?: string
    grade?: string
    title?: string
    description?: string | null
    sortOrder?: number
  }
): Promise<ActionState> => {
  const parsed = updateTopicSchema.safeParse({ id, ...data })

  if (!parsed.success) {
    return errorState("Invalid topic data", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  const { id: topicId, ...updateData } = parsed.data

  try {
    await prisma.topic.update({
      where: { id: topicId },
      data: updateData,
    })

    revalidatePath("/syllabus")
    return successState("Topic updated")
  } catch {
    return errorState("Failed to update topic")
  }
}

export const deleteTopic = async (id: string): Promise<ActionState> => {
  const parsed = deleteTopicSchema.safeParse({ id })

  if (!parsed.success) {
    return errorState("Invalid topic id")
  }

  try {
    await prisma.topic.delete({
      where: { id: parsed.data.id },
    })

    revalidatePath("/syllabus")
    return successState("Topic deleted")
  } catch {
    return errorState("Failed to delete topic")
  }
}

export const reorderTopics = async (topicIds: string[]): Promise<ActionState> => {
  const parsed = reorderTopicsSchema.safeParse({ topicIds })

  if (!parsed.success) {
    return errorState("Invalid topic order", zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors))
  }

  try {
    await prisma.$transaction(
      parsed.data.topicIds.map((topicId, index) =>
        prisma.topic.update({
          where: { id: topicId },
          data: { sortOrder: index },
        })
      )
    )

    revalidatePath("/syllabus")
    return successState("Topics reordered")
  } catch {
    return errorState("Failed to reorder topics")
  }
}
