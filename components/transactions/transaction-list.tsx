"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Empty } from "@/components/ui/empty"
import {
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { Transaction, Category } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const PAGE_SIZE = 25

interface TransactionListProps {
  transactions: Transaction[]
  categories: Category[]
  totalCount: number
  currentPage: number
}

export function TransactionList({
  transactions,
  categories,
  totalCount,
  currentPage,
}: TransactionListProps) {
  const router = useRouter()
  const supabase = createClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("")

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
    }).format(amount)

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
  }

  const saveCategory = async (transactionId: string) => {
    if (!selectedCategory) return
    await supabase
      .from("transactions")
      .update({ category_id: selectedCategory === "none" ? null : selectedCategory })
      .eq("id", transactionId)
    setEditingId(null)
    setSelectedCategory("")
    router.refresh()
  }

  const startEditing = (transaction: Transaction) => {
    setEditingId(transaction.id)
    setSelectedCategory(transaction.category_id || "none")
  }

  const goToPage = (page: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set("page", String(page))
    router.push(`/transactions?${params.toString()}`)
  }

  const rangeStart = (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, totalCount)

  if (transactions.length === 0) {
    return (
      <Card className="border-border/50 bg-card shadow-sm">
        <CardContent className="p-12">
          <Empty
            icon={Receipt}
            title="No transactions found"
            description="Upload a bank statement to import transactions, or adjust your filters."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between px-6 py-3">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">
            {rangeStart}–{rangeEnd}
          </span>{" "}
          of{" "}
          <span className="font-medium text-foreground">{totalCount}</span>{" "}
          transactions
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[80px] text-center text-sm text-muted-foreground">
              Page {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[90px]">Type</TableHead>
                <TableHead className="w-[180px]">Category</TableHead>
                <TableHead className="w-[120px] text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id} className="group">
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(transaction.date), "MMM d, yyyy")}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          transaction.type === "income"
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {transaction.type === "income" ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {transaction.description}
                        </p>
                        {transaction.merchant && (
                          <p className="truncate text-xs text-muted-foreground">
                            {transaction.merchant}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs capitalize",
                        transaction.type === "income"
                          ? "border-success/40 text-success"
                          : "border-muted-foreground/30 text-muted-foreground"
                      )}
                    >
                      {transaction.type}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {editingId === transaction.id ? (
                      <div className="flex items-center gap-2">
                        <Select
                          value={selectedCategory}
                          onValueChange={handleCategoryChange}
                        >
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Uncategorized</SelectItem>
                            {categories
                              .filter((c) => c.type === transaction.type)
                              .map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => saveCategory(transaction.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="cursor-pointer text-xs transition-colors hover:bg-secondary/80"
                        style={
                          transaction.category
                            ? {
                                backgroundColor: `${transaction.category.color}15`,
                                color: transaction.category.color,
                              }
                            : undefined
                        }
                        onClick={() => startEditing(transaction)}
                      >
                        {transaction.category?.name ?? "Uncategorized"}
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell
                    className={cn(
                      "text-right text-sm font-semibold",
                      transaction.type === "income" ? "text-success" : "text-foreground"
                    )}
                  >
                    {transaction.type === "income" ? "+" : "–"}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Bottom pagination for long lists */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-3">
            <p className="text-sm text-muted-foreground">
              {rangeStart}–{rangeEnd} of {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => goToPage(currentPage - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => goToPage(currentPage + 1)}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
