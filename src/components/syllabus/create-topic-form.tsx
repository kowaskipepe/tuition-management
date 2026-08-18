"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { createTopic } from "@/actions/syllabus"
import { Button } from "@/components/ui/button"
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
import { GRADES } from "@/lib/constants"

interface SubjectOption {
  id: string
  name: string
}

interface CreateTopicFormProps {
  subjects: SubjectOption[]
}

export function CreateTopicForm({ subjects }: CreateTopicFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "")
  const [grade, setGrade] = useState<string>(GRADES[0])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [sortOrder, setSortOrder] = useState("0")

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (!subjectId) {
      toast.error("Select a subject")
      return
    }

    if (!title.trim()) {
      toast.error("Enter a topic title")
      return
    }

    const parsedSortOrder = Number.parseInt(sortOrder, 10)

    startTransition(async () => {
      const result = await createTopic(
        subjectId,
        grade,
        title.trim(),
        description.trim() || undefined,
        Number.isNaN(parsedSortOrder) ? 0 : parsedSortOrder
      )

      if (result.success) {
        toast.success(result.message)
        setTitle("")
        setDescription("")
        setSortOrder("0")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  if (subjects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create a subject before adding syllabus topics.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="topic-subject">Subject</Label>
        <Select
          value={subjectId}
          onValueChange={(value) => setSubjectId(value ?? "")}
          disabled={isPending}
        >
          <SelectTrigger id="topic-subject" className="w-full">
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="topic-grade">Grade</Label>
        <Select
          value={grade}
          onValueChange={(value) => setGrade(value ?? GRADES[0])}
          disabled={isPending}
        >
          <SelectTrigger id="topic-grade" className="w-full">
            <SelectValue placeholder="Select grade" />
          </SelectTrigger>
          <SelectContent>
            {GRADES.map((gradeOption) => (
              <SelectItem key={gradeOption} value={gradeOption}>
                Grade {gradeOption}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="topic-title">Topic Title</Label>
        <Input
          id="topic-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Quadratic Equations"
          disabled={isPending}
          required
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="topic-description">Description</Label>
        <Textarea
          id="topic-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional details about this topic"
          disabled={isPending}
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="topic-sort">Sort Order</Label>
        <Input
          id="topic-sort"
          type="number"
          min={0}
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="flex items-end sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          <Plus />
          {isPending ? "Creating…" : "Add Topic"}
        </Button>
      </div>
    </form>
  )
}
