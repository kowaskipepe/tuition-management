"use client"

import { useMemo, useState, useTransition } from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { saveQuestionScores } from "@/actions/tests"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { calculateGrade, calculatePercentage } from "@/lib/constants"

interface QuestionColumn {
  id: string
  number: number
  text: string
  maxMarks: number
}

interface StudentRow {
  id: string
  name: string
}

interface ResultData {
  totalMarks: number
  grade: string | null
}

interface MarksGridProps {
  assessmentId: string
  assessmentMaxMarks: number
  questions: QuestionColumn[]
  students: StudentRow[]
  initialScores: Record<string, Record<string, number>>
  results: Record<string, ResultData>
}

const scoreKey = (studentId: string, questionId: string) => `${studentId}:${questionId}`

export function MarksGrid({
  assessmentId,
  assessmentMaxMarks,
  questions,
  students,
  initialScores,
  results,
}: MarksGridProps) {
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const student of students) {
      for (const question of questions) {
        const key = scoreKey(student.id, question.id)
        const value = initialScores[student.id]?.[question.id]
        initial[key] = value != null ? String(value) : "0"
      }
    }
    return initial
  })
  const [isPending, startTransition] = useTransition()

  const computedTotals = useMemo(() => {
    const totals: Record<string, { total: number; percentage: number; grade: string }> = {}

    for (const student of students) {
      let total = 0
      for (const question of questions) {
        const key = scoreKey(student.id, question.id)
        const parsed = Number.parseInt(scores[key] ?? "0", 10)
        total += Number.isNaN(parsed) ? 0 : parsed
      }
      const percentage = calculatePercentage(total, assessmentMaxMarks)
      totals[student.id] = {
        total,
        percentage,
        grade: calculateGrade(percentage),
      }
    }

    return totals
  }, [scores, students, questions, assessmentMaxMarks])

  const handleScoreChange = (studentId: string, questionId: string, value: string) => {
    setScores((prev) => ({
      ...prev,
      [scoreKey(studentId, questionId)]: value,
    }))
  }

  const handleSave = () => {
    const payload: { questionId: string; studentId: string; marks: number }[] = []

    for (const student of students) {
      for (const question of questions) {
        const key = scoreKey(student.id, question.id)
        const parsed = Number.parseInt(scores[key] ?? "0", 10)

        if (Number.isNaN(parsed) || parsed < 0) {
          toast.error(`Invalid marks for ${student.name}, Q${question.number}`)
          return
        }

        if (parsed > question.maxMarks) {
          toast.error(
            `Marks for ${student.name}, Q${question.number} cannot exceed ${question.maxMarks}`
          )
          return
        }

        payload.push({
          questionId: question.id,
          studentId: student.id,
          marks: parsed,
        })
      }
    }

    startTransition(async () => {
      const result = await saveQuestionScores(assessmentId, payload)

      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  if (students.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No students enrolled in this class yet.
      </p>
    )
  }

  if (questions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This assessment has no questions.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-background min-w-[160px]">
                Student
              </TableHead>
              {questions.map((question) => (
                <TableHead key={question.id} className="min-w-[100px] text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>Q{question.number}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      /{question.maxMarks}
                    </span>
                  </div>
                </TableHead>
              ))}
              <TableHead className="min-w-[80px] text-center">Total</TableHead>
              <TableHead className="min-w-[80px] text-center">%</TableHead>
              <TableHead className="min-w-[60px] text-center">Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => {
              const computed = computedTotals[student.id]
              const saved = results[student.id]

              return (
                <TableRow key={student.id}>
                  <TableCell className="sticky left-0 z-10 bg-background font-medium">
                    {student.name}
                  </TableCell>
                  {questions.map((question) => {
                    const key = scoreKey(student.id, question.id)

                    return (
                      <TableCell key={question.id} className="p-1">
                        <Input
                          type="number"
                          min={0}
                          max={question.maxMarks}
                          value={scores[key] ?? "0"}
                          onChange={(event) =>
                            handleScoreChange(student.id, question.id, event.target.value)
                          }
                          className="h-8 w-16 text-center"
                          aria-label={`Marks for ${student.name}, question ${question.number}`}
                          disabled={isPending}
                        />
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-center font-medium tabular-nums">
                    {computed.total}
                    {saved && saved.totalMarks !== computed.total && (
                      <span className="ml-1 text-xs text-muted-foreground">*</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {computed.percentage}%
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={computed.grade === "F" ? "destructive" : "default"}>
                      {computed.grade}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Max marks: {assessmentMaxMarks} · Grades from Result model update on save
        </p>
        <Button onClick={handleSave} disabled={isPending} aria-label="Save all marks">
          <Save />
          {isPending ? "Saving…" : "Save Marks"}
        </Button>
      </div>
    </div>
  )
}
