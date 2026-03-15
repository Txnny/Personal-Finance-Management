"use client"

import { useState, useCallback, useId } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Files,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import type { Transaction } from "@/lib/types"

interface UploadSectionProps {
  userId: string
}

type FileStatus = "queued" | "uploading" | "success" | "error"

interface QueuedFile {
  id: string
  file: File
  status: FileStatus
  transactionsCount?: number
  transactions?: Transaction[]
  errorMessage?: string
}

const SUPPORTED_BANKS = [
  // Major Canadian Banks
  { id: "td_canada", name: "TD Canada Trust" },
  { id: "scotiabank", name: "Scotiabank (Bank of Nova Scotia)" },
  { id: "rbc", name: "RBC Royal Bank" },
  { id: "bmo", name: "BMO Bank of Montreal" },
  { id: "cibc", name: "CIBC" },
  { id: "national_bank", name: "National Bank of Canada" },
  // Online/Digital Banks
  { id: "tangerine", name: "Tangerine" },
  { id: "simplii", name: "Simplii Financial" },
  { id: "koho", name: "KOHO" },
  { id: "wealthsimple", name: "Wealthsimple Cash" },
  { id: "eq_bank", name: "EQ Bank" },
  { id: "neo_financial", name: "Neo Financial" },
  // Credit Cards
  { id: "capital_one_ca", name: "Capital One Canada" },
  { id: "amex_canada", name: "American Express Canada" },
  { id: "mbna", name: "MBNA" },
  { id: "rogers_bank", name: "Rogers Bank" },
  // Generic
  { id: "other", name: "Other (Generic CSV)" },
]

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(amount)
}

