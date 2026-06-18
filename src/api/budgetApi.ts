import { supabase } from '../lib/supabaseClient'
import type {
  MonthRecord,
  Transaction,
  CategoryConfig,
  Category,
  DbMonthRow,
  DbCategoryRow,
  DbTransactionRow,
} from '../types/budget'

// ─── Mappers: DB row shape → app shape ──────────────────────────

function mapTransaction(row: DbTransactionRow): Transaction {
  return {
    id: row.id,
    category: row.category,
    description: row.description,
    date: row.date,
    amount: Number(row.amount),
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
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      month_id: monthId,
      category: t.category,
      description: t.description,
      date: t.date,
      amount: t.amount,
      note: t.note ?? null,
    })
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
