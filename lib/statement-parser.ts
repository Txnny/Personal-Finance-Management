import type { Category } from "@/lib/types"

export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  merchant?: string
}

// Bank-specific column mappings for major Canadian banks
const BANK_FORMATS: Record<string, { dateCol: number; descCol: number; amountCol: number; debitCol?: number; creditCol?: number }> = {
  // Major Canadian Banks
  td_canada: { dateCol: 0, descCol: 1, debitCol: 2, creditCol: 3 },
  scotiabank: { dateCol: 0, descCol: 1, amountCol: 2 },
  rbc: { dateCol: 0, descCol: 1, debitCol: 2, creditCol: 3 },
  bmo: { dateCol: 0, descCol: 2, amountCol: 3 },
  cibc: { dateCol: 0, descCol: 1, debitCol: 2, creditCol: 3 },
  national_bank: { dateCol: 0, descCol: 1, amountCol: 2 },
  tangerine: { dateCol: 0, descCol: 1, amountCol: 2 },
  simplii: { dateCol: 0, descCol: 1, amountCol: 2 },
  // Digital/Neo Banks
  koho: { dateCol: 0, descCol: 1, amountCol: 2 },
  wealthsimple: { dateCol: 0, descCol: 1, amountCol: 2 },
  eq_bank: { dateCol: 0, descCol: 1, amountCol: 2 },
  neo_financial: { dateCol: 0, descCol: 1, amountCol: 2 },
  // Credit Cards
  capital_one_ca: { dateCol: 0, descCol: 3, debitCol: 5, creditCol: 6 },
  amex_canada: { dateCol: 0, descCol: 1, amountCol: 2 },
  mbna: { dateCol: 0, descCol: 1, amountCol: 2 },
  rogers_bank: { dateCol: 0, descCol: 1, amountCol: 2 },
  // Generic fallback
  other: { dateCol: 0, descCol: 1, amountCol: 2 },
}

// Category keywords for auto-categorization (Canadian merchants and chains)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Groceries: [
    "grocery", "supermarket", "loblaws", "no frills", "real canadian superstore",
    "metro", "sobeys", "safeway", "save-on-foods", "food basics", "freshco",
    "walmart", "costco", "t&t supermarket", "whole foods", "farm boy", "longos",
    "fortinos", "zehrs", "independent grocer", "valu-mart", "voila", "instacart",
    "superc", "iga", "provigo", "maxi"
  ],
  Dining: [
    "restaurant", "cafe", "coffee", "starbucks", "tim hortons", "tims", "mcdonald",
    "burger", "pizza", "sushi", "thai", "chinese", "italian", "uber eats", "skip",
    "doordash", "grubhub", "a&w", "harvey's", "swiss chalet", "boston pizza",
    "the keg", "earls", "cactus club", "joeys", "milestones", "montanas",
    "tim horton", "second cup", "davids tea"
  ],
  Transportation: [
    "uber", "lyft", "taxi", "gas", "fuel", "petro canada", "petro-canada", "esso",
    "shell", "canadian tire gas", "pioneer", "co-op gas", "husky", "ultramar",
    "parking", "presto", "ttc", "stm", "translink", "oc transpo", "go transit",
    "via rail", "air canada", "westjet", "porter", "flair", "car wash", "auto",
    "impark", "indigo parking", "green p"
  ],
  Entertainment: [
    "netflix", "spotify", "crave", "disney", "amazon prime", "youtube", "apple tv",
    "movie", "cineplex", "landmark cinema", "concert", "ticketmaster", "stubhub",
    "gaming", "playstation", "xbox", "steam", "twitch", "apple music", "audible",
    "dazn", "sportsnet", "tsn"
  ],
  Shopping: [
    "amazon", "ebay", "etsy", "hudson bay", "hbc", "the bay", "simons", "winners",
    "homesense", "marshalls", "walmart", "canadian tire", "best buy", "apple store",
    "nike", "adidas", "lululemon", "roots", "aritzia", "sport chek", "atmosphere",
    "ikea", "structube", "wayfair", "home depot", "rona", "home hardware",
    "princess auto", "staples", "dollarama", "giant tiger", "shoppers drug mart"
  ],
  Utilities: [
    "hydro", "electricity", "toronto hydro", "bc hydro", "hydro one", "hydro quebec",
    "enbridge", "fortis", "direct energy", "bullfrog", "water bill", "internet",
    "rogers", "bell", "telus", "shaw", "videotron", "cogeco", "fido", "koodo",
    "virgin mobile", "freedom mobile", "chatr", "public mobile"
  ],
  Healthcare: [
    "pharmacy", "shoppers drug mart", "rexall", "pharmasave", "london drugs",
    "doctor", "hospital", "medical", "dental", "vision", "optometrist", "clinic",
    "health", "lifelabs", "dynacare", "medicentre"
  ],
  "Rent/Mortgage": [
    "rent", "mortgage", "property", "strata", "condo fee", "lease", "apartment",
    "cmhc", "rental"
  ],
  Insurance: [
    "insurance", "intact", "desjardins", "aviva", "td insurance", "belair",
    "rbc insurance", "sunlife", "manulife", "canada life", "great west life",
    "cooperators", "wawanesa"
  ],
  Subscriptions: [
    "subscription", "membership", "monthly", "annual fee", "gym", "fitness",
    "goodlife", "planet fitness", "fit4less", "ymca", "anytime fitness", "peloton",
    "equinox", "orangetheory"
  ],
  Salary: [
    "payroll", "direct dep", "salary", "wage", "income", "paycheck", "employer",
    "adp", "ceridian", "paychex"
  ],
  Freelance: [
    "freelance", "consulting", "client payment", "invoice", "project", "e-transfer"
  ],
  Investments: [
    "dividend", "interest", "investment", "stock", "etf", "mutual fund", "brokerage",
    "wealthsimple", "questrade", "qtrade", "td direct", "rbc direct", "cibc investor"
  ],
  Refunds: [
    "refund", "return", "credit", "cashback", "reimbursement"
  ],
}

