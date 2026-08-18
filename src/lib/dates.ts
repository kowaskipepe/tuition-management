import { format, parseISO, startOfDay, addDays, eachDayOfInterval, getDay } from "date-fns"

export const formatDate = (date: Date | string, pattern = "dd MMM yyyy"): string => {
  const d = typeof date === "string" ? parseISO(date) : date
  return format(d, pattern)
}

export const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(":")
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? "PM" : "AM"
  const displayHour = h % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
export const DAY_NAMES_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

export const getDatesForDayOfWeek = (
  startDate: Date,
  endDate: Date,
  dayOfWeek: number
): Date[] => {
  return eachDayOfInterval({ start: startOfDay(startDate), end: startOfDay(endDate) }).filter(
    (date) => getDay(date) === dayOfWeek
  )
}

export const periodMonthFromDate = (date: Date): string => format(date, "yyyy-MM")

export const periodMonthLabel = (periodMonth: string): string => {
  const [year, month] = periodMonth.split("-")
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1)
  return format(date, "MMMM yyyy")
}

export { format, parseISO, startOfDay, addDays, eachDayOfInterval, getDay }
