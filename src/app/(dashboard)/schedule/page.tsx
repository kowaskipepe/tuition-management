import Link from "next/link"
import { GenerateAllSessionsButton } from "@/components/schedule/generate-all-sessions-button"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import { DAY_NAMES } from "@/lib/dates"
import { formatTime } from "@/lib/dates"
import { prisma } from "@/lib/db"
import { cn } from "@/lib/utils"
import { Calendar } from "lucide-react"

type ScheduleSlotWithClass = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isTestSlot: boolean
  classGroup: {
    id: string
    name: string
    colour: string
  }
}

const buildTimeSlotKey = (startTime: string, endTime: string) => `${startTime}-${endTime}`

export default async function SchedulePage() {
  const slots = await prisma.scheduleSlot.findMany({
    include: {
      classGroup: {
        select: { id: true, name: true, colour: true },
      },
    },
    orderBy: [{ startTime: "asc" }, { dayOfWeek: "asc" }],
  })

  const classGroupIds = [...new Set(slots.map((slot) => slot.classGroupId))]

  const timeSlotKeys = [...new Set(slots.map((s) => buildTimeSlotKey(s.startTime, s.endTime)))]
  timeSlotKeys.sort((a, b) => {
    const startA = a.split("-")[0]
    const startB = b.split("-")[0]
    return startA.localeCompare(startB)
  })

  const slotsByDayAndTime = new Map<string, ScheduleSlotWithClass[]>()

  for (const slot of slots) {
    const key = `${slot.dayOfWeek}-${buildTimeSlotKey(slot.startTime, slot.endTime)}`
    const existing = slotsByDayAndTime.get(key) ?? []
    existing.push(slot)
    slotsByDayAndTime.set(key, existing)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule"
        description="Weekly timetable for all classes"
        actions={<GenerateAllSessionsButton classGroupIds={classGroupIds} />}
      />

      {slots.length === 0 ? (
        <EmptyState
          icon={<Calendar className="size-10" />}
          title="No schedule slots"
          description="Add schedule slots to your classes to see the weekly timetable."
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0 pt-6">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[100px_repeat(7,1fr)] border-b">
                <div className="p-3 text-sm font-medium text-muted-foreground">Time</div>
                {DAY_NAMES.map((day) => (
                  <div
                    key={day}
                    className="border-l p-3 text-center text-sm font-medium"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {timeSlotKeys.map((timeKey) => {
                const [startTime, endTime] = timeKey.split("-")
                const timeLabel = `${formatTime(startTime)} – ${formatTime(endTime)}`

                return (
                  <div
                    key={timeKey}
                    className="grid grid-cols-[100px_repeat(7,1fr)] border-b last:border-b-0"
                  >
                    <div className="flex items-start p-3 text-xs text-muted-foreground">
                      {timeLabel}
                    </div>
                    {DAY_NAMES.map((_, dayIndex) => {
                      const cellSlots =
                        slotsByDayAndTime.get(`${dayIndex}-${timeKey}`) ?? []

                      return (
                        <div
                          key={`${dayIndex}-${timeKey}`}
                          className="min-h-[72px] border-l p-2"
                        >
                          <div className="flex flex-col gap-1.5">
                            {cellSlots.map((slot) => (
                              <Link
                                key={slot.id}
                                href={`/classes/${slot.classGroup.id}`}
                                className={cn(
                                  "block rounded-md px-2 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90",
                                  slot.isTestSlot && "ring-2 ring-white/30 ring-offset-1"
                                )}
                                style={{ backgroundColor: slot.classGroup.colour }}
                                aria-label={`${slot.classGroup.name} on ${DAY_NAMES[dayIndex]} at ${timeLabel}`}
                              >
                                {slot.classGroup.name}
                                {slot.isTestSlot && (
                                  <span className="ml-1 opacity-80">(Test)</span>
                                )}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
