"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AttendanceStatus } from "@prisma/client"
import { toast } from "sonner"
import { Save } from "lucide-react"
import {
  bulkMarkAttendance,
  linkTopicsToSession,
  updateSession,
} from "@/actions/sessions"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ATTENDANCE_STATUS_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"

type EnrolledStudent = {
  id: string
  name: string
  attendanceStatus: AttendanceStatus | null
}

type TopicOption = {
  id: string
  title: string
  sortOrder: number
}

type SessionDetailPanelProps = {
  sessionId: string
  homeworkNote: string | null
  isTest: boolean
  students: EnrolledStudent[]
  topics: TopicOption[]
  linkedTopicIds: string[]
}

const ATTENDANCE_STATUSES = Object.keys(ATTENDANCE_STATUS_LABELS) as AttendanceStatus[]

const ATTENDANCE_BUTTON_VARIANTS: Record<
  AttendanceStatus,
  "default" | "outline" | "secondary" | "destructive"
> = {
  PRESENT: "default",
  ABSENT: "destructive",
  LATE: "secondary",
  EXCUSED: "outline",
}

export const SessionDetailPanel = ({
  sessionId,
  homeworkNote: initialHomework,
  isTest: initialIsTest,
  students,
  topics,
  linkedTopicIds: initialLinkedTopicIds,
}: SessionDetailPanelProps) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [homeworkNote, setHomeworkNote] = useState(initialHomework ?? "")
  const [isTest, setIsTest] = useState(initialIsTest)
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(() => {
    const initial: Record<string, AttendanceStatus> = {}
    for (const student of students) {
      initial[student.id] = student.attendanceStatus ?? AttendanceStatus.PRESENT
    }
    return initial
  })
  const [linkedTopicIds, setLinkedTopicIds] = useState<string[]>(initialLinkedTopicIds)

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh()
    })
  }

  const handleAttendanceChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }))
  }

  const handleSaveAttendance = () => {
    startTransition(async () => {
      const records = students.map((student) => ({
        studentId: student.id,
        status: attendance[student.id] ?? AttendanceStatus.PRESENT,
      }))

      const result = await bulkMarkAttendance(sessionId, records)
      if (result.success) {
        toast.success(result.message)
        handleRefresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  const handleSaveHomework = () => {
    startTransition(async () => {
      const result = await updateSession(sessionId, { homeworkNote })
      if (result.success) {
        toast.success(result.message)
        handleRefresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  const handleToggleTest = (checked: boolean) => {
    setIsTest(checked)
    startTransition(async () => {
      const result = await updateSession(sessionId, { isTest: checked })
      if (result.success) {
        toast.success(result.message)
        handleRefresh()
      } else {
        toast.error(result.message)
        setIsTest(!checked)
      }
    })
  }

  const handleToggleTopic = (topicId: string, checked: boolean) => {
    setLinkedTopicIds((prev) =>
      checked ? [...prev, topicId] : prev.filter((id) => id !== topicId)
    )
  }

  const handleSaveTopics = () => {
    startTransition(async () => {
      const result = await linkTopicsToSession(sessionId, linkedTopicIds)
      if (result.success) {
        toast.success(result.message)
        handleRefresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Attendance</CardTitle>
          <Button
            size="sm"
            onClick={handleSaveAttendance}
            disabled={isPending || students.length === 0}
            aria-label="Save attendance"
          >
            <Save />
            Save Attendance
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {students.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">
              No students enrolled in this class.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Mark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const currentStatus = attendance[student.id] ?? AttendanceStatus.PRESENT

                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>
                        <StatusBadge
                          status={currentStatus}
                          label={ATTENDANCE_STATUS_LABELS[currentStatus]}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {ATTENDANCE_STATUSES.map((status) => (
                            <Button
                              key={status}
                              size="xs"
                              variant={
                                currentStatus === status
                                  ? ATTENDANCE_BUTTON_VARIANTS[status]
                                  : "outline"
                              }
                              onClick={() => handleAttendanceChange(student.id, status)}
                              aria-label={`Mark ${student.name} as ${ATTENDANCE_STATUS_LABELS[status]}`}
                              aria-pressed={currentStatus === status}
                              className={cn(
                                currentStatus !== status && "opacity-60"
                              )}
                            >
                              {ATTENDANCE_STATUS_LABELS[status]}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Homework</CardTitle>
          <Button
            size="sm"
            onClick={handleSaveHomework}
            disabled={isPending}
            aria-label="Save homework note"
          >
            <Save />
            Save
          </Button>
        </CardHeader>
        <CardContent>
          <Textarea
            value={homeworkNote}
            onChange={(e) => setHomeworkNote(e.target.value)}
            placeholder="Add homework notes for this session…"
            rows={4}
            aria-label="Homework note"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Syllabus Topics</CardTitle>
            <p className="text-sm text-muted-foreground">
              Link topics covered in this session
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleSaveTopics}
            disabled={isPending}
            aria-label="Save linked topics"
          >
            <Save />
            Save Topics
          </Button>
        </CardHeader>
        <CardContent>
          {topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No syllabus topics found for this class subject and grade.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {topics.map((topic) => {
                const isChecked = linkedTopicIds.includes(topic.id)

                return (
                  <label
                    key={topic.id}
                    htmlFor={`topic-${topic.id}`}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`topic-${topic.id}`}
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleToggleTopic(topic.id, checked === true)
                      }
                    />
                    <span className="text-sm">{topic.title}</span>
                  </label>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <div className="space-y-0.5">
            <Label htmlFor="is-test-toggle">Test Session</Label>
            <p className="text-sm text-muted-foreground">
              Mark this session as a test or exam
            </p>
          </div>
          <Switch
            id="is-test-toggle"
            checked={isTest}
            onCheckedChange={handleToggleTest}
            aria-label="Toggle test session"
          />
        </CardContent>
      </Card>
    </div>
  )
}
