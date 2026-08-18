"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type MonthlyChartProps = {
  data: { month: string; billed: number; collected: number }[]
}

export const MonthlyChart = ({ data }: MonthlyChartProps) => {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No fee data yet</p>
    )
  }

  const formatted = data.map((d) => ({
    ...d,
    label: d.month.slice(5) + "/" + d.month.slice(0, 4),
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="label" className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip
          formatter={(value) => [`Rs. ${Number(value ?? 0).toLocaleString()}`, ""]}
          contentStyle={{ borderRadius: "8px" }}
        />
        <Legend />
        <Bar dataKey="billed" name="Billed" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="collected" name="Collected" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

type AgingChartProps = {
  data: { bucket: string; amount: number }[]
}

export const AgingChart = ({ data }: AgingChartProps) => {
  const formatted = data.map((d) => ({
    ...d,
    amountDisplay: d.amount / 100,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={formatted} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" className="text-xs" />
        <YAxis type="category" dataKey="bucket" width={60} className="text-xs" />
        <Tooltip formatter={(value) => [`Rs. ${Number(value ?? 0).toLocaleString()}`, "Outstanding"]} />
        <Bar dataKey="amountDisplay" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

type MarksTrendChartProps = {
  data: { label: string; percentage: number }[]
}

export const MarksTrendChart = ({ data }: MarksTrendChartProps) => {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No test results yet</p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="label" className="text-xs" />
        <YAxis domain={[0, 100]} className="text-xs" />
        <Tooltip formatter={(value) => [`${Number(value ?? 0)}%`, "Score"]} />
        <Line
          type="monotone"
          dataKey="percentage"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
