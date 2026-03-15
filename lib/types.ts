export interface BankAccount {
  id: string
  user_id: string
  name: string
  bank_name: string
  account_type: 'checking' | 'savings' | 'credit'
  created_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  type: 'expense' | 'income'
  color: string
  icon: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  bank_account_id: string | null
  category_id: string | null
  amount: number
  type: 'income' | 'expense'
  description: string
  date: string
  merchant: string | null
  is_recurring: boolean
  statement_upload_id: string | null
  created_at: string
  category?: Category
  bank_account?: BankAccount
}

export interface StatementUpload {
  id: string
  user_id: string
  bank_account_id: string | null
  filename: string
  upload_date: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  transactions_count: number
  error_message: string | null
}

export interface Budget {
  id: string
  user_id: string
  category_id: string
  amount: number
  period: 'weekly' | 'monthly' | 'yearly'
  start_date: string
  created_at: string
  category?: Category
}

export interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  netSavings: number
  incomeChange: number
  expenseChange: number
}

export interface CategorySpending {
  category: string
  amount: number
  color: string
  percentage: number
}

export interface MonthlyTrend {
  month: string
  income: number
  expenses: number
}
