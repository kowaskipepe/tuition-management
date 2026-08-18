"use server"

import { revalidatePath } from "next/cache"
import { AttendanceStatus, SessionStatus } from "@prisma/client"
import { startOfDay } from "date-fns"
import { z } from "zod"
import {
  type ActionState,
  successState,
  errorState,
  zodErrorsToFieldErrors,
} from "@/lib/actions"
import { getDatesForDayOfWeek } from "@/lib/dates"
import { prisma } from "@/lib/db"

const dateSchema = z.coerce.date()

const generateSessionsSchema = z.object({
  classGroupId: z.string().min(1, "Class is required"),
  startDate: dateSchema,
  endDate: dateSchema,
})

const updateSessionSchema = z.object({
  sessionId: z.string().min(1, "Session is required"),
  homeworkNote: z.string().optional(),
  isTest: z.boolean().optional(),
  status: z.nativeEnum(SessionStatus).optional(),
})

const markAttendanceSchema = z.object({
  sessionId: z.string().min(1, "Session is required"),
  studentId: z.string().min(1, "Student is required"),
  status: z.nativeEnum(AttendanceStatus),
  note: z.string().optional(),
})

const bulkAttendanceRecordSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  status: z.nativeEnum(AttendanceStatus),
})

const bulkMarkAttendanceSchema = z.object({
  sessionId: z.string().min(1, "Session is required"),
  records: z.array(bulkAttendanceRecordSchema).min(1, "At least one attendance record is required"),
})

const linkTopicsSchema = z.object({
  sessionId: z.string().min(1, "Session is required"),
  topicIds: z.array(z.string().min(1)).default([]),
})

const revalidateSessionPaths = (sessionId?: string) => {
  revalidatePath("/schedule")
  revalidatePath("/classes")
  revalidatePath("/")
  if (sessionId) {
    revalidatePath(`/sessions/${sessionId}`)
  }
}

const sessionKey = (date: Date, startTime: string): string => {
  return `${startOfDay(date).toISOString()}-${startTime}`
}

export const generateSessions = async (
  classGroupId: string,
  startDate: Date | string,
  endDate: Date | string
): Promise<ActionState<{ created: number }>> => {
  const parsed = generateSessionsSchema.safeParse({ classGroupId, startDate, endDate })

  if (!parsed.success) {
    return errorState(
      "Invalid session generation details",
      zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors)
    )
  }

  if (parsed.data.startDate > parsed.data.endDate) {
    return errorState("Start date must be before end date")
  }

  try {
    const classGroup = await prisma.classGroup.findUnique({
      where: { id: parsed.data.classGroupId },
    })

    if (!classGroup) {
      return errorState("Class not found")
    }

    const scheduleSlots = await prisma.scheduleSlot.findMany({
      where: { classGroupId: parsed.data.classGroupId },
    })

    if (scheduleSlots.length === 0) {
      return errorState("No schedule slots found for this class")
    }

    const existingSessions = await prisma.classSession.findMany({
      where: {
        classGroupId: parsed.data.classGroupId,
        date: {
          gte: startOfDay(parsed.data.startDate),
          lte: startOfDay(parsed.data.endDate),
        },
      },
      select: {
        date: true,
        startTime: true,
      },
    })

    const existingKeys = new Set(
      existingSessions.map((session) => sessionKey(session.date, session.startTime))
    )

    const sessionsToCreate: {
      classGroupId: string
      date: Date
      startTime: string
      endTime: string
      isTest: boolean
      status: SessionStatus
    }[] = []

    for (const slot of scheduleSlots) {
      const dates = getDatesForDayOfWeek(
        parsed.data.startDate,
        parsed.data.endDate,
        slot.dayOfWeek
      )

      for (const date of dates) {
        const key = sessionKey(date, slot.startTime)
        if (existingKeys.has(key)) {
          continue
        }

        existingKeys.add(key)
        sessionsToCreate.push({
          classGroupId: parsed.data.classGroupId,
          date: startOfDay(date),
          startTime: slot.startTime,
          endTime: slot.endTime,
          isTest: slot.isTestSlot,
          status: SessionStatus.SCHEDULED,
        })
      }
    }

    if (sessionsToCreate.length === 0) {
      revalidateSessionPaths()
      return successState("No new sessions to create", { created: 0 })
    }

    const result = await prisma.classSession.createMany({
      data: sessionsToCreate,
    })

    revalidateSessionPaths()
    return successState(`Created ${result.count} session${result.count === 1 ? "" : "s"}`, {
      created: result.count,
    })
  } catch {
    return errorState("Failed to generate sessions")
  }
}

