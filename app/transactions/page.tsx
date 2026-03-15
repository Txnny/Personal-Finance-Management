import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import { TransactionList } from "@/components/transactions/transaction-list"
import { TransactionFilters } from "@/components/transactions/transaction-filters"
import type { Transaction, Category } from "@/lib/types"

const PAGE_SIZE = 25

interface PageProps {
  searchParams: Promise<{
    type?: string
    category?: string
    search?: string
    startDate?: string
    endDate?: string
    month?: string
    page?: string
  }>
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const currentPage = Math.max(1, parseInt(params.page || "1", 10))
  const offset = (currentPage - 1) * PAGE_SIZE

  // Build filtered base query
  function applyFilters(query: ReturnType<typeof supabase.from>) {
    let q = query.eq("user_id", user!.id)

    if (params.type && params.type !== "all") {
      q = q.eq("type", params.type)
    }
    if (params.category && params.category !== "all") {
      q = q.eq("category_id", params.category)
    }
    if (params.search) {
      q = q.ilike("description", `%${params.search}%`)
    }
    if (params.startDate) {
      q = q.gte("date", params.startDate)
    }
    if (params.endDate) {
      q = q.lte("date", params.endDate)
    }

    return q
  }

  // Count query (no pagination)
  const countQuery = applyFilters(
    supabase.from("transactions").select("id", { count: "exact", head: true })
  )
  const { count: totalCount } = await countQuery

  // Data query with pagination
  const dataQuery = applyFilters(
    supabase
      .from("transactions")
      .select("*, category:categories(*), bank_account:bank_accounts(*)")
  )
    .order("date", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const { data: transactions } = await dataQuery

  // Get categories for filter dropdown
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .order("name")

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <main className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Transactions
            </h2>
            <p className="text-muted-foreground">
              View, filter, and manage all your transactions
            </p>
          </div>
          {totalCount != null && totalCount > 0 && (
            <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
              {totalCount.toLocaleString()} total
            </span>
          )}
        </div>

        <div className="space-y-6">
          <TransactionFilters
            categories={(categories || []) as Category[]}
            currentFilters={params}
          />

          <TransactionList
            transactions={(transactions || []) as Transaction[]}
            categories={(categories || []) as Category[]}
            totalCount={totalCount ?? 0}
            currentPage={currentPage}
          />
        </div>
      </main>
    </div>
  )
}
