"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { MonthlyTrend } from "@/lib/types"

interface TrendChartProps {
  data: MonthlyTrend[]
}

export function TrendChart({ data }: TrendChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const CustomTooltip = ({ 
    active, 
    payload, 
    label 
  }: { 
    active?: boolean
    payload?: Array<{ value: number; dataKey: string; color: string }>
    label?: string 
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="h-2 w-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs capitalize text-muted-foreground">
                {entry.dataKey}: {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  if (data.length === 0) {
    return (
      <Card className="border-border/50 bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            Income vs Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No trend data available yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Income vs Expenses
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.55 0.18 160)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="oklch(0.55 0.18 160)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.60 0.20 30)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="oklch(0.60 0.20 30)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingTop: 16 }}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke="oklch(0.55 0.18 160)"
              strokeWidth={2}
              fill="url(#incomeGradient)"
              name="Income"
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="oklch(0.60 0.20 30)"
              strokeWidth={2}
              fill="url(#expenseGradient)"
              name="Expenses"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
