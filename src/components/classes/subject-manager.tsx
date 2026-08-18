"use client"

import { useActionState, useEffect } from "react"
import { BookMarked } from "lucide-react"
import { toast } from "sonner"
import { createSubject } from "@/actions/subjects"
import { initialActionState, type ActionState } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

type SubjectItem = {
  id: string
  name: string
  description: string | null
  _count: {
    classGroups: number
  }
}

type SubjectManagerProps = {
  subjects: SubjectItem[]
}

export const SubjectManager = ({ subjects }: SubjectManagerProps) => {
  const [state, formAction, isPending] = useActionState(
    async (prevState: ActionState, formData: FormData): Promise<ActionState> => {
      const result = await createSubject(prevState, formData)
      return {
        success: result.success,
        message: result.message,
        errors: result.errors,
      }
    },
    initialActionState()
  )

  useEffect(() => {
    if (!state.message) return
    if (state.success) {
      toast.success(state.message)
      return
    }
    toast.error(state.message)
  }, [state])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookMarked className="size-4" />
          Subjects
        </CardTitle>
        <CardDescription>
          Manage subjects used when creating class groups.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {subjects.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {subjects.map((subject) => (
              <Badge key={subject.id} variant="secondary">
                {subject.name}
                {subject._count.classGroups > 0 && (
                  <span className="text-muted-foreground">
                    · {subject._count.classGroups} class
                    {subject._count.classGroups === 1 ? "" : "es"}
                  </span>
                )}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No subjects yet. Add your first subject below.</p>
        )}

        <form action={formAction} className="grid gap-3 border-t pt-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="subject-name">Subject name</Label>
              <Input
                id="subject-name"
                name="name"
                placeholder="e.g. Mathematics"
                required
                aria-invalid={Boolean(state.errors?.name)}
              />
              {state.errors?.name && (
                <p className="text-xs text-destructive">{state.errors.name[0]}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subject-description">Description (optional)</Label>
              <Input
                id="subject-description"
                name="description"
                placeholder="Short description"
                aria-invalid={Boolean(state.errors?.description)}
              />
            </div>
          </div>
          <div>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Adding..." : "Add Subject"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