export function parseCSVStatement(content: string, bankId: string): ParsedTransaction[] {
  const lines = content.split("\n").filter((line) => line.trim())
  const format = BANK_FORMATS[bankId] || BANK_FORMATS.other
  const transactions: ParsedTransaction[] = []

  // Skip header row(s)
  const dataLines = lines.slice(1)

  for (const line of dataLines) {
    try {
      // Handle CSV parsing with quoted fields
      const columns = parseCSVLine(line)
      
      if (columns.length < 3) continue

      const dateStr = columns[format.dateCol]?.trim()
      const description = columns[format.descCol]?.trim()
      
      let amount: number
      if (format.debitCol !== undefined && format.creditCol !== undefined) {
        const debit = parseFloat(columns[format.debitCol]?.replace(/[$,]/g, "") || "0")
        const credit = parseFloat(columns[format.creditCol]?.replace(/[$,]/g, "") || "0")
        amount = credit > 0 ? credit : -debit
      } else {
        amount = parseFloat(columns[format.amountCol]?.replace(/[$,]/g, "") || "0")
      }

      if (!dateStr || !description || isNaN(amount) || amount === 0) continue

      // Parse and format date
      const date = parseDate(dateStr)
      if (!date) continue

      // Extract merchant from description
      const merchant = extractMerchant(description)

      transactions.push({
        date,
        description: cleanDescription(description),
        amount,
        merchant,
      })
    } catch {
      // Skip malformed lines
      continue
    }
  }

  return transactions
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += char
    }
  }
  result.push(current)
  
  return result
}

function parseDate(dateStr: string): string | null {
  // Try various date formats
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,  // MM/DD/YYYY or MM/DD/YY
    /^(\d{4})-(\d{2})-(\d{2})$/,           // YYYY-MM-DD
    /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/,     // MM-DD-YYYY
  ]

  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      let year: number, month: number, day: number

      if (format.source.startsWith("^(\\d{4})")) {
        // YYYY-MM-DD format
        year = parseInt(match[1])
        month = parseInt(match[2])
        day = parseInt(match[3])
      } else {
        // MM/DD/YYYY or MM-DD-YYYY format
        month = parseInt(match[1])
        day = parseInt(match[2])
        year = parseInt(match[3])
        if (year < 100) year += 2000
      }

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      }
    }
  }

  return null
}

