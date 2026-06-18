# System Context

This document details the architectural boundaries, tech stack, and deployment environment of the budget tracker. Reference this file alongside `project_purpose.md` before executing modifications altering data structures, state cascading, API contracts, or persistence.

## Application Architecture

### Project Strucutre
- /ForbesBudget
    -/node_modules
    -/public
    -/src
        -/assets
        -/components
        -/types
        -/lib
            -supabaseClient.ts
    -project_purpose.md
    -system_contex.md
    -package.json
    -.env.local

### Frontend (Web Client)
* **Local Directory:** `C:\Users\josmi\OneDrive\Documents\BudgetApp\ForbesBudget`
* **Core Framework:** React (TypeScript) with a single-page architecture.
* **Styling Strategy:** Native CSS variables (`--col-accent`, etc.) mapped to functional UI modules (`BudgetColumn.css`, `AddExpenseModal.css`) to enforce theme consistency.
* **Key State Engine:** A centralized `BudgetState` mapping transactions, income parameters, and active category distributions.

### Backend & Storage
* **Current State:** Persistent storage is handled through Supabase using the official `@supabase/supabase-js` client.
* **Supabase Client:** `src/lib/supabaseClient.ts` creates and exports the shared `supabase` client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env.local`.
* **Data Access Layer:** `src/api/budgetApi.ts` is the app's storage boundary. It fetches and mutates the `months`, `categories`, and `transactions` tables, then maps database snake_case rows into the React app's camelCase `MonthRecord`, `CategoryConfig`, and `Transaction` shapes.
* **App Loading:** `App.tsx` calls `fetchAllMonths()` on startup. If no month exists yet, it creates the current month in Supabase with zero income and default categories.
* **Category Migrations:** Existing Supabase months are not auto-mutated during app startup. When adding a new category, update constraints and insert category rows manually in Supabase.
* **Mutation Pattern:** Budget actions use optimistic local UI updates, write through to Supabase, and roll back with a save-error toast if the database write fails.
* **Local State Role:** React state remains the in-memory UI state for the active session. `localStorage` is no longer the source of truth for budget data.

### Database Schema

-- ════════════════════════════════════════════════════════════════
-- Budget App — Supabase Schema
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New Query)
-- ════════════════════════════════════════════════════════════════
 
-- ─── 1. MONTHS ──────────────────────────────────────────────────
-- One row per budgeting month (e.g. "2026-06")
create table months (
  id uuid primary key default gen_random_uuid(),
  month_key text not null unique,        -- 'YYYY-MM', e.g. '2026-06'
  monthly_income numeric(10, 2) not null default 5000,
  closed_out boolean not null default false,
  created_at timestamptz not null default now()
);
 
-- ─── 2. CATEGORIES ──────────────────────────────────────────────
-- One row per category, per month (Essentials/Future/Joy/Tithe each month)
create table categories (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references months(id) on delete cascade,
  key text not null check (key in ('essentials', 'future', 'joy', 'tithe')),
  label text not null,
  percentage numeric(5, 2) not null,
  color text not null,
  accent_var text not null,
 
  -- Prevent duplicate categories within the same month
  unique (month_id, key)
);
 
-- ─── 3. TRANSACTIONS ────────────────────────────────────────────
-- One row per expense entry
create table transactions (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references months(id) on delete cascade,
  category text not null check (category in ('essentials', 'future', 'joy', 'tithe')),
  description text not null,
  date date not null,
  amount numeric(10, 2) not null,
  note text,
  created_at timestamptz not null default now()
);
 
-- ─── Indexes for common queries ─────────────────────────────────
create index idx_categories_month_id on categories(month_id);
create index idx_transactions_month_id on transactions(month_id);
create index idx_transactions_date on transactions(date);
 
-- ─── Enable Row Level Security but allow full public access ─────
-- Since this is a private 2-person app using the anon key with no
-- login system, we open up full read/write access to anyone with
-- the anon key (i.e. just you and your fiancée via the app).
alter table months enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
 
create policy "Allow all access to months" on months
  for all using (true) with check (true);
 
create policy "Allow all access to categories" on categories
  for all using (true) with check (true);
 
create policy "Allow all access to transactions" on transactions
  for all using (true) with check (true);

### Existing Supabase Migration Notes
If the Supabase project was originally created with only the first three categories, update the existing check constraints before inserting Tithe rows:

```sql
alter table categories drop constraint if exists categories_key_check;
alter table categories
  add constraint categories_key_check
  check (key in ('essentials', 'future', 'joy', 'tithe'));

alter table transactions drop constraint if exists transactions_category_check;
alter table transactions
  add constraint transactions_category_check
  check (category in ('essentials', 'future', 'joy', 'tithe'));

insert into categories (month_id, key, label, percentage, color, accent_var)
select id, 'tithe', 'Tithe', 10, '#f87171', '--red'
from months
on conflict (month_id, key) do nothing;
```

## Data Structures & Domains

### Monthly Income
`months.monthly_income` stores the active month's cumulative income budget. The UI supports adding paycheck amounts as they arrive while preserving an edit-total control for corrections. New months start with zero income and inherit category percentages.

### Category Allocations
A rigid framework partitioning monthly income across dynamic categories:
* **Essentials (50%):** Static overheads (Rent, Groceries, Gas, Take Out).
* **Future (30%):** Forward wealth generation and liabilities (Retirement, Savings, Debt).
* **Joy (10%):** Guilt-free lifestyle spending (Going out, Alcohol, Games).
* **Tithe (10%):** Giving allocation tracked as its own first-class budget category.

### Transactions
Every ledger record is explicitly typed and constrained to:
* `id`: Unique generated alpha-numeric string.
* `category`: Linked to an authorized parent category key.
* `description`: The core text identifier (frequently matched against pre-defined `CATEGORY_PRESETS`).
* `amount`: Strict float format restricted to 2 decimal places.
* `date`: ISO string (`YYYY-MM-DD`).
* `note`: Optional text metadata block.

## Presets Dictionary
These are the 4 categories with their subcategories we have so far:

### Essential
- Rent
- Groceries
- Gas
- Take Out

### Future
- Retirement
- Savings
- Debt

### Joy
- Going Out
- Alcohol
- Games

### Tithe
- Tithe
