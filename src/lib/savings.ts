import type { SavingsGoal, SavingsGoalKey, SavingsState, Transaction } from '../types/budget'

export const DEFAULT_SAVINGS_GOALS: SavingsGoal[] = [
  { key: 'emergency', label: 'Emergency Savings', balance: 0 },
  { key: 'general', label: 'General Savings', balance: 0 },
  { key: 'debt', label: 'Debt Savings', balance: 0 },
  { key: 'joy_savings', label: 'Gifts & Travel', balance: 0 },
  { key: 'josh_joy_bank', label: 'Josh Joy Bank', balance: 0 },
  { key: 'wifey_joy_bank', label: 'Wifey Joy Bank', balance: 0 },
]

export const SAVINGS_GOAL_COLORS: Record<SavingsGoalKey, string> = {
  emergency: '#4ade80',
  general: '#60a5fa',
  debt: '#f87171',
  joy_savings: '#fbbf24',
  josh_joy_bank: '#c084fc',
  wifey_joy_bank: '#f472b6',
}

export const AUTO_ALLOCATION_GOAL_KEYS: SavingsGoalKey[] = [
  'emergency',
  'general',
  'debt',
  'joy_savings',
]

export const AUTO_ALLOCATION_WEIGHTS: Partial<Record<SavingsGoalKey, number>> = {
  emergency: 0.25,
  general: 0.25,
  debt: 0.3333,
  joy_savings: 0.1667,
}

export const DEFAULT_SAVINGS_STATE: SavingsState = {
  totalSavings: 0,
  unallocated: 0,
  goals: DEFAULT_SAVINGS_GOALS,
}

export function roundMoney(amount: number): number {
  return Number(amount.toFixed(2))
}

export function getAllocatedSavingsTotal(goals: SavingsGoal[]): number {
  return roundMoney(goals.reduce((sum, goal) => sum + goal.balance, 0))
}

export function normalizeSavingsState(state: SavingsState): SavingsState {
  const goals = DEFAULT_SAVINGS_GOALS.map(defaultGoal => {
    const existing = state.goals.find(goal => goal.key === defaultGoal.key)
    return {
      ...defaultGoal,
      balance: roundMoney(existing?.balance ?? 0),
    }
  })
  const unallocated = roundMoney(Math.max(0, state.unallocated))

  return {
    totalSavings: roundMoney(unallocated + getAllocatedSavingsTotal(goals)),
    unallocated,
    goals,
  }
}

export function isSavingsContribution(transaction: Pick<Transaction, 'category' | 'description'>): boolean {
  const description = transaction.description.trim().toLowerCase()

  return (
    (transaction.category === 'future' && description === 'savings') ||
    (transaction.category === 'joy' && description === 'joy bank')
  )
}

export function addSavingsInflow(state: SavingsState, amount: number): SavingsState {
  return normalizeSavingsState({
    ...state,
    unallocated: state.unallocated + amount,
  })
}

export function removeSavingsInflow(state: SavingsState, amount: number): SavingsState {
  let remainingReduction = roundMoney(amount)
  const unallocatedReduction = Math.min(state.unallocated, remainingReduction)
  remainingReduction = roundMoney(remainingReduction - unallocatedReduction)

  const goals = state.goals.map(goal => {
    if (remainingReduction <= 0) return goal
    const goalReduction = Math.min(goal.balance, remainingReduction)
    remainingReduction = roundMoney(remainingReduction - goalReduction)
    return { ...goal, balance: roundMoney(goal.balance - goalReduction) }
  })

  return normalizeSavingsState({
    ...state,
    unallocated: roundMoney(state.unallocated - unallocatedReduction),
    goals,
  })
}

export function setSavingsTotal(state: SavingsState, totalSavings: number): SavingsState | null {
  const allocated = getAllocatedSavingsTotal(state.goals)
  const roundedTotal = roundMoney(totalSavings)
  if (roundedTotal < allocated) return null

  return normalizeSavingsState({
    ...state,
    unallocated: roundMoney(roundedTotal - allocated),
  })
}

export function manuallyAllocateSavings(
  state: SavingsState,
  goalKey: SavingsGoalKey,
  amount: number
): SavingsState | null {
  const allocation = roundMoney(amount)
  if (allocation <= 0 || allocation > state.unallocated) return null

  return normalizeSavingsState({
    ...state,
    unallocated: roundMoney(state.unallocated - allocation),
    goals: state.goals.map(goal => (
      goal.key === goalKey
        ? { ...goal, balance: roundMoney(goal.balance + allocation) }
        : goal
    )),
  })
}

export function withdrawSavings(
  state: SavingsState,
  goalKey: SavingsGoalKey,
  amount: number
): SavingsState | null {
  const withdrawal = roundMoney(amount)
  const sourceGoal = state.goals.find(goal => goal.key === goalKey)
  if (!sourceGoal || withdrawal <= 0 || withdrawal > sourceGoal.balance) return null

  return normalizeSavingsState({
    ...state,
    goals: state.goals.map(goal => (
      goal.key === goalKey
        ? { ...goal, balance: roundMoney(goal.balance - withdrawal) }
        : goal
    )),
  })
}

export function transferSavings(
  state: SavingsState,
  fromGoalKey: SavingsGoalKey,
  toGoalKey: SavingsGoalKey,
  amount: number
): SavingsState | null {
  const transfer = roundMoney(amount)
  const sourceGoal = state.goals.find(goal => goal.key === fromGoalKey)
  if (
    !sourceGoal ||
    fromGoalKey === toGoalKey ||
    transfer <= 0 ||
    transfer > sourceGoal.balance
  ) {
    return null
  }

  return normalizeSavingsState({
    ...state,
    goals: state.goals.map(goal => {
      if (goal.key === fromGoalKey) {
        return { ...goal, balance: roundMoney(goal.balance - transfer) }
      }
      if (goal.key === toGoalKey) {
        return { ...goal, balance: roundMoney(goal.balance + transfer) }
      }
      return goal
    }),
  })
}

export function autoAllocateSavings(state: SavingsState): SavingsState | null {
  const pool = roundMoney(state.unallocated)
  if (pool <= 0) return null

  let allocatedSoFar = 0
  const finalGoalKey = AUTO_ALLOCATION_GOAL_KEYS[AUTO_ALLOCATION_GOAL_KEYS.length - 1]

  return normalizeSavingsState({
    ...state,
    unallocated: 0,
    goals: state.goals.map(goal => {
      if (!AUTO_ALLOCATION_GOAL_KEYS.includes(goal.key)) return goal

      const allocation = goal.key === finalGoalKey
        ? roundMoney(pool - allocatedSoFar)
        : roundMoney(pool * (AUTO_ALLOCATION_WEIGHTS[goal.key] ?? 0))

      allocatedSoFar = roundMoney(allocatedSoFar + allocation)
      return { ...goal, balance: roundMoney(goal.balance + allocation) }
    }),
  })
}
