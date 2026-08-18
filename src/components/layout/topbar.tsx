import { ThemeToggle } from "@/components/layout/theme-toggle"

export const Topbar = () => {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-6">
      <div className="text-sm text-muted-foreground">
        Welcome back
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  )
}
