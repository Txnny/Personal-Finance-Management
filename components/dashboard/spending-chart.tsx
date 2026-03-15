"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import type { CategorySpending } from "@/lib/types"

interface SpendingChartProps {
  data: CategorySpending[]
}

export function SpendingChart({ data }: SpendingChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: CategorySpending }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{item.category}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(item.amount)} ({item.percentage.toFixed(1)}%)
          </p>
        </div>
      )
    }
    return null
  }

  const renderLegend = () => {
    return (
      <div className="flex flex-wrap justify-center gap-4 px-2 pt-4">
        {data.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="h-3 w-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground">{entry.category}</span>
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="border-border/50 bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            Spending by Category
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No spending data available. Upload a statement to get started.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Spending by Category
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="amount"
              nameKey="category"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
