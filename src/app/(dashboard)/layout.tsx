import { AppShell } from "@/components/layout/app-shell"

export const dynamic = "force-dynamic"

export default function DashboardLayout({ children }: LayoutProps<"/">) {  return <AppShell>{children}</AppShell>
}
