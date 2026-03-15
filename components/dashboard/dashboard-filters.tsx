"use client"

import { useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar, X } from "lucide-react"
import { format, subMonths } from "date-fns"
import { useMemo, useCallback } from "react"

interface DashboardFiltersProps {
  currentMonth?: string
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

export function DashboardFilters({ currentMonth }: DashboardFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const monthOptions = useMemo(() => generateMonthOptions(), [])

  const updateMonth = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== "current") {
        params.set("month", value)
      } else {
        params.delete("month")
      }
      router.push(`/?${params.toString()}`)
    },
    [router, searchParams]
  )

  const clearFilter = () => {
    router.push("/")
  }

  const selectedMonth = monthOptions.find((m) => m.value === currentMonth)

  return (
    <div className="flex items-center gap-3">
      <Select
        value={currentMonth || "current"}
        onValueChange={updateMonth}
      >
        <SelectTrigger className="w-[180px] bg-card">
          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Select month" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current">Current Month</SelectItem>
          {monthOptions.map((month) => (
            <SelectItem key={month.value} value={month.value}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentMonth && (
        <Button variant="ghost" size="sm" onClick={clearFilter}>
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}

      {selectedMonth && (
        <span className="text-sm text-muted-foreground">
          Showing data for {selectedMonth.label}
        </span>
      )}
    </div>
  )
}