export const updateSession = async (
  sessionId: string,
  data: {
    homeworkNote?: string
    isTest?: boolean
    status?: SessionStatus
  }
): Promise<ActionState> => {
  const parsed = updateSessionSchema.safeParse({
    sessionId,
    ...data,
  })

  if (!parsed.success) {
    return errorState(
      "Invalid session update",
      zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors)
    )
  }

  const { sessionId: id, homeworkNote, isTest, status } = parsed.data

  if (homeworkNote === undefined && isTest === undefined && status === undefined) {
    return errorState("No session fields provided to update")
  }

  try {
    await prisma.classSession.update({
      where: { id },
      data: {
        ...(homeworkNote !== undefined ? { homeworkNote } : {}),
        ...(isTest !== undefined ? { isTest } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    })

    revalidateSessionPaths(id)
    return successState("Session updated successfully")
  } catch {
    return errorState("Failed to update session")
  }
}

export const markAttendance = async (
  sessionId: string,
  studentId: string,
  status: AttendanceStatus,
  note?: string
): Promise<ActionState<{ id: string }>> => {
  const parsed = markAttendanceSchema.safeParse({ sessionId, studentId, status, note })

  if (!parsed.success) {
    return errorState(
      "Invalid attendance details",
      zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors)
    )
  }

  try {
    const attendance = await prisma.attendance.upsert({
      where: {
        sessionId_studentId: {
          sessionId: parsed.data.sessionId,
          studentId: parsed.data.studentId,
        },
      },
      create: {
        sessionId: parsed.data.sessionId,
        studentId: parsed.data.studentId,
        status: parsed.data.status,
        note: parsed.data.note,
      },
      update: {
        status: parsed.data.status,
        note: parsed.data.note,
      },
    })

    revalidateSessionPaths(parsed.data.sessionId)
    return successState("Attendance saved successfully", { id: attendance.id })
  } catch {
    return errorState("Failed to save attendance")
  }
}

export const bulkMarkAttendance = async (
  sessionId: string,
  records: { studentId: string; status: AttendanceStatus }[]
): Promise<ActionState<{ count: number }>> => {
  const parsed = bulkMarkAttendanceSchema.safeParse({ sessionId, records })

  if (!parsed.success) {
    return errorState(
      "Invalid bulk attendance details",
      zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors)
    )
  }

  try {
    await prisma.$transaction(
      parsed.data.records.map((record) =>
        prisma.attendance.upsert({
          where: {
            sessionId_studentId: {
              sessionId: parsed.data.sessionId,
              studentId: record.studentId,
            },
          },
          create: {
            sessionId: parsed.data.sessionId,
            studentId: record.studentId,
            status: record.status,
          },
          update: {
            status: record.status,
          },
        })
      )
    )

    revalidateSessionPaths(parsed.data.sessionId)
    return successState("Attendance saved successfully", { count: parsed.data.records.length })
  } catch {
    return errorState("Failed to save attendance")
  }
}

export const linkTopicsToSession = async (
  sessionId: string,
  topicIds: string[]
): Promise<ActionState<{ linked: number }>> => {
  const parsed = linkTopicsSchema.safeParse({ sessionId, topicIds })

  if (!parsed.success) {
    return errorState(
      "Invalid topic link details",
      zodErrorsToFieldErrors(parsed.error.flatten().fieldErrors)
    )
  }

  try {
    const session = await prisma.classSession.findUnique({
      where: { id: parsed.data.sessionId },
    })

    if (!session) {
      return errorState("Session not found")
    }

    if (parsed.data.topicIds.length > 0) {
      const topics = await prisma.topic.findMany({
        where: { id: { in: parsed.data.topicIds } },
        select: { id: true },
      })

      if (topics.length !== parsed.data.topicIds.length) {
        return errorState("One or more topics were not found")
      }
    }

    await prisma.$transaction([
      prisma.sessionTopic.deleteMany({
        where: { sessionId: parsed.data.sessionId },
      }),
      ...(parsed.data.topicIds.length > 0
        ? [
            prisma.sessionTopic.createMany({
              data: parsed.data.topicIds.map((topicId) => ({
                sessionId: parsed.data.sessionId,
                topicId,
              })),
            }),
          ]
        : []),
    ])

    revalidateSessionPaths(parsed.data.sessionId)
    return successState("Session topics updated successfully", {
      linked: parsed.data.topicIds.length,
    })
  } catch {
    return errorState("Failed to link topics to session")
  }
}
