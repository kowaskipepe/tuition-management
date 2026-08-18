import { GraduationCap } from "lucide-react"
import { CreateTopicForm } from "@/components/syllabus/create-topic-form"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { prisma } from "@/lib/db"

interface TopicGroup {
  subjectId: string
  subjectName: string
  grade: string
  topics: {
    id: string
    title: string
    description: string | null
    sortOrder: number
  }[]
}

const computeCoverage = (
  syllabusTopicIds: Set<string>,
  sessionTopicIds: Set<string>
): number => {
  if (syllabusTopicIds.size === 0) return 0

  let covered = 0
  for (const topicId of syllabusTopicIds) {
    if (sessionTopicIds.has(topicId)) {
      covered += 1
    }
  }

  return Math.round((covered / syllabusTopicIds.size) * 100)
}

export default async function SyllabusPage() {
  const [subjects, topics, classGroups, sessionTopics] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.topic.findMany({
      include: { subject: true },
      orderBy: [{ subject: { name: "asc" } }, { grade: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.classGroup.findMany({
      include: { subject: true },
      orderBy: [{ subject: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.sessionTopic.findMany({
      include: {
        session: { select: { classGroupId: true } },
      },
    }),
  ])

  const topicGroups: TopicGroup[] = []
  const groupMap = new Map<string, TopicGroup>()

  for (const topic of topics) {
    const key = `${topic.subjectId}:${topic.grade}`
    let group = groupMap.get(key)

    if (!group) {
      group = {
        subjectId: topic.subjectId,
        subjectName: topic.subject.name,
        grade: topic.grade,
        topics: [],
      }
      groupMap.set(key, group)
      topicGroups.push(group)
    }

    group.topics.push({
      id: topic.id,
      title: topic.title,
      description: topic.description,
      sortOrder: topic.sortOrder,
    })
  }

  const topicsBySubjectGrade = new Map<string, Set<string>>()
  for (const topic of topics) {
    const key = `${topic.subjectId}:${topic.grade}`
    if (!topicsBySubjectGrade.has(key)) {
      topicsBySubjectGrade.set(key, new Set())
    }
    topicsBySubjectGrade.get(key)?.add(topic.id)
  }

  const sessionTopicsByClass = new Map<string, Set<string>>()
  for (const sessionTopic of sessionTopics) {
    const classGroupId = sessionTopic.session.classGroupId
    if (!sessionTopicsByClass.has(classGroupId)) {
      sessionTopicsByClass.set(classGroupId, new Set())
    }
    sessionTopicsByClass.get(classGroupId)?.add(sessionTopic.topicId)
  }

  const coverageByClass = classGroups.map((classGroup) => {
    const key = `${classGroup.subjectId}:${classGroup.grade}`
    const syllabusTopicIds = topicsBySubjectGrade.get(key) ?? new Set<string>()
    const sessionTopicIds = sessionTopicsByClass.get(classGroup.id) ?? new Set<string>()
    const coveredCount = [...syllabusTopicIds].filter((id) => sessionTopicIds.has(id)).length

    return {
      id: classGroup.id,
      name: classGroup.name,
      subjectName: classGroup.subject.name,
      grade: classGroup.grade,
      colour: classGroup.colour,
      totalTopics: syllabusTopicIds.size,
      coveredTopics: coveredCount,
      coveragePercent: computeCoverage(syllabusTopicIds, sessionTopicIds),
    }
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Syllabus"
        description="Manage topics and track coverage across class sessions"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Add Topic</CardTitle>
            <CardDescription>Create a new syllabus topic for a subject and grade</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateTopicForm
              subjects={subjects.map((subject) => ({
                id: subject.id,
                name: subject.name,
              }))}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Coverage by Class</CardTitle>
            <CardDescription>
              Percentage of syllabus topics linked to at least one session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {coverageByClass.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No class groups yet. Create classes to track syllabus coverage.
              </p>
            ) : (
              coverageByClass.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: item.colour }}
                      />
                      <span className="font-medium">{item.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.subjectName} · Grade {item.grade}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {item.coveredTopics}/{item.totalTopics} topics
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={item.coveragePercent}
                      className="flex-1"
                      aria-label={`${item.name} syllabus coverage`}
                    />
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {item.coveragePercent}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Topics by Subject & Grade</h2>

        {topicGroups.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="size-10" />}
            title="No topics yet"
            description="Add your first topic using the form above."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {topicGroups.map((group) => (
              <Card key={`${group.subjectId}:${group.grade}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {group.subjectName}
                    <Badge variant="secondary">Grade {group.grade}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {group.topics.length} topic{group.topics.length !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {group.topics.map((topic, index) => (
                      <li
                        key={topic.id}
                        className="rounded-lg border px-3 py-2"
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{topic.title}</p>
                            {topic.description && (
                              <p className="mt-0.5 text-sm text-muted-foreground">
                                {topic.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
