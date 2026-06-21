import { supabase } from '../lib/supabaseClient'
import type {
  MonthRecord,
  Transaction,
  CategoryConfig,
  Category,
  SavingsState,
  SavingsGoal,
  DbMonthRow,
  DbCategoryRow,
  DbTransactionRow,
  DbSavingsStateRow,
  DbSavingsGoalRow,
} from '../types/budget'
import {
  DEFAULT_SAVINGS_GOALS,
  DEFAULT_SAVINGS_STATE,
  normalizeSavingsState,
} from '../lib/savings'

const SAVINGS_STATE_ID = 'shared'

function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '42P01'
  )
}

// ─── Mappers: DB row shape → app shape ──────────────────────────

function mapTransaction(row: DbTransactionRow): Transaction {
  return {
    id: row.id,
    category: row.category,
    description: row.description,
    date: row.date,
    amount: Number(row.amount),
    joyOwner: row.joy_owner ?? undefined,
    note: row.note ?? undefined,
  }
}

function mapCategory(row: DbCategoryRow): CategoryConfig {
  return {
    key: row.key,
    label: row.label,
    percentage: Number(row.percentage),
    color: row.color,
    accentVar: row.accent_var,
  }
}

function mapSavingsGoal(row: DbSavingsGoalRow): SavingsGoal {
  return {
    key: row.key,
    label: row.label,
    balance: Number(row.balance),
  }
}

function mapSavingsState(
  row: DbSavingsStateRow,
  goalRows: DbSavingsGoalRow[]
): SavingsState {
  return normalizeSavingsState({
    totalSavings: Number(row.total_savings),
    unallocated: Number(row.unallocated),
    goals: DEFAULT_SAVINGS_GOALS.map(defaultGoal => {
      const storedGoal = goalRows.find(goal => goal.key === defaultGoal.key)
      return storedGoal ? mapSavingsGoal(storedGoal) : defaultGoal
    }),
  })
}

function toCategoryInsert(monthId: string, category: CategoryConfig) {
  return {
    month_id: monthId,
    key: category.key,
    label: category.label,
    percentage: category.percentage,
    color: category.color,
    accent_var: category.accentVar,
  }
}

function toSavingsGoalUpsert(goal: SavingsGoal) {
  return {
    state_id: SAVINGS_STATE_ID,
    key: goal.key,
    label: goal.label,
    balance: goal.balance,
  }
}

function mapMonth(
  row: DbMonthRow,
  categoryRows: DbCategoryRow[],
  transactionRows: DbTransactionRow[]
): MonthRecord {
  return {
    id: row.id,
    monthKey: row.month_key,
    monthlyIncome: Number(row.monthly_income),
    closedOut: row.closed_out,
    categories: categoryRows.filter(c => c.month_id === row.id).map(mapCategory),
    transactions: transactionRows.filter(t => t.month_id === row.id).map(mapTransaction),
  }
}

// ─── Fetch everything needed on app load ────────────────────────

export async function fetchAllMonths(): Promise<MonthRecord[]> {
  const [monthsRes, categoriesRes, transactionsRes] = await Promise.all([
    supabase.from('months').select('*').order('month_key', { ascending: true }),
    supabase.from('categories').select('*'),
    supabase.from('transactions').select('*'),
  ])

  if (monthsRes.error) throw monthsRes.error
  if (categoriesRes.error) throw categoriesRes.error
  if (transactionsRes.error) throw transactionsRes.error

  const months = monthsRes.data as DbMonthRow[]
  const categories = categoriesRes.data as DbCategoryRow[]
  const transactions = transactionsRes.data as DbTransactionRow[]

  return months.map(m => mapMonth(m, categories, transactions))
}

async function createDefaultSavingsState(): Promise<SavingsState> {
  const normalized = normalizeSavingsState(DEFAULT_SAVINGS_STATE)

  const { error: stateErr } = await supabase
    .from('savings_state')
    .upsert({
      id: SAVINGS_STATE_ID,
      total_savings: normalized.totalSavings,
      unallocated: normalized.unallocated,
      updated_at: new Date().toISOString(),
    })

  if (stateErr) {
    if (isMissingTableError(stateErr)) return normalizeSavingsState(DEFAULT_SAVINGS_STATE)
    throw stateErr
  }

  const { error: goalsErr } = await supabase
    .from('savings_goals')
    .upsert(normalized.goals.map(toSavingsGoalUpsert), { onConflict: 'state_id,key' })

  if (goalsErr) {
    if (isMissingTableError(goalsErr)) return normalizeSavingsState(DEFAULT_SAVINGS_STATE)
    throw goalsErr
  }
  return normalized
}

