import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import { StatCards } from "@/components/dashboard/stat-cards"
import { SpendingChart } from "@/components/dashboard/spending-chart"
import { TrendChart } from "@/components/dashboard/trend-chart"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { UploadSection } from "@/components/dashboard/upload-section"
import { DashboardFilters } from "@/components/dashboard/dashboard-filters"
import type { DashboardStats, CategorySpending, MonthlyTrend, Transaction } from "@/lib/types"

interface PageProps {
  searchParams: Promise<{
    month?: string
  }>
}

async function getDashboardData(userId: string, selectedMonth?: string) {
  const supabase = await createClient()
  const now = new Date()
  
  // Parse selected month or use current month
  let targetDate = now
  if (selectedMonth) {
    const [year, month] = selectedMonth.split("-").map(Number)
    targetDate = new Date(year, month - 1, 1)
  }
  
  const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
  const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)
  const startOfLastMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1)
  const endOfLastMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0)

  // Get selected month transactions
  const { data: currentTransactions } = await supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .eq("user_id", userId)
    .gte("date", startOfMonth.toISOString())
    .lte("date", endOfMonth.toISOString())
    .order("date", { ascending: false })

  // Get last month transactions
  const { data: lastMonthTransactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startOfLastMonth.toISOString())
    .lte("date", endOfLastMonth.toISOString())

  // Get all recent transactions
  const { data: recentTransactions } = await supabase
    .from("transactions")
    .select("*, category:categories(*), bank_account:bank_accounts(*)")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(10)

  // Calculate current month stats
  const currentIncome = (currentTransactions || [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0)
  
  const currentExpenses = (currentTransactions || [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

  // Calculate last month stats
  const lastIncome = (lastMonthTransactions || [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0)
  
  const lastExpenses = (lastMonthTransactions || [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

  const stats: DashboardStats = {
    totalIncome: currentIncome,
    totalExpenses: currentExpenses,
    netSavings: currentIncome - currentExpenses,
    incomeChange: lastIncome > 0 ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0,
    expenseChange: lastExpenses > 0 ? ((currentExpenses - lastExpenses) / lastExpenses) * 100 : 0,
  }

  // Calculate spending by category
  const categoryTotals = new Map<string, { amount: number; color: string }>()
  const expenses = (currentTransactions || []).filter((t) => t.type === "expense")
  
  for (const t of expenses) {
    const categoryName = t.category?.name || "Uncategorized"
    const color = t.category?.color || "#6b7280"
    const current = categoryTotals.get(categoryName) || { amount: 0, color }
    categoryTotals.set(categoryName, { amount: current.amount + Math.abs(Number(t.amount)), color })
  }

  const totalSpending = Array.from(categoryTotals.values()).reduce((sum, c) => sum + c.amount, 0)
  
  const categorySpending: CategorySpending[] = Array.from(categoryTotals.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      color: data.color,
      percentage: totalSpending > 0 ? (data.amount / totalSpending) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)

  // Calculate monthly trends (last 6 months)
  const monthlyTrends: MonthlyTrend[] = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const monthName = monthStart.toLocaleString("default", { month: "short" })

    const { data: monthData } = await supabase
      .from("transactions")
      .select("amount, type")
      .eq("user_id", userId)
      .gte("date", monthStart.toISOString())
      .lte("date", monthEnd.toISOString())

    const income = (monthData || [])
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0)
    
    const expenses = (monthData || [])
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

    monthlyTrends.push({ month: monthName, income, expenses })
  }

  return {
    stats,
    categorySpending,
    monthlyTrends,
    recentTransactions: (recentTransactions || []) as Transaction[],
  }
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  const { stats, categorySpending, monthlyTrends, recentTransactions } = await getDashboardData(user.id, params.month)

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      
      <main className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h2>
            <p className="text-muted-foreground">
              Track your income, expenses, and financial goals.
            </p>
          </div>
          <DashboardFilters currentMonth={params.month} />
        </div>

        <div className="space-y-8">
          <StatCards stats={stats} />
          
          <UploadSection userId={user.id} />

          <div className="grid gap-6 lg:grid-cols-2">
            <SpendingChart data={categorySpending} />
            <TrendChart data={monthlyTrends} />
          </div>

          <RecentTransactions transactions={recentTransactions} />
        </div>
      </main>
    </div>
  )
}
