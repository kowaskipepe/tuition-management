import { getSettings } from "@/actions/settings"
import { PageHeader } from "@/components/layout/page-header"
import { SettingsForm } from "@/components/settings/settings-form"

export default async function SettingsPage() {
  const settings = await getSettings()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your tuition centre preferences."
      />
      <SettingsForm settings={settings} />
    </div>
  )
}