export async function fetchSavingsState(): Promise<SavingsState> {
  const { data: stateRow, error: stateErr } = await supabase
    .from('savings_state')
    .select('*')
    .eq('id', SAVINGS_STATE_ID)
    .maybeSingle()

  if (stateErr) throw stateErr
  if (!stateRow) return createDefaultSavingsState()

  const { data: goalRows, error: goalsErr } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('state_id', SAVINGS_STATE_ID)

  if (goalsErr) throw goalsErr

  const existingGoals = (goalRows ?? []) as DbSavingsGoalRow[]
  const missingGoals = DEFAULT_SAVINGS_GOALS.filter(
    defaultGoal => !existingGoals.some(goal => goal.key === defaultGoal.key)
  )

  if (missingGoals.length > 0) {
    const { error: missingErr } = await supabase
      .from('savings_goals')
      .upsert(missingGoals.map(toSavingsGoalUpsert), { onConflict: 'state_id,key' })

    if (missingErr) throw missingErr
  }

  const defaultGoalRows: DbSavingsGoalRow[] = missingGoals.map(goal => ({
    id: '',
    state_id: SAVINGS_STATE_ID,
    key: goal.key,
    label: goal.label,
    balance: goal.balance,
  }))

  return mapSavingsState(stateRow as DbSavingsStateRow, [...existingGoals, ...defaultGoalRows])
}

export async function updateSavingsState(savingsState: SavingsState): Promise<void> {
  const normalized = normalizeSavingsState(savingsState)

  const { error: stateErr } = await supabase
    .from('savings_state')
    .upsert({
      id: SAVINGS_STATE_ID,
      total_savings: normalized.totalSavings,
      unallocated: normalized.unallocated,
      updated_at: new Date().toISOString(),
    })

  if (stateErr) throw stateErr

  const { error: goalsErr } = await supabase
    .from('savings_goals')
    .upsert(normalized.goals.map(toSavingsGoalUpsert), { onConflict: 'state_id,key' })

  if (goalsErr) throw goalsErr
}

// ─── Months ──────────────────────────────────────────────────────

export async function createMonth(
  monthKey: string,
  monthlyIncome: number,
  categories: CategoryConfig[]
): Promise<MonthRecord> {
  const { data: monthRow, error: monthErr } = await supabase
    .from('months')
    .insert({ month_key: monthKey, monthly_income: monthlyIncome, closed_out: false })
    .select()
    .single()

  if (monthErr) throw monthErr

  const categoryInserts = categories.map(c => toCategoryInsert(monthRow.id, c))

  const { data: categoryRows, error: catErr } = await supabase
    .from('categories')
    .insert(categoryInserts)
    .select()

  if (catErr) throw catErr

  return mapMonth(monthRow as DbMonthRow, categoryRows as DbCategoryRow[], [])
}

export async function setMonthClosedOut(monthId: string, closedOut: boolean): Promise<void> {
  const { error } = await supabase
    .from('months')
    .update({ closed_out: closedOut })
    .eq('id', monthId)

  if (error) throw error
}

export async function updateMonthlyIncome(monthId: string, monthlyIncome: number): Promise<void> {
  const { error } = await supabase
    .from('months')
    .update({ monthly_income: monthlyIncome })
    .eq('id', monthId)

  if (error) throw error
}

// ─── Categories ──────────────────────────────────────────────────

export async function updateCategoryPercentage(
  monthId: string,
  key: Category,
  percentage: number
): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update({ percentage })
    .eq('month_id', monthId)
    .eq('key', key)

  if (error) throw error
}

// ─── Transactions ───────────────────────────────────────────────

export async function insertTransaction(
  monthId: string,
  t: Omit<Transaction, 'id'>
): Promise<Transaction> {
  const transactionInsert = {
    month_id: monthId,
    category: t.category,
    description: t.description,
    date: t.date,
    amount: t.amount,
    note: t.note ?? null,
    joy_owner: t.category === 'joy' ? (t.joyOwner ?? null) : null,
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert(transactionInsert)
    .select()
    .single()

  if (error) throw error
  return mapTransaction(data as DbTransactionRow)
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)

  if (error) throw error
}
