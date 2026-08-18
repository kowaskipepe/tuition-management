"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  Wallet,
  ClipboardList,
  FileText,
  GraduationCap,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"

const ICON_MAP = {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  Wallet,
  ClipboardList,
  FileText,
  GraduationCap,
  BarChart3,
  Settings,
} as const

export const Sidebar = () => {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const handleToggle = () => setCollapsed((prev) => !prev)

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <Link href="/" className="flex flex-col" aria-label="TuitionHub home">
            <span className="text-lg font-bold tracking-tight">TuitionHub</span>
            <span className="text-xs text-muted-foreground">Management System</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(collapsed && "mx-auto")}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="flex flex-col gap-1" aria-label="Sidebar navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon]
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive && "bg-sidebar-primary text-sidebar-primary-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </aside>
  )
}