function extractMerchant(description: string): string | undefined {
  // Clean up common prefixes and extract merchant name
  const cleaned = description
    .replace(/^(POS|ACH|DEBIT|CREDIT|CHECK|TRANSFER)\s*/i, "")
    .replace(/\s+\d{4}$/, "") // Remove last 4 digits (often card number)
    .replace(/\s+\d{2}\/\d{2}$/, "") // Remove date at end
    .trim()

  // Extract first part as merchant
  const parts = cleaned.split(/\s{2,}|#|\*/)
  return parts[0]?.trim() || undefined
}

function cleanDescription(description: string): string {
  return description
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 255)
}

/**
 * Parse a PDF bank statement by extracting transaction rows from raw text.
 * Handles most major bank PDF formats by looking for date + amount patterns.
 */
export function parsePDFStatement(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  // Normalise line endings and split
  const lines = text.replace(/\r\n/g, "\n").split("\n")

  // Regex patterns
  // Date: MM/DD/YYYY, YYYY-MM-DD, MM-DD-YYYY, Jan 01 2024, Jan 01/24
  const datePattern =
    /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}[,\s]+\d{4})\b/i

  // Amount: $1,234.56 or -1,234.56 or 1,234.56 CR/DR
  const amountPattern = /(?:\$\s*)?-?[\d,]+\.\d{2}(?:\s*(?:CR|DR))?/gi

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.length < 8) continue

    const dateMatch = trimmed.match(datePattern)
    if (!dateMatch) continue

    const amounts = trimmed.match(amountPattern)
    if (!amounts || amounts.length === 0) continue

    // Use the last amount found (usually the transaction amount, not running balance)
    const rawAmount = amounts[amounts.length - 1]
    const isCR = /CR$/i.test(rawAmount)
    const isDR = /DR$/i.test(rawAmount)
    const numStr = rawAmount.replace(/[$,\s]|CR|DR/gi, "")
    let amount = parseFloat(numStr)
    if (isNaN(amount) || amount === 0) continue

    // Credits are positive (income), debits are negative (expense)
    if (isDR) amount = -Math.abs(amount)
    if (isCR) amount = Math.abs(amount)

    const date = parseDate(dateMatch[0])
    if (!date) continue

    // Extract description: text after the date, before the amounts
    const dateEnd = (dateMatch.index ?? 0) + dateMatch[0].length
    const amountStart = trimmed.lastIndexOf(rawAmount)
    const rawDesc = trimmed.slice(dateEnd, amountStart > dateEnd ? amountStart : undefined).trim()
    const description = cleanDescription(rawDesc || trimmed.slice(0, dateEnd))
    if (!description) continue

    transactions.push({
      date,
      description,
      amount,
      merchant: extractMerchant(description),
    })
  }

  // Deduplicate by date+description+amount to handle multi-column PDF layouts
  const seen = new Set<string>()
  return transactions.filter((t) => {
    const key = `${t.date}|${t.description}|${t.amount}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function categorizeTransaction(
  description: string,
  amount: number,
  categories: Category[]
): string | null {
  const lowerDesc = description.toLowerCase()
  
  // Check for income first
  if (amount > 0) {
    for (const [categoryName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((kw) => lowerDesc.includes(kw))) {
        const category = categories.find(
          (c) => c.name.toLowerCase() === categoryName.toLowerCase() && c.type === "income"
        )
        if (category) return category.id
      }
    }
    // Default to first income category
    const incomeCategory = categories.find((c) => c.type === "income")
    return incomeCategory?.id || null
  }

  // Check expense categories
  for (const [categoryName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lowerDesc.includes(kw))) {
      const category = categories.find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase()
      )
      if (category) return category.id
    }
  }

  // Return null for uncategorized
  return null
}
