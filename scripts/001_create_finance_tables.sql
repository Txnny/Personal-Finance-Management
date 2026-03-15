-- ============================================================
-- FinanceFlow — Full Database Setup
-- Run this entire script in the Supabase SQL Editor once.
-- ============================================================

-- ── Tables ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  bank_name       TEXT,
  account_type    TEXT        DEFAULT 'checking',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  type            TEXT        NOT NULL CHECK (type IN ('income', 'expense')),
  color           TEXT        DEFAULT '#6366f1',
  icon            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.statement_uploads (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_account_id     UUID        REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  filename            TEXT        NOT NULL,
  upload_date         TIMESTAMPTZ DEFAULT NOW(),
  transactions_count  INTEGER     DEFAULT 0,
  status              TEXT        DEFAULT 'pending',
  error_message       TEXT
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_account_id      UUID           REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  category_id          UUID           REFERENCES public.categories(id) ON DELETE SET NULL,
  statement_upload_id  UUID           REFERENCES public.statement_uploads(id) ON DELETE SET NULL,
  description          TEXT           NOT NULL,
  merchant             TEXT,
  amount               DECIMAL(12, 2) NOT NULL,
  type                 TEXT           NOT NULL CHECK (type IN ('income', 'expense')),
  date                 DATE           NOT NULL,
  is_recurring         BOOLEAN        DEFAULT FALSE,
  created_at           TIMESTAMPTZ    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.budgets (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id     UUID           REFERENCES public.categories(id) ON DELETE CASCADE,
  amount          DECIMAL(12, 2) NOT NULL,
  period          TEXT           DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'yearly')),
  start_date      DATE,
  created_at      TIMESTAMPTZ    DEFAULT NOW()
);

-- ── Row Level Security ───────────────────────────────────────

ALTER TABLE public.bank_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statement_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets           ENABLE ROW LEVEL SECURITY;

-- bank_accounts
CREATE POLICY "bank_accounts_select" ON public.bank_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bank_accounts_insert" ON public.bank_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bank_accounts_update" ON public.bank_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "bank_accounts_delete" ON public.bank_accounts FOR DELETE USING (auth.uid() = user_id);

-- categories
CREATE POLICY "categories_select" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "categories_delete" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- transactions
CREATE POLICY "transactions_select" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transactions_delete" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- statement_uploads
CREATE POLICY "uploads_select" ON public.statement_uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "uploads_insert" ON public.statement_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "uploads_update" ON public.statement_uploads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "uploads_delete" ON public.statement_uploads FOR DELETE USING (auth.uid() = user_id);

-- budgets
CREATE POLICY "budgets_select" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "budgets_insert" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets_update" ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "budgets_delete" ON public.budgets FOR DELETE USING (auth.uid() = user_id);
