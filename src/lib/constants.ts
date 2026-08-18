import { InvoiceStatus, StudentStatus, AttendanceStatus } from "@prisma/client"

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  LEFT: "Left",
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partial",
  PAID: "Paid",
  WAIVED: "Waived",
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
}

export const GRADES = ["6", "7", "8", "9", "10", "11", "12", "O/L", "A/L"] as const

export const CLASS_COLOURS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
  "#64748b",
] as const

export const calculateGrade = (percentage: number): string => {
  if (percentage >= 75) return "A"
  if (percentage >= 65) return "B"
  if (percentage >= 55) return "C"
  if (percentage >= 45) return "S"
  return "F"
}

export const calculatePercentage = (obtained: number, total: number): number => {
  if (total === 0) return 0
  return Math.round((obtained / total) * 100)
}

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/students", label: "Students", icon: "Users" },
  { href: "/classes", label: "Classes", icon: "BookOpen" },
  { href: "/schedule", label: "Schedule", icon: "Calendar" },
  { href: "/fees", label: "Fees", icon: "Wallet" },
  { href: "/assignments", label: "Assignments", icon: "ClipboardList" },
  { href: "/tests", label: "Tests", icon: "FileText" },
  { href: "/syllabus", label: "Syllabus", icon: "GraduationCap" },
  { href: "/reports", label: "Reports", icon: "BarChart3" },
  { href: "/settings", label: "Settings", icon: "Settings" },
] as const
