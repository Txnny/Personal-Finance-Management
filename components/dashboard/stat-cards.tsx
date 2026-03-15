"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react"
import type { DashboardStats } from "@/lib/types"
import { cn } from "@/lib/utils"

interface StatCardsProps {
  stats: DashboardStats
}

export function StatCards({ stats }: StatCardsProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : ""
    return `${sign}${change.toFixed(1)}%`
  }

  const savingsRate =
    stats.totalIncome > 0 ? (stats.netSavings / stats.totalIncome) * 100 : 0
  const savingsRateDisplay = parseFloat(savingsRate.toFixed(1))
  const progressValue = Math.max(0, Math.min(100, savingsRate))

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Income */}
      <Card className="border-border/50 bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Income</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(stats.totalIncome)}
              </p>
            </div>
            <div className="rounded-lg bg-success/10 p-2.5">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1">
            <span
              className={cn(
                "text-xs font-medium",
                stats.incomeChange >= 0 ? "text-success" : "text-destructive"
              )}
            >
              {formatChange(stats.incomeChange)}
            </span>
            <span className="text-xs text-muted-foreground">vs last month</span>
          </div>
        </CardContent>
      </Card>

      {/* Expenses */}
      <Card className="border-border/50 bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(stats.totalExpenses)}
              </p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-2.5">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1">
            <span
              className={cn(
                "text-xs font-medium",
                stats.expenseChange <= 0 ? "text-success" : "text-destructive"
              )}
            >
              {formatChange(stats.expenseChange)}
            </span>
            <span className="text-xs text-muted-foreground">vs last month</span>
          </div>
        </CardContent>
      </Card>

      {/* Net Savings */}
      <Card className="border-border/50 bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Net Savings</p>
              <p
                className={cn(
                  "text-2xl font-bold",
                  stats.netSavings >= 0 ? "text-success" : "text-destructive"
                )}
              >
                {formatCurrency(stats.netSavings)}
              </p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2.5">
              <PiggyBank className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-xs text-muted-foreground">
              {stats.netSavings >= 0
                ? "Income exceeds expenses"
                : "Spending exceeds income"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Savings Rate */}
      <Card className="border-border/50 bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Savings Rate</p>
              <p
                className={cn(
                  "text-2xl font-bold",
                  savingsRateDisplay >= 20
                    ? "text-success"
                    : savingsRateDisplay > 0
                    ? "text-foreground"
                    : "text-destructive"
                )}
              >
                {savingsRateDisplay}%
              </p>
            </div>
            <div className="rounded-lg bg-chart-2/10 p-2.5">
              <Wallet className="h-5 w-5 text-chart-2" />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <Progress value={progressValue} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {savingsRateDisplay >= 20
                ? "Great — above 20% target"
                : savingsRateDisplay > 0
                ? `${(20 - savingsRateDisplay).toFixed(1)}% below 20% target`
                : "Consider reducing expenses"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
