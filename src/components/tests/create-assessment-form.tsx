"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { createAssessment } from "@/actions/tests"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface QuestionDraft {
  number: number
  text: string
  maxMarks: number
}

interface ClassGroupOption {
  id: string
  name: string
  grade: string
  subjectName: string
  colour: string
}

interface CreateAssessmentFormProps {
  classGroups: ClassGroupOption[]
}

const createEmptyQuestion = (number: number): QuestionDraft => ({
  number,
  text: "",
  maxMarks: 10,
})

export function CreateAssessmentForm({ classGroups }: CreateAssessmentFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [classGroupId, setClassGroupId] = useState(classGroups[0]?.id ?? "")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [testDate, setTestDate] = useState("")
  const [questions, setQuestions] = useState<QuestionDraft[]>([createEmptyQuestion(1)])

  const totalMarks = questions.reduce((sum, question) => sum + question.maxMarks, 0)

  const handleAddQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion(prev.length + 1)])
  }

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) return
    setQuestions((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((question, i) => ({ ...question, number: i + 1 }))
    )
  }

  const handleQuestionChange = (
    index: number,
    field: keyof QuestionDraft,
    value: string | number
  ) => {
    setQuestions((prev) =>
      prev.map((question, i) =>
        i === index ? { ...question, [field]: value } : question
      )
    )
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (!classGroupId) {
      toast.error("Select a class group")
      return
    }

    if (!title.trim()) {
      toast.error("Enter a title")
      return
    }

    if (!testDate) {
      toast.error("Select a test date")
      return
    }

    const validQuestions = questions.filter((q) => q.text.trim())
    if (validQuestions.length === 0) {
      toast.error("Add at least one question")
      return
    }

    startTransition(async () => {
      const result = await createAssessment(
        classGroupId,
        title.trim(),
        description.trim() || undefined,
        testDate,
        validQuestions
      )

      if (result.success && result.data?.id) {
        toast.success(result.message)
        router.push(`/tests/${result.data.id}/marks`)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  if (classGroups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create a class group before adding assessments.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assessment Details</CardTitle>
          <CardDescription>Basic information for this test</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="class-group">Class Group</Label>
            <Select
              value={classGroupId}
              onValueChange={(value) => setClassGroupId(value ?? "")}
              disabled={isPending}
            >
              <SelectTrigger id="class-group" className="w-full">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    <span
                      className="mr-2 inline-block size-2 rounded-full"
                      style={{ backgroundColor: group.colour }}
                    />
                    {group.name} · {group.subjectName} · Grade {group.grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Term Test 1"
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional notes about this assessment"
              disabled={isPending}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="test-date">Test Date</Label>
            <Input
              id="test-date"
              type="date"
              value={testDate}
              onChange={(event) => setTestDate(event.target.value)}
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Total Marks</Label>
            <Input value={totalMarks} readOnly aria-readonly className="bg-muted/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <CardDescription>
            Add questions with individual mark allocations ({questions.length} question
            {questions.length !== 1 ? "s" : ""})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((question, index) => (
            <div
              key={question.number}
              className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[auto_1fr_auto_auto]"
            >
              <div className="flex items-center">
                <span className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {question.number}
                </span>
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor={`question-text-${index}`}>Question Text</Label>
                <Input
                  id={`question-text-${index}`}
                  value={question.text}
                  onChange={(event) =>
                    handleQuestionChange(index, "text", event.target.value)
                  }
                  placeholder="Enter question"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`question-marks-${index}`}>Max Marks</Label>
                <Input
                  id={`question-marks-${index}`}
                  type="number"
                  min={1}
                  value={question.maxMarks}
                  onChange={(event) =>
                    handleQuestionChange(
                      index,
                      "maxMarks",
                      Number.parseInt(event.target.value, 10) || 1
                    )
                  }
                  disabled={isPending}
                  className="w-24"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemoveQuestion(index)}
                  disabled={isPending || questions.length <= 1}
                  aria-label={`Remove question ${question.number}`}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={handleAddQuestion}
            disabled={isPending}
          >
            <Plus />
            Add Question
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/tests")}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create Assessment"}
        </Button>
      </div>
    </form>
  )
}
