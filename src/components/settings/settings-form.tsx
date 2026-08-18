"use client"

import { useActionState, useEffect } from "react"
import { toast } from "sonner"
import { updateSettingsForm } from "@/actions/settings"
import { initialActionState } from "@/lib/actions"
import { centsToDisplay } from "@/lib/currency"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Settings } from "@prisma/client"

type SettingsFormProps = {
  settings: Settings
}

export const SettingsForm = ({ settings }: SettingsFormProps) => {
  const [state, formAction, pending] = useActionState(updateSettingsForm, initialActionState())

  useEffect(() => {
    if (state.success) toast.success(state.message)
    if (!state.success && state.message) toast.error(state.message)
  }, [state])

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Teacher Profile</CardTitle>
          <CardDescription>Your contact information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="teacherName">Name</Label>
              <Input
                id="teacherName"
                name="teacherName"
                defaultValue={settings.teacherName}
                aria-label="Teacher name"
              />
              {state.errors?.teacherName && (
                <p className="text-sm text-destructive" role="alert">
                  {state.errors.teacherName[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacherPhone">Phone</Label>
              <Input
                id="teacherPhone"
                name="teacherPhone"
                defaultValue={settings.teacherPhone ?? ""}
                aria-label="Teacher phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacherEmail">Email</Label>
              <Input
                id="teacherEmail"
                name="teacherEmail"
                type="email"
                defaultValue={settings.teacherEmail ?? ""}
                aria-label="Teacher email"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fee Defaults</CardTitle>
          <CardDescription>Default settings for new students and invoices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultFee">Default Monthly Fee (LKR)</Label>
              <Input
                id="defaultFee"
                name="defaultFee"
                type="number"
                defaultValue={centsToDisplay(settings.defaultFee)}
                aria-label="Default monthly fee in LKR"
              />
              {state.errors?.defaultFee && (
                <p className="text-sm text-destructive" role="alert">
                  {state.errors.defaultFee[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDayOfMonth">Due Day of Month</Label>
              <Input
                id="dueDayOfMonth"
                name="dueDayOfMonth"
                type="number"
                min={1}
                max={28}
                defaultValue={settings.dueDayOfMonth}
                aria-label="Invoice due day of month"
              />
              {state.errors?.dueDayOfMonth && (
                <p className="text-sm text-destructive" role="alert">
                  {state.errors.dueDayOfMonth[0]}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  )
}