export function UploadSection({ userId }: UploadSectionProps) {
  const router = useRouter()
  const uid = useId()
  const [isDragging, setIsDragging] = useState(false)
  const [selectedBank, setSelectedBank] = useState<string>("")
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [reviewFile, setReviewFile] = useState<QueuedFile | null>(null)

  const isValidFile = (file: File) =>
    file.name.endsWith(".csv") ||
    file.name.endsWith(".pdf") ||
    file.type === "text/csv" ||
    file.type === "application/pdf" ||
    file.type === "application/vnd.ms-excel"

  const addFiles = useCallback((files: FileList | File[]) => {
    const valid = Array.from(files).filter(isValidFile)
    if (valid.length === 0) return
    setQueue((prev) => [
      ...prev,
      ...valid.map((file) => ({
        id: `${uid}-${Math.random().toString(36).slice(2)}`,
        file,
        status: "queued" as FileStatus,
      })),
    ])
  }, [uid])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles]
  )

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((f) => f.id !== id))
  }

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((f) => f.status !== "success"))
  }

  const uploadAll = async () => {
    if (!selectedBank) return
    const pending = queue.filter((f) => f.status === "queued" || f.status === "error")
    if (pending.length === 0) return

    setIsUploading(true)

    for (const item of pending) {
      // Mark as uploading
      setQueue((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "uploading" } : f))
      )

      try {
        const formData = new FormData()
        formData.append("file", item.file)
        formData.append("bankId", selectedBank)
        formData.append("userId", userId)

        const response = await fetch("/api/upload-statement", {
          method: "POST",
          body: formData,
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || "Upload failed")
        }

        setQueue((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: "success",
                  transactionsCount: result.transactionsCount,
                  transactions: result.transactions || [],
                }
              : f
          )
        )
      } catch (err) {
        setQueue((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: "error",
                  errorMessage: err instanceof Error ? err.message : "Upload failed",
                }
              : f
          )
        )
      }
    }

    setIsUploading(false)
    router.refresh()
  }

  const pendingCount = queue.filter(
    (f) => f.status === "queued" || f.status === "error"
  ).length
  const successCount = queue.filter((f) => f.status === "success").length
  const hasQueue = queue.length > 0

  return (
    <>
      <Card className="border-border/50 bg-card shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Import Bank Statements
              </CardTitle>
              <CardDescription className="mt-0.5">
                Upload CSV or PDF statements — transactions are auto-categorised on import
              </CardDescription>
            </div>
            {successCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCompleted}>
                Clear done
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Bank selector */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="min-w-[90px] text-sm font-medium text-foreground">
              Bank / Source
            </label>
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger className="sm:w-[260px]">
                <SelectValue placeholder="Select your bank" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_BANKS.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/20"
            )}
          >
            <input
              type="file"
              accept=".csv,.pdf"
              multiple
              onChange={(e) => e.target.files && addFiles(e.target.files)}
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
            />
            <Files className="mb-2 h-9 w-9 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Drag & drop or click to select files
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              CSV and PDF · Multiple files supported
            </p>
          </div>

          {/* File queue */}
          {hasQueue && (
            <div className="space-y-2">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                    item.status === "success" && "border-success/30 bg-success/5",
                    item.status === "error" && "border-destructive/30 bg-destructive/5",
                    item.status === "uploading" && "border-primary/30 bg-primary/5",
                    item.status === "queued" && "border-border bg-muted/20"
                  )}
                >
                  {/* Icon */}
                  <div className="shrink-0">
                    {item.status === "uploading" && (
                      <Spinner className="h-4 w-4 text-primary" />
                    )}
                    {item.status === "success" && (
                      <CheckCircle className="h-4 w-4 text-success" />
                    )}
                    {item.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    {item.status === "queued" && (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* File info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(item.file.size)}
                      {item.status === "uploading" && " · Uploading…"}
                      {item.status === "success" &&
                        ` · ${item.transactionsCount} transactions imported`}
                      {item.status === "error" && ` · ${item.errorMessage}`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    {item.status === "success" &&
                      item.transactions &&
                      item.transactions.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs text-primary"
                          onClick={() => setReviewFile(item)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Review
                        </Button>
                      )}
                    {item.status !== "uploading" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFromQueue(item.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          {hasQueue && (
            <Button
              onClick={uploadAll}
              disabled={!selectedBank || isUploading || pendingCount === 0}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {pendingCount > 0
                    ? `Upload ${pendingCount} file${pendingCount > 1 ? "s" : ""}`
                    : "All uploaded"}
                </>
              )}
            </Button>
          )}

          {/* Empty state hint */}
          {!hasQueue && (
            <div className="rounded-lg bg-muted/30 p-4">
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    1
                  </span>
                  Select your bank from the dropdown above
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    2
                  </span>
                  Drop one or more CSV or PDF statements into the zone
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    3
                  </span>
                  Click Upload — then review and re-categorise any transactions
                </li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Post-upload review sheet */}
      <Sheet open={!!reviewFile} onOpenChange={(open) => !open && setReviewFile(null)}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-2xl">
          <SheetHeader className="shrink-0">
            <SheetTitle>Review Imported Transactions</SheetTitle>
            <SheetDescription>
              {reviewFile?.file.name} ·{" "}
              <span className="font-medium text-foreground">
                {reviewFile?.transactionsCount} transactions
              </span>{" "}
              imported. Click a category badge to reassign.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
            {reviewFile?.transactions && reviewFile.transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[90px]">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[140px]">Category</TableHead>
                    <TableHead className="w-[110px] text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewFile.transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(t.date), "MMM d, yy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                              t.type === "income"
                                ? "bg-success/10 text-success"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {t.type === "income" ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                          </div>
                          <span className="truncate text-sm font-medium text-foreground">
                            {t.description}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="cursor-pointer text-xs transition-opacity hover:opacity-70"
                          style={
                            t.category
                              ? {
                                  backgroundColor: `${t.category.color}18`,
                                  color: t.category.color,
                                }
                              : undefined
                          }
                        >
                          {t.category?.name ?? "Uncategorized"}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-sm font-semibold",
                          t.type === "income" ? "text-success" : "text-foreground"
                        )}
                      >
                        {t.type === "income" ? "+" : "-"}
                        {formatCurrency(Math.abs(t.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No transactions to display.
              </p>
            )}
          </div>

          <div className="shrink-0 border-t border-border pt-4">
            <Button
              className="w-full"
              onClick={() => {
                setReviewFile(null)
                router.push("/transactions")
              }}
            >
              Done — view all transactions
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
