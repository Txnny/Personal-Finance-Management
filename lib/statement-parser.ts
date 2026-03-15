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

// Month abbreviation → number map (used for short-date parsing)
const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
}

// Keywords that strongly suggest income — used when we can't infer from balance delta
const INCOME_KEYWORDS = [
  "payroll", "salary", "direct dep", "deposit", "e-transfer rec", "etransfer rec",
  "preauth credit", "preauthorized credit", "paycheck", "dividend", "interest earned",
  "refund", "rebate", "cashback", "tax return", "government", "ei ", "cpp ", "oas ",
  "cerb", "cra credit", "child benefit", "income",
]

function isIncomeByKeyword(desc: string): boolean {
  const lower = desc.toLowerCase()
  return INCOME_KEYWORDS.some((kw) => lower.includes(kw))
}

/**
 * Parse a short date like "Jan 02", "02 Jan", or "01/15" (no year).
 * Falls back to the statement year or current year.
 */
function parseShortDate(dateStr: string, year: number): string | null {
  // "Jan 02" or "Jan. 02"
  const md = dateStr.match(
    /^(jan\.?|feb\.?|mar\.?|apr\.?|may\.?|jun\.?|jul\.?|aug\.?|sep\.?|oct\.?|nov\.?|dec\.?|january|february|march|april|june|july|august|september|october|november|december)\s+(\d{1,2})$/i
  )
  if (md) {
    const month = MONTH_MAP[md[1].toLowerCase().replace(/\.$/, "")]
    const day = parseInt(md[2])
    if (month && day >= 1 && day <= 31)
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  // "02 Jan"
  const dm = dateStr.match(/^(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/i)
  if (dm) {
    const day = parseInt(dm[1])
    const month = MONTH_MAP[dm[2].toLowerCase()]
    if (month && day >= 1 && day <= 31)
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  // "01/15" or "1/15" (MM/DD, no year)
  const mmdd = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (mmdd) {
    const month = parseInt(mmdd[1])
    const day = parseInt(mmdd[2])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31)
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  return null
}

/**
 * Parse a PDF bank statement.
 *
 * Strategy:
 * 1. Extract all lines that contain a recognisable date + at least one dollar amount.
 * 2. When a line has 2+ amounts the LAST is treated as the running balance,
 *    the SECOND-TO-LAST as the transaction amount.  When only 1 amount is found
 *    it is the transaction amount (no balance column, or balance was on separate line).
 * 3. Transaction direction (income vs expense) is inferred from consecutive
 *    balance deltas.  When that's not available we fall back to keyword matching.
 */
export function parsePDFStatement(text: string): ParsedTransaction[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const currentYear = new Date().getFullYear()

  // Try to detect the statement year from a 4-digit year in the first 800 chars
  const yearMatch = text.slice(0, 800).match(/\b(20\d{2})\b/)
  const stmtYear = yearMatch ? parseInt(yearMatch[1]) : currentYear

  // All date patterns, ordered most-specific first
  const DATE_PATTERNS: Array<{ re: RegExp; short: boolean }> = [
    { re: /\b(\d{4}-\d{2}-\d{2})\b/, short: false },
    { re: /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/, short: false },
    { re: /\b(\d{1,2}-\d{1,2}-\d{4})\b/, short: false },
    {
      re: /\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4})\b/i,
      short: false,
    },
    {
      re: /\b(\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?),?\s+\d{4})\b/i,
      short: false,
    },
    // Short dates (no year) — common in Scotiabank, TD, RBC statements
    {
      re: /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2})\b/i,
      short: true,
    },
    { re: /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))\b/i, short: true },
    { re: /\b(\d{2}\/\d{2})\b/, short: true },
  ]

  // Matches a money amount: optional $, digits with optional commas, decimal cents,
  // optional trailing - or + or CR/DR suffix.
  const AMOUNT_RE = /\$?\s*[\d,]+\.\d{2}\s*(?:[-+]|CR|DR)?/gi

  interface RawEntry {
    date: string
    description: string
    txAmount: number        // transaction amount (always positive here)
    balance: number | null  // running balance if available
    hasCR: boolean          // explicit credit indicator
    hasDR: boolean          // explicit debit indicator
    hasTrailingMinus: boolean
  }

  const raw: RawEntry[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.length < 6) continue

    // Find a date
    let dateStr: string | null = null
    let dateIndex = -1
    let dateLen = 0
    let isShort = false

    for (const { re, short } of DATE_PATTERNS) {
      const m = trimmed.match(re)
      if (m && m.index !== undefined) {
        dateStr = m[0]
        dateIndex = m.index
        dateLen = m[0].length
        isShort = short
        break
      }
    }
    if (!dateStr) continue

    // Parse date to ISO
    const isoDate = isShort
      ? parseShortDate(dateStr, stmtYear)
      : parseDate(dateStr)
    if (!isoDate) continue

    // Find all amounts
    const amountMatches = [...trimmed.matchAll(AMOUNT_RE)]
    if (amountMatches.length === 0) continue

    // Parse each raw amount token
    const parsedAmounts = amountMatches.map((m) => {
      const raw = m[0]
      const hasCR = /CR$/i.test(raw.trim())
      const hasDR = /DR$/i.test(raw.trim())
      const hasTrailingMinus = /[-]\s*$/.test(raw.trim())
      const numStr = raw.replace(/[$,\s]|CR|DR/gi, "").replace(/[-+]$/, "").trim()
      return { value: parseFloat(numStr), hasCR, hasDR, hasTrailingMinus, index: m.index! }
    }).filter((a) => !isNaN(a.value) && a.value > 0)

    if (parsedAmounts.length === 0) continue

    // When 2+ amounts: treat last as running balance, second-to-last as transaction amount
    // When 1 amount: it's the transaction amount (no balance)
    let txEntry: typeof parsedAmounts[0]
    let balance: number | null = null

    if (parsedAmounts.length >= 2) {
      txEntry = parsedAmounts[parsedAmounts.length - 2]
      balance = parsedAmounts[parsedAmounts.length - 1].value
    } else {
      txEntry = parsedAmounts[0]
    }

    // Extract description between date end and first amount
    const descStart = dateIndex + dateLen
    const firstAmtIdx = parsedAmounts[0].index
    let description = trimmed
      .slice(descStart, firstAmtIdx > descStart ? firstAmtIdx : undefined)
      .trim()
      .replace(/\s+/g, " ")

    if (description.length < 2) {
      // Fallback: everything after the last amount
      const lastAmt = parsedAmounts[parsedAmounts.length - 1]
      description = trimmed.slice(lastAmt.index + lastAmt.value.toString().length).trim()
    }
    if (description.length < 2) continue

    raw.push({
      date: isoDate,
      description: cleanDescription(description),
      txAmount: txEntry.value,
      balance,
      hasCR: txEntry.hasCR,
      hasDR: txEntry.hasDR,
      hasTrailingMinus: txEntry.hasTrailingMinus,
    })
  }

  // Determine sign using running balance deltas; fall back to keyword heuristics
  const result: ParsedTransaction[] = []
  let prevBalance: number | null = null

  for (const entry of raw) {
    let amount: number

    if (entry.hasCR) {
      amount = entry.txAmount  // explicit credit → income
    } else if (entry.hasDR || entry.hasTrailingMinus) {
      amount = -entry.txAmount // explicit debit → expense
    } else if (entry.balance !== null && prevBalance !== null) {
      // Infer from balance movement
      amount = entry.balance > prevBalance ? entry.txAmount : -entry.txAmount
    } else {
      // Fall back to keyword heuristic
      amount = isIncomeByKeyword(entry.description) ? entry.txAmount : -entry.txAmount
    }

    if (entry.balance !== null) prevBalance = entry.balance

    result.push({
      date: entry.date,
      description: entry.description,
      amount,
      merchant: extractMerchant(entry.description),
    })
  }

  // Deduplicate
  const seen = new Set<string>()
  return result.filter((t) => {
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
