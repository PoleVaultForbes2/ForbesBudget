export type Category = 'essentials' | 'future' | 'joy' | 'tithe'
export type JoyOwner = 'joshua' | 'sav'
export type SavingsGoalKey =
  | 'emergency'
  | 'general'
  | 'debt'
  | 'joy_savings'
  | 'josh_joy_bank'
  | 'wifey_joy_bank'

export interface Transaction {
  id: string
  category: Category
  description: string
  date: string       // 'YYYY-MM-DD'
  amount: number
  joyOwner?: JoyOwner
  note?: string
}

export interface CategoryConfig {
  key: Category
  label: string
  percentage: number
  color: string
  accentVar: string
}

export interface SavingsGoal {
  key: SavingsGoalKey
  label: string
  balance: number
}

export interface SavingsState {
  totalSavings: number
  unallocated: number
  goals: SavingsGoal[]
}

// A single month's worth of data (app-shape, used by components)
export interface MonthRecord {
  id: string              // uuid from the months table
  monthKey: string        // 'YYYY-MM'
  monthlyIncome: number
  transactions: Transaction[]
  categories: CategoryConfig[]
  closedOut: boolean      // true = read-only archived month
}

// Top-level in-memory app state
export interface AppStorage {
  months: MonthRecord[]           // all months, past + current
  activeMonthKey: string          // which month the user is viewing
}

// ─── DB row shapes (snake_case, matches Supabase tables exactly) ───

export interface DbMonthRow {
  id: string
  month_key: string
  monthly_income: number
  closed_out: boolean
  created_at: string
}

export interface DbCategoryRow {
  id: string
  month_id: string
  key: Category
  label: string
  percentage: number
  color: string
  accent_var: string
}

export interface DbTransactionRow {
  id: string
  month_id: string
  category: Category
  description: string
  date: string
  amount: number
  joy_owner?: JoyOwner | null
  note: string | null
  created_at: string
}

export interface DbSavingsStateRow {
  id: string
  total_savings: number
  unallocated: number
  updated_at: string
}

export interface DbSavingsGoalRow {
  id: string
  state_id: string
  key: SavingsGoalKey
  label: string
  balance: number
}
