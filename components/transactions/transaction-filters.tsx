"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, X, Calendar, Filter } from "lucide-react"
import type { Category } from "@/lib/types"
import { useCallback, useState, useEffect, useMemo } from "react"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"

interface TransactionFiltersProps {
  categories: Category[]
  currentFilters: {
    type?: string
    category?: string
    search?: string
    startDate?: string
    endDate?: string
    month?: string
  }
}

// Generate last 12 months for the month filter
function generateMonthOptions() {
  const months = []
  const today = new Date()
  
  for (let i = 0; i < 12; i++) {
    const date = subMonths(today, i)
    const value = format(date, "yyyy-MM")
    const label = format(date, "MMMM yyyy")
    months.push({ value, label })
  }
  
  return months
}

export function TransactionFilters({ categories, currentFilters }: TransactionFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(currentFilters.search || "")
  const monthOptions = useMemo(() => generateMonthOptions(), [])

  // Group categories by type for better organization
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories]
  )
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === "income"),
    [categories]
  )

  useEffect(() => {
    setSearch(currentFilters.search || "")
  }, [currentFilters.search])

  const updateFilters = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== "all") {
        params.set(key, value)
        // If setting month, calculate and set start/end dates
        if (key === "month") {
          const [year, month] = value.split("-").map(Number)
          const monthDate = new Date(year, month - 1, 1)
          params.set("startDate", format(startOfMonth(monthDate), "yyyy-MM-dd"))
          params.set("endDate", format(endOfMonth(monthDate), "yyyy-MM-dd"))
        }
      } else {
        params.delete(key)
        // If clearing month, also clear date filters
        if (key === "month") {
          params.delete("startDate")
          params.delete("endDate")
        }
      }
      // Reset to page 1 whenever a filter changes
      params.delete("page")
      router.push(`/transactions?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters("search", search)
  }

  const clearFilters = () => {
    router.push("/transactions")
    setSearch("")
  }

  const hasFilters = Object.values(currentFilters).some((v) => v && v !== "all")
  const activeFilterCount = Object.values(currentFilters).filter((v) => v && v !== "all").length

  // Get the selected category and month labels for display
  const selectedCategory = categories.find((c) => c.id === currentFilters.category)
  const selectedMonth = monthOptions.find((m) => m.value === currentFilters.month)

  return (
    <Card className="border-border/50 bg-card shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Search and primary filters row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </form>

            <div className="flex flex-wrap items-center gap-3">
              {/* Month Filter */}
              <Select
                value={currentFilters.month || "all"}
                onValueChange={(value) => updateFilters("month", value)}
              >
                <SelectTrigger className="w-[170px]">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select
                value={currentFilters.type || "all"}
                onValueChange={(value) => updateFilters("type", value)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>

              {/* Category Filter with grouped options */}
              <Select
                value={currentFilters.category || "all"}
                onValueChange={(value) => updateFilters("category", value)}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {expenseCategories.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Expenses
                      </div>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {incomeCategories.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Income
                      </div>
                      {incomeCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Active filters display */}
          {hasFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedMonth && (
                <Badge variant="secondary" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {selectedMonth.label}
                  <button
                    onClick={() => updateFilters("month", "all")}
                    className="ml-1 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {currentFilters.type && currentFilters.type !== "all" && (
                <Badge variant="secondary" className="gap-1 capitalize">
                  {currentFilters.type}
                  <button
                    onClick={() => updateFilters("type", "all")}
                    className="ml-1 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedCategory && (
                <Badge
                  variant="secondary"
                  className="gap-1"
                  style={{
                    backgroundColor: `${selectedCategory.color}15`,
                    color: selectedCategory.color,
                  }}
                >
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: selectedCategory.color }}
                  />
                  {selectedCategory.name}
                  <button
                    onClick={() => updateFilters("category", "all")}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {currentFilters.search && (
                <Badge variant="secondary" className="gap-1">
                  Search: {currentFilters.search}
                  <button
                    onClick={() => {
                      setSearch("")
                      updateFilters("search", "")
                    }}
                    className="ml-1 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
