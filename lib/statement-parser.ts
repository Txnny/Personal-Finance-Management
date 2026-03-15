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
 * Handles two formats:
 *
 * A) Spaced format (TD, RBC, CIBC, most others):
 *    "Jan 15  Tim Hortons  4.50  995.50"
 *
 * B) Concatenated format (Scotiabank PDFs extracted by pdf-parse):
 *    "Dec17Fees/dues33.89958.24"
 *    Year changes appear as standalone lines: "2025", "2026"
 *    Merchant details sometimes appear on the following line.
 *
 * Strategy for both:
 * 1. Track current year from standalone year lines.
 * 2. Match lines that start with {MonthAbbr}{Day} (concatenated) or contain
 *    a spaced date pattern.
 * 3. Extract all dollar amounts from the remainder; second-to-last = tx amount,
 *    last = running balance.
 * 4. Skip OpeningBalance / ClosingBalance; use opening balance to seed prevBalance.
 * 5. Infer income vs expense from balance delta; fall back to keyword heuristic.
 */
export function parsePDFStatement(text: string): ParsedTransaction[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n")

  // Matches a line that STARTS with a concatenated date like "Dec17" or "Jan2"
  const CONCAT_DATE_RE = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s*(\d{1,2})(.*)/i
  // Matches a spaced/separated date anywhere in a line
  const SPACED_DATE_RE =
    /\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}(?:,?\s+\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{2}-\d{2})\b/i
  // Standalone year line
  const YEAR_RE = /^(20\d{2})$/
  // All dollar-like amounts including negative balances
  const AMOUNT_RE = /-?\d{1,3}(?:,\d{3})*\.\d{2}/g

  let currentYear = new Date().getFullYear()
  // Try to pre-seed year from the first 800 chars
  const earlyYear = text.slice(0, 800).match(/\b(20\d{2})\b/)
  if (earlyYear) currentYear = parseInt(earlyYear[1])

  interface RawEntry {
    date: string
    description: string
    txAmount: number
    balance: number | null
  }

  const raw: RawEntry[] = []
  let openingBalance: number | null = null
  let lastRaw: RawEntry | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Standalone year line — update tracker
    if (YEAR_RE.test(trimmed)) {
      currentYear = parseInt(trimmed)
      continue
    }

    // ── Try concatenated format first (Scotiabank) ───────────────────────
    const concatMatch = trimmed.match(CONCAT_DATE_RE)
    if (concatMatch) {
      const monthStr = concatMatch[1].toLowerCase().replace(/\.$/, "")
      const day = parseInt(concatMatch[2])
      const rest = concatMatch[3]
      const monthNum = MONTH_MAP[monthStr]
      if (!monthNum) continue

      const isoDate = `${currentYear}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      const restLower = rest.toLowerCase()

      // Capture opening balance; skip both open/close lines
      if (restLower.includes("openingbalance") || restLower.startsWith("opening")) {
        const amts = [...rest.matchAll(AMOUNT_RE)]
        if (amts.length > 0) {
          openingBalance = parseFloat(amts[amts.length - 1][0].replace(/,/g, ""))
        }
        continue
      }
      if (restLower.includes("closingbalance") || restLower.startsWith("closing")) continue

      const amtMatches = [...rest.matchAll(AMOUNT_RE)]
      if (amtMatches.length === 0) continue

      const amounts = amtMatches.map((m) => parseFloat(m[0].replace(/,/g, "")))
      const txAmount = Math.abs(amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[0])
      const balance = amounts.length >= 2 ? amounts[amounts.length - 1] : null

      // Description = text before the first amount
      const firstAmtIdx = amtMatches[0].index!
      let description = rest.slice(0, firstAmtIdx).trim()
      if (description.length < 2) description = rest.slice(0, 40).replace(/[\d.,]+$/, "").trim()
      if (description.length < 2) continue

      const entry: RawEntry = { date: isoDate, description: cleanDescription(description), txAmount, balance }
      raw.push(entry)
      lastRaw = entry
      continue
    }

    // ── Try spaced / standard format ─────────────────────────────────────
    const spacedMatch = trimmed.match(SPACED_DATE_RE)
    if (spacedMatch && spacedMatch.index !== undefined) {
      const dateStr = spacedMatch[0]
      const dateEnd = spacedMatch.index + dateStr.length
      const rest = trimmed.slice(dateEnd).trim()

      // Parse ISO date
      let isoDate: string | null = null
      // YYYY-MM-DD
      const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (iso) isoDate = dateStr
      // MM/DD/YYYY or MM/DD/YY
      const slashFull = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
      if (slashFull) {
        let y = parseInt(slashFull[3]); if (y < 100) y += 2000
        isoDate = `${y}-${slashFull[1].padStart(2,"0")}-${slashFull[2].padStart(2,"0")}`
      }
      // MM/DD (no year)
      const slashShort = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/)
      if (slashShort) {
        isoDate = `${currentYear}-${slashShort[1].padStart(2,"0")}-${slashShort[2].padStart(2,"0")}`
      }
      // "Jan 15 2025" or "Jan 15"
      const monthFirst = dateStr.match(
        /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?/i
      )
      if (monthFirst) {
        const mn = MONTH_MAP[monthFirst[1].toLowerCase()]
        const dy = parseInt(monthFirst[2])
        const yr = monthFirst[3] ? parseInt(monthFirst[3]) : currentYear
        if (mn) isoDate = `${yr}-${String(mn).padStart(2,"0")}-${String(dy).padStart(2,"0")}`
      }

      if (!isoDate) continue

      const restLower = rest.toLowerCase()
      if (restLower.includes("opening balance")) {
        const amts = [...rest.matchAll(AMOUNT_RE)]
        if (amts.length > 0) openingBalance = parseFloat(amts[amts.length - 1][0].replace(/,/g, ""))
        continue
      }
      if (restLower.includes("closing balance")) continue

      const amtMatches = [...rest.matchAll(AMOUNT_RE)]
      if (amtMatches.length === 0) continue

      const amounts = amtMatches.map((m) => parseFloat(m[0].replace(/,/g, "")))
      const txAmount = Math.abs(amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[0])
      const balance = amounts.length >= 2 ? amounts[amounts.length - 1] : null

      const firstAmtIdx = amtMatches[0].index!
      let description = rest.slice(0, firstAmtIdx).trim().replace(/\s+/g, " ")
      if (description.length < 2) continue

      // Check for explicit CR/DR suffixes on the tx amount token
      const txToken = amtMatches.length >= 2 ? amtMatches[amtMatches.length - 2][0] : amtMatches[0][0]
      const hasCR = /CR$/i.test(txToken.trim())
      const hasDR = /DR$/i.test(txToken.trim()) || /[-]\s*$/.test(txToken.trim())

      const entry: RawEntry & { hasCR?: boolean; hasDR?: boolean } = {
        date: isoDate,
        description: cleanDescription(description),
        txAmount,
        balance,
      }
      // Stash CR/DR hints for direction logic below
      ;(entry as Record<string, unknown>).hasCR = hasCR
      ;(entry as Record<string, unknown>).hasDR = hasDR

      raw.push(entry)
      lastRaw = entry
      continue
    }

    // ── Continuation line (merchant details on the next row) ─────────────
    if (lastRaw && /^[A-Za-z]/.test(trimmed) && !/\d/.test(trimmed) && trimmed.length > 3) {
      // Append to description if it looks like a merchant/location string
      if (!lastRaw.description.toLowerCase().includes(trimmed.toLowerCase())) {
        lastRaw.description = cleanDescription(`${lastRaw.description} ${trimmed}`)
      }
    }
  }

  // ── Determine sign using running balance deltas ───────────────────────
  const result: ParsedTransaction[] = []
  let prevBalance = openingBalance

  for (const entry of raw) {
    const hasCR = (entry as Record<string, unknown>).hasCR as boolean | undefined
    const hasDR = (entry as Record<string, unknown>).hasDR as boolean | undefined
    let amount: number

    if (hasCR) {
      amount = entry.txAmount
    } else if (hasDR) {
      amount = -entry.txAmount
    } else if (entry.balance !== null && prevBalance !== null) {
      amount = entry.balance > prevBalance ? entry.txAmount : -entry.txAmount
    } else {
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
