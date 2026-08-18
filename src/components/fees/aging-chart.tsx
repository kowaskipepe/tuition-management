"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatLkr } from "@/lib/currency"
import type { AgingBuckets } from "@/actions/fees"

type AgingChartProps = {
  buckets: AgingBuckets
}

export const AgingChart = ({ buckets }: AgingChartProps) => {
  const data = [
    { bucket: "0-30 days", amount: buckets["0-30"] },
    { bucket: "31-60 days", amount: buckets["31-60"] },
    { bucket: "61-90 days", amount: buckets["61-90"] },
    { bucket: "90+ days", amount: buckets["90+"] },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outstanding by Age</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="bucket"
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                tickFormatter={(value) => formatLkr(value as number)}
              />
              <Tooltip
                formatter={(value) => [formatLkr(value as number), "Outstanding"]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--popover))",
                }}
              />
              <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
