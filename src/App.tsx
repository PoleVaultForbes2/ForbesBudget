// App.tsx

import { useState, useEffect, useCallback } from 'react'
import type {
  MonthRecord,
  Transaction,
  CategoryConfig,
  Category,
  SavingsState,
  SavingsGoalKey,
  SavingsTransaction,
} from './types/budget'
import BudgetColumn from './components/BudgetColumn'
import TransactionLog from './components/TransactionLog'
import CategorySettings from './components/CategorySettings'
import SavingsPage from './components/SavingsPage'
import NewMonthBanner from './components/NewMonthBanner'
import { LoadingScreen, ErrorScreen } from './components/StatusScreen'
import SaveErrorToast from './components/SaveErrorToast'
import {
  addSavingsInflow,
  autoAllocateSavings,
  isSavingsContribution,
  manuallyAllocateSavings,
  normalizeSavingsState,
  recordSavingsTransaction,
  removeSavingsInflow,
  setSavingsTotal,
  transferSavings,
  withdrawSavings,
} from './lib/savings'
import * as api from './api/budgetApi'
import './App.css'

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { key: 'essentials', label: 'Essentials', percentage: 50, color: '#4ade80', accentVar: '--green' },
  { key: 'future',     label: 'Future',     percentage: 30, color: '#60a5fa', accentVar: '--blue'  },
  { key: 'joy',        label: 'Joy',        percentage: 10, color: '#fbbf24', accentVar: '--amber' },
  { key: 'tithe',      label: 'Tithe',      percentage: 10, color: '#f87171', accentVar: '--red'   },
]

const CATEGORY_PRESETS: Record<string, string[]> = {
  essentials: ['Rent', 'Groceries', 'Gas', 'Take Out', 'Subs'],
  future: ['Retirement', 'Savings', 'Debt', 'Roth'],
  joy: ['Going out', 'Alcohol', 'Games', 'Joy Bank'],
  tithe: ['Tithe'],
}

const STARTING_MONTHLY_INCOME = 0
const NEW_MONTH_SETUP_DAYS_LEFT = 7
const MS_PER_DAY = 24 * 60 * 60 * 1000

// ─── Helpers ────────────────────────────────────────────────────────────────

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthKeyToLabel(key: string): string {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleString('default', { month: 'long', year: 'numeric' })
}

function prevMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return toMonthKey(new Date(y, m - 2, 1))
}

function nextMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return toMonthKey(new Date(y, m, 1))
}

function daysLeftInMonth(date: Date): number {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return Math.round((endOfMonth.getTime() - today.getTime()) / MS_PER_DAY)
}

function generateTempId() {
  return 'temp-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function orderCategories(categories: CategoryConfig[]): CategoryConfig[] {
  const defaultOrder = new Map(DEFAULT_CATEGORIES.map((cat, index) => [cat.key, index]))

  return [...categories].sort((a, b) => (
    (defaultOrder.get(a.key) ?? Number.MAX_SAFE_INTEGER) -
    (defaultOrder.get(b.key) ?? Number.MAX_SAFE_INTEGER)
  ))
}

// ─── App ────────────────────────────────────────────────────────────────────

type Page = 'budget' | 'savings'
type LoadState = 'loading' | 'error' | 'ready'
type IncomeMode = 'idle' | 'add' | 'edit'

