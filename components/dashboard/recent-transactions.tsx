"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowUpRight, ArrowDownRight } from "lucide-react"
import type { Transaction } from "@/lib/types"
import { format } from "date-fns"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface RecentTransactionsProps {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <Card className="border-border/50 bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Recent Transactions
        </CardTitle>
        <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80">
          <Link href="/transactions">
            View all
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No transactions yet. Upload a bank statement to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.slice(0, 5).map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    transaction.type === "income" 
                      ? "bg-success/10 text-success" 
                      : "bg-destructive/10 text-destructive"
                  )}>
                    {transaction.type === "income" ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {transaction.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(transaction.date), "MMM d, yyyy")}
                      </span>
                      {transaction.category && (
                        <Badge 
                          variant="secondary" 
                          className="text-xs"
                          style={{ 
                            backgroundColor: `${transaction.category.color}15`,
                            color: transaction.category.color
                          }}
                        >
                          {transaction.category.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <p className={cn(
                  "text-sm font-semibold",
                  transaction.type === "income" ? "text-success" : "text-foreground"
                )}>
                  {transaction.type === "income" ? "+" : "-"}{formatCurrency(Math.abs(transaction.amount))}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