export default function App() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadErrorMsg, setLoadErrorMsg] = useState('')
  const [months, setMonths] = useState<MonthRecord[]>([])
  const [savings, setSavings] = useState<SavingsState | null>(null)
  const [activeMonthKey, setActiveMonthKey] = useState<string>(toMonthKey(new Date()))
  const [saveError, setSaveError] = useState<string | null>(null)

  const [page, setPage] = useState<Page>('budget')
  const [incomeMode, setIncomeMode] = useState<IncomeMode>('idle')
  const [incomeInput, setIncomeInput] = useState('')
  const [showCategorySettings, setShowCategorySettings] = useState(false)

  // ── Initial fetch from Supabase ──
  const loadData = useCallback(async () => {
    setLoadState('loading')
    try {
      const [initialMonths, fetchedSavings] = await Promise.all([
        api.fetchAllMonths(),
        api.fetchSavingsState(),
      ])
      let fetched = initialMonths

      // First time ever running — no months exist yet, create the current one
      if (fetched.length === 0) {
        const key = toMonthKey(new Date())
        const created = await api.createMonth(key, STARTING_MONTHLY_INCOME, DEFAULT_CATEGORIES)
        fetched = [created]
      }

      fetched = fetched.map(month => ({
        ...month,
        categories: orderCategories(month.categories),
      }))

      setMonths(fetched)
      setSavings(normalizeSavingsState(fetchedSavings))
      const latestKey = fetched.map(m => m.monthKey).sort().slice(-1)[0]
      setActiveMonthKey(latestKey)
      setLoadState('ready')
    } catch (err) {
      console.error(err)
      setLoadErrorMsg(
        err instanceof Error ? err.message : 'Something went wrong connecting to the database.'
      )
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(loadData)
  }, [loadData])

  // ── Derived values ──
  const activeMonth = months.find(m => m.monthKey === activeMonthKey)
  const today = new Date()
  const realMonthKey = toMonthKey(today)
  const isReadOnly = activeMonth?.closedOut ?? false

  const sortedKeys = months.map(m => m.monthKey).sort()
  const latestStoredKey = sortedKeys[sortedKeys.length - 1]
  const isNewMonthSetupWindow =
    latestStoredKey === realMonthKey &&
    daysLeftInMonth(today) < NEW_MONTH_SETUP_DAYS_LEFT

  const showNewMonthBanner =
    !isReadOnly &&
    activeMonthKey === latestStoredKey &&
    latestStoredKey <= realMonthKey &&
    (latestStoredKey < realMonthKey || isNewMonthSetupWindow)

  const canGoPrev = sortedKeys.length > 0 && sortedKeys[0] < activeMonthKey
  const canGoNext = activeMonthKey < latestStoredKey

  const totalSpent = activeMonth?.transactions.reduce((s, t) => s + t.amount, 0) ?? 0
  const totalBudget = activeMonth?.monthlyIncome ?? 0
  const totalRemaining = totalBudget - totalSpent

  const newMonthLabel = monthKeyToLabel(nextMonthKey(latestStoredKey || realMonthKey))

  // ── Local state helpers ──

  function patchMonth(monthId: string, updater: (m: MonthRecord) => MonthRecord) {
    setMonths(prev => prev.map(m => (m.id === monthId ? updater(m) : m)))
  }

  function flashSaveError(context: string) {
    setSaveError(`Couldn't save your ${context}. Check your connection and try again.`)
  }

  async function persistSavingsChange(
    previousSavings: SavingsState,
    nextSavings: SavingsState,
    context: string
  ) {
    setSavings(nextSavings)
    try {
      await api.updateSavingsState(nextSavings)
    } catch (err) {
      console.error(err)
      setSavings(previousSavings)
      flashSaveError(context)
    }
  }

  async function persistSavingsChangeWithActivity(
    previousSavings: SavingsState,
    nextSavings: SavingsState,
    activity: SavingsTransaction,
    context: string
  ) {
    setSavings(nextSavings)
    try {
      await api.updateSavingsState(nextSavings)
      const savedActivity = await api.insertSavingsTransaction({
        type: activity.type,
        amount: activity.amount,
        description: activity.description,
        goalKey: activity.goalKey,
        createdAt: activity.createdAt,
      })

      setSavings(currentSavings => (
        currentSavings
          ? normalizeSavingsState({
              ...currentSavings,
              transactions: currentSavings.transactions.map(transaction => (
                transaction.id === activity.id ? savedActivity : transaction
              )),
            })
          : currentSavings
      ))
    } catch (err) {
      console.error(err)
      try {
        await api.updateSavingsState(previousSavings)
      } catch (rollbackErr) {
        console.error(rollbackErr)
      }
      setSavings(previousSavings)
      flashSaveError(context)
    }
  }

  function buildSavingsActivity(
    type: SavingsTransaction['type'],
    amount: number,
    description: string,
    goalKey?: SavingsGoalKey
  ): SavingsTransaction {
    return {
      id: generateTempId(),
      type,
      amount,
      description,
      goalKey,
      createdAt: new Date().toISOString(),
    }
  }

  function buildSavingsInflowState(
    currentSavings: SavingsState | null,
    transaction: Omit<Transaction, 'id'> | Transaction
  ): SavingsState | null {
    if (!currentSavings || !isSavingsContribution(transaction)) return null
    return addSavingsInflow(currentSavings, transaction.amount)
  }

  function buildSavingsRemovalState(
    currentSavings: SavingsState | null,
    transaction: Transaction
  ): SavingsState | null {
    if (!currentSavings || !isSavingsContribution(transaction)) return null
    return removeSavingsInflow(currentSavings, transaction.amount)
  }

  function startAddingIncome() {
    setIncomeInput('')
    setIncomeMode('add')
  }

  function startEditingIncome() {
    if (!activeMonth) return
    setIncomeInput(String(activeMonth.monthlyIncome))
    setIncomeMode('edit')
  }

  function cancelIncomeEntry() {
    setIncomeInput('')
    setIncomeMode('idle')
  }

  function parsePositiveMoney(value: string): number | null {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return null
    return Math.round(parsed * 100) / 100
  }

  // ── Mutations (optimistic update + background DB write + rollback on failure) ──

  async function addTransaction(t: Omit<Transaction, 'id'>) {
    if (!activeMonth) return
    const tempId = generateTempId()
    const optimisticTxn: Transaction = { ...t, id: tempId }
    const previousSavings = savings
    const nextSavings = buildSavingsInflowState(previousSavings, t)

    // Optimistic update
    patchMonth(activeMonth.id, m => ({ ...m, transactions: [...m.transactions, optimisticTxn] }))
    if (nextSavings) setSavings(nextSavings)

    let saved: Transaction | null = null
    try {
      saved = await api.insertTransaction(activeMonth.id, t)
      if (!saved) throw new Error('Transaction insert failed')
      if (nextSavings) await api.updateSavingsState(nextSavings)

      const committed = saved

      // Swap temp transaction for the real one (with real DB id)
      patchMonth(activeMonth.id, m => ({
        ...m,
        transactions: m.transactions.map(txn => (txn.id === tempId ? committed : txn)),
      }))
    } catch (err) {
      console.error(err)
      if (saved) {
        try {
          await api.deleteTransaction(saved.id)
        } catch (cleanupErr) {
          console.error(cleanupErr)
        }
      }
      // Roll back
      patchMonth(activeMonth.id, m => ({
        ...m,
        transactions: m.transactions.filter(txn => txn.id !== tempId),
      }))
      if (previousSavings) setSavings(previousSavings)
      flashSaveError(nextSavings ? 'savings contribution' : 'expense')
    }
  }

  async function deleteTransaction(id: string) {
    if (!activeMonth) return
    const removed = activeMonth.transactions.find(t => t.id === id)
    if (!removed) return
    const previousSavings = savings
    const nextSavings = buildSavingsRemovalState(previousSavings, removed)

    // Optimistic update
    patchMonth(activeMonth.id, m => ({ ...m, transactions: m.transactions.filter(t => t.id !== id) }))
    if (nextSavings) setSavings(nextSavings)

    let savingsSaved = false
    try {
      if (nextSavings) {
        await api.updateSavingsState(nextSavings)
        savingsSaved = true
      }
      await api.deleteTransaction(id)
    } catch (err) {
      console.error(err)
      if (savingsSaved && previousSavings) {
        try {
          await api.updateSavingsState(previousSavings)
        } catch (rollbackErr) {
          console.error(rollbackErr)
        }
      }
      // Roll back — restore the removed transaction
      patchMonth(activeMonth.id, m => ({ ...m, transactions: [...m.transactions, removed] }))
      if (previousSavings) setSavings(previousSavings)
      flashSaveError('deletion')
    }
  }

  async function commitIncome() {
    if (!activeMonth || incomeMode === 'idle') return
    const entryMode = incomeMode
    const val = parsePositiveMoney(incomeInput)
    cancelIncomeEntry()
    if (val === null) return

    const previousIncome = activeMonth.monthlyIncome
    const nextIncome = entryMode === 'add'
      ? Math.round((previousIncome + val) * 100) / 100
      : val

    patchMonth(activeMonth.id, m => ({ ...m, monthlyIncome: nextIncome }))

    try {
      await api.updateMonthlyIncome(activeMonth.id, nextIncome)
    } catch (err) {
      console.error(err)
      patchMonth(activeMonth.id, m => ({ ...m, monthlyIncome: previousIncome }))
      flashSaveError(entryMode === 'add' ? 'paycheck' : 'budget amount')
    }
  }

  async function updateTotalSavings(totalSavings: number) {
    if (!savings) return
    const nextSavings = setSavingsTotal(savings, totalSavings)
    if (!nextSavings) {
      flashSaveError('savings total')
      return
    }

    await persistSavingsChange(savings, nextSavings, 'savings total')
  }

  async function addDirectSavings(amount: number) {
    if (!savings) return
    const activity = buildSavingsActivity('deposit', amount, 'Manual savings add')
    const nextSavings = recordSavingsTransaction(
      addSavingsInflow(savings, amount),
      activity
    )

    await persistSavingsChangeWithActivity(savings, nextSavings, activity, 'savings deposit')
  }

  async function allocateSavingsManually(goalKey: SavingsGoalKey, amount: number) {
    if (!savings) return
    const nextSavings = manuallyAllocateSavings(savings, goalKey, amount)
    if (!nextSavings) {
      flashSaveError('savings allocation')
      return
    }

    await persistSavingsChange(savings, nextSavings, 'savings allocation')
  }

  async function autoAllocateUnallocatedSavings() {
    if (!savings) return
    const nextSavings = autoAllocateSavings(savings)
    if (!nextSavings) return

    await persistSavingsChange(savings, nextSavings, 'savings allocation')
  }

  async function subtractFromSavingsGoal(
    goalKey: SavingsGoalKey,
    amount: number,
    description: string
  ) {
    if (!savings) return
    const nextBalances = withdrawSavings(savings, goalKey, amount)
    if (!nextBalances) {
      flashSaveError('savings withdrawal')
      return
    }

    const activity = buildSavingsActivity('withdrawal', amount, description, goalKey)
    const nextSavings = recordSavingsTransaction(nextBalances, activity)

    await persistSavingsChangeWithActivity(savings, nextSavings, activity, 'savings withdrawal')
  }

  async function moveSavingsBetweenGoals(
    fromGoalKey: SavingsGoalKey,
    toGoalKey: SavingsGoalKey,
    amount: number
  ) {
    if (!savings) return
    const nextSavings = transferSavings(savings, fromGoalKey, toGoalKey, amount)
    if (!nextSavings) {
      flashSaveError('savings transfer')
      return
    }

    await persistSavingsChange(savings, nextSavings, 'savings transfer')
  }

  async function updateCategoryPercentage(key: Category, newPercentage: number) {
    if (!activeMonth) return
    const previous = activeMonth.categories.find(c => c.key === key)?.percentage
    patchMonth(activeMonth.id, m => ({
      ...m,
      categories: m.categories.map(cat => (cat.key === key ? { ...cat, percentage: newPercentage } : cat)),
    }))

    try {
      await api.updateCategoryPercentage(activeMonth.id, key, newPercentage)
    } catch (err) {
      console.error(err)
      if (previous !== undefined) {
        patchMonth(activeMonth.id, m => ({
          ...m,
          categories: m.categories.map(cat => (cat.key === key ? { ...cat, percentage: previous } : cat)),
        }))
      }
      flashSaveError('category percentage')
    }
  }

  async function startNewMonth() {
    const lastMonth = months.find(m => m.monthKey === latestStoredKey)
    if (!lastMonth) return
    const newKey = nextMonthKey(latestStoredKey)

    try {
      // Close out the old month in the DB
      await api.setMonthClosedOut(lastMonth.id, true)
      // Create the new month in the DB, carrying categories forward and resetting income for new paychecks.
      const newMonth = await api.createMonth(newKey, STARTING_MONTHLY_INCOME, lastMonth.categories)

      setMonths(prev => [
        ...prev.map(m => (m.id === lastMonth.id ? { ...m, closedOut: true } : m)),
        newMonth,
      ])
      setActiveMonthKey(newKey)
    } catch (err) {
      console.error(err)
      flashSaveError('new month setup')
    }
  }

  function navigate(dir: 'prev' | 'next') {
    setActiveMonthKey(prev => (dir === 'prev' ? prevMonthKey(prev) : nextMonthKey(prev)))
    cancelIncomeEntry()
  }

  // ── Render states ──

  if (loadState === 'loading') return <LoadingScreen />
  if (loadState === 'error') return <ErrorScreen message={loadErrorMsg} onRetry={loadData} />
  if (!activeMonth || !savings) return <LoadingScreen />

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon">◈</span>
        </div>

        <div className="page-toggle">
          <button
            className={`toggle-btn ${page === 'budget' ? 'active' : ''}`}
            onClick={() => setPage('budget')}
          >
            Budget
          </button>
          <button
            className={`toggle-btn ${page === 'savings' ? 'active' : ''}`}
            onClick={() => setPage('savings')}
          >
            Savings
          </button>
        </div>

        <button
          className="settings-btn"
          onClick={() => setShowCategorySettings(true)}
          title="Edit category percentages"
          aria-label="Category settings"
        >
          ⚙️
        </button>
      </header>

      {page === 'savings' ? (
        <SavingsPage
          savings={savings}
          onUpdateTotalSavings={updateTotalSavings}
          onAddSavings={addDirectSavings}
          onManualAllocate={allocateSavingsManually}
          onAutoAllocate={autoAllocateUnallocatedSavings}
          onWithdraw={subtractFromSavingsGoal}
          onTransfer={moveSavingsBetweenGoals}
        />
      ) : (
        <main className="app-main">
          {/* ── Month navigator ── */}
          <div className="month-nav">
            <button
              className="month-nav-btn"
              onClick={() => navigate('prev')}
              disabled={!canGoPrev}
              aria-label="Previous month"
            >
              ←
            </button>
            <div className="month-nav-center">
              <span className="month-nav-label">{monthKeyToLabel(activeMonthKey)}</span>
              {isReadOnly && <span className="month-archived-badge">Archived</span>}
            </div>
            <button
              className="month-nav-btn"
              onClick={() => navigate('next')}
              disabled={!canGoNext}
              aria-label="Next month"
            >
              →
            </button>
          </div>

          {/* ── New month banner ── */}
          {showNewMonthBanner && (
            <NewMonthBanner newMonthLabel={newMonthLabel} onStartNewMonth={startNewMonth} />
          )}

          {/* ── Read-only notice ── */}
          {isReadOnly && (
            <div className="readonly-notice">
              🔒 This month is archived and cannot be edited.
            </div>
          )}

          {/* ── Overview ── */}
          <section className="overview">
            <div className="overview-income">
              <span className="overview-label">Monthly Income</span>
              {!isReadOnly && incomeMode !== 'idle' ? (
                <div className="income-edit">
                  <span className="income-entry-label">
                    {incomeMode === 'add' ? 'Paycheck' : 'Total'}
                  </span>
                  <span className="income-dollar">$</span>
                  <input
                    className="income-input"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={incomeInput}
                    onChange={e => setIncomeInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void commitIncome()
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault()
                        cancelIncomeEntry()
                      }
                    }}
                    aria-label={incomeMode === 'add' ? 'Paycheck amount' : 'Monthly income total'}
                    autoFocus
                  />
                  <button className="income-save-btn" onClick={() => void commitIncome()}>
                    {incomeMode === 'add' ? 'Add' : 'Save'}
                  </button>
                  <button className="income-cancel-btn" onClick={cancelIncomeEntry}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="income-summary">
                  <span className={`income-display ${isReadOnly ? 'readonly' : ''}`}>
                    ${activeMonth.monthlyIncome.toLocaleString()}
                  </span>
                  {!isReadOnly && (
                    <div className="income-actions">
                      <button className="income-action primary" onClick={startAddingIncome}>
                        + Paycheck
                      </button>
                      <button className="income-action" onClick={startEditingIncome}>
                        Edit total
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="overview-stats">
              <div className="stat">
                <span className="stat-val spent">
                  ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="stat-label">spent</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <span className={`stat-val ${totalRemaining < 0 ? 'over' : 'remaining'}`}>
                  {totalRemaining < 0 ? '-' : ''}${Math.abs(totalRemaining).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="stat-label">{totalRemaining < 0 ? 'over budget' : 'remaining'}</span>
              </div>
            </div>

            {/* Global segmented progress bar */}
            <div className="global-bar-track">
              {activeMonth.categories.map(cat => {
                const catSpent = activeMonth.transactions
                  .filter(t => t.category === cat.key)
                  .reduce((s, t) => s + t.amount, 0)
                const pct = totalBudget > 0 ? Math.min((catSpent / totalBudget) * 100, 100) : 0
                return (
                  <div
                    key={cat.key}
                    className="global-bar-segment"
                    style={{ width: `${pct}%`, background: cat.color }}
                    title={`${cat.label}: $${catSpent.toFixed(2)}`}
                  />
                )
              })}
            </div>
            <div className="global-bar-legend">
              {activeMonth.categories.map(cat => (
                <span key={cat.key} className="legend-item">
                  <span className="legend-dot" style={{ background: cat.color }} />
                  {cat.label}
                </span>
              ))}
            </div>
          </section>

          {/* ── Budget columns ── */}
          <section className="columns">
            {activeMonth.categories.map(cat => {
              const budget = Math.round(activeMonth.monthlyIncome * cat.percentage / 100)
              const catTransactions = activeMonth.transactions.filter(t => t.category === cat.key)
              return (
                <BudgetColumn
                  key={cat.key}
                  config={cat}
                  budget={budget}
                  transactions={catTransactions}
                  onAddTransaction={addTransaction}
                  presets={CATEGORY_PRESETS[cat.key] || []}
                  readOnly={isReadOnly}
                />
              )
            })}
          </section>

          {/* ── Transaction log ── */}
          <TransactionLog
            transactions={activeMonth.transactions}
            categories={activeMonth.categories}
            onDelete={deleteTransaction}
            readOnly={isReadOnly}
          />
        </main>
      )}

      {/* ── Category settings modal ── */}
      {showCategorySettings && (
        <CategorySettings
          categories={activeMonth.categories}
          onUpdateCategory={updateCategoryPercentage}
          onClose={() => setShowCategorySettings(false)}
        />
      )}

      {/* ── Background save error toast ── */}
      {saveError && (
        <SaveErrorToast message={saveError} onDismiss={() => setSaveError(null)} />
      )}
    </div>
  )
}
