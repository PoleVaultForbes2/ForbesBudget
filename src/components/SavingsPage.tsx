import { useState } from 'react'
import type { SavingsGoalKey, SavingsState } from '../types/budget'
import type { JoyOwnerLabels } from '../lib/joyOwners'
import {
  AUTO_ALLOCATION_WEIGHTS,
  getAllocatedSavingsTotal,
  roundMoney,
  SAVINGS_GOAL_COLORS,
} from '../lib/savings'
import './SavingsPage.css'

interface Props {
  savings: SavingsState
  onUpdateTotalSavings: (totalSavings: number) => void | Promise<void>
  onAddSavings: (amount: number) => void | Promise<void>
  onManualAllocate: (goalKey: SavingsGoalKey, amount: number) => void | Promise<void>
  onAutoAllocate: () => void | Promise<void>
  onWithdraw: (
    goalKey: SavingsGoalKey,
    amount: number,
    description: string
  ) => void | Promise<void>
  onTransfer: (
    fromGoalKey: SavingsGoalKey,
    toGoalKey: SavingsGoalKey,
    amount: number
  ) => void | Promise<void>
  joyOwnerLabels: JoyOwnerLabels
}

export default function SavingsPage({
  savings,
  onUpdateTotalSavings,
  onAddSavings,
  onManualAllocate,
  onAutoAllocate,
  onWithdraw,
  onTransfer,
  joyOwnerLabels,
}: Props) {
  const [editingTotal, setEditingTotal] = useState(false)
  const [totalInput, setTotalInput] = useState('')
  const [totalError, setTotalError] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [depositError, setDepositError] = useState('')
  const [allocationAmount, setAllocationAmount] = useState('')
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoalKey>('emergency')
  const [allocationError, setAllocationError] = useState('')
  const [manualOverrideEnabled, setManualOverrideEnabled] = useState(false)
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [withdrawalDescription, setWithdrawalDescription] = useState('')
  const [withdrawalGoal, setWithdrawalGoal] = useState<SavingsGoalKey>('general')
  const [withdrawalError, setWithdrawalError] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferFromGoal, setTransferFromGoal] = useState<SavingsGoalKey>('general')
  const [transferToGoal, setTransferToGoal] = useState<SavingsGoalKey>('debt')
  const [transferError, setTransferError] = useState('')

  const displayGoals = savings.goals.map(goal => ({
    ...goal,
    label: goal.key === 'josh_joy_bank'
      ? `${joyOwnerLabels.joshua} Joy Bank`
      : goal.key === 'wifey_joy_bank'
        ? `${joyOwnerLabels.sav} Joy Bank`
        : goal.label,
  }))
  const allocatedTotal = getAllocatedSavingsTotal(savings.goals)
  const hasUnallocated = savings.unallocated > 0
  const withdrawalSource = savings.goals.find(goal => goal.key === withdrawalGoal)
  const transferSource = savings.goals.find(goal => goal.key === transferFromGoal)

  function startEditingTotal() {
    setTotalInput(String(savings.totalSavings))
    setTotalError('')
    setEditingTotal(true)
  }

  function cancelEditingTotal() {
    setEditingTotal(false)
    setTotalInput('')
    setTotalError('')
  }

  async function commitTotalSavings() {
    const nextTotal = roundMoney(Number(totalInput))
    if (!Number.isFinite(nextTotal) || nextTotal < 0) {
      setTotalError('Enter a valid total')
      return
    }
    if (nextTotal < allocatedTotal) {
      setTotalError(`Must be at least ${formatMoney(allocatedTotal)}`)
      return
    }

    cancelEditingTotal()
    await onUpdateTotalSavings(nextTotal)
  }

  async function handleAddSavings() {
    const amount = roundMoney(Number(depositAmount))
    if (!Number.isFinite(amount) || amount <= 0) {
      setDepositError('Enter a valid amount')
      return
    }

    setDepositError('')
    setDepositAmount('')
    await onAddSavings(amount)
  }

  async function handleManualAllocate() {
    const amount = roundMoney(Number(allocationAmount))
    if (!Number.isFinite(amount) || amount <= 0) {
      setAllocationError('Enter a valid amount')
      return
    }
    if (amount > savings.unallocated) {
      setAllocationError('Amount exceeds unallocated savings')
      return
    }

    setAllocationError('')
    setAllocationAmount('')
    await onManualAllocate(selectedGoal, amount)
  }

  async function handleAutoAllocate() {
    if (!hasUnallocated) return
    setAllocationError('')
    await onAutoAllocate()
  }

  async function handleWithdraw() {
    const amount = roundMoney(Number(withdrawalAmount))
    if (!Number.isFinite(amount) || amount <= 0) {
      setWithdrawalError('Enter a valid amount')
      return
    }
    if (!withdrawalSource || amount > withdrawalSource.balance) {
      setWithdrawalError('Amount exceeds selected bucket')
      return
    }
    const description = withdrawalDescription.trim()
    if (!description) {
      setWithdrawalError('Add a description')
      return
    }

    setWithdrawalError('')
    setWithdrawalAmount('')
    setWithdrawalDescription('')
    await onWithdraw(withdrawalGoal, amount, description)
  }

  async function handleTransfer() {
    const amount = roundMoney(Number(transferAmount))
    if (!Number.isFinite(amount) || amount <= 0) {
      setTransferError('Enter a valid amount')
      return
    }
    if (transferFromGoal === transferToGoal) {
      setTransferError('Choose two different buckets')
      return
    }
    if (!transferSource || amount > transferSource.balance) {
      setTransferError('Amount exceeds source bucket')
      return
    }

    setTransferError('')
    setTransferAmount('')
    await onTransfer(transferFromGoal, transferToGoal, amount)
  }

  return (
    <main className="savings-page">
      <section className="savings-overview">
        <span className="savings-kicker">Shared Savings</span>

        {editingTotal ? (
          <div className="savings-total-edit">
            <span className="savings-dollar">$</span>
            <input
              className="savings-total-input"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={totalInput}
              onChange={event => {
                setTotalInput(event.target.value)
                setTotalError('')
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void commitTotalSavings()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  cancelEditingTotal()
                }
              }}
              aria-label="Total savings balance"
              autoFocus
            />
            <button className="savings-inline-btn primary" onClick={() => void commitTotalSavings()}>
              Save
            </button>
            <button className="savings-inline-btn" onClick={cancelEditingTotal}>
              Cancel
            </button>
            {totalError && <span className="savings-input-error">{totalError}</span>}
          </div>
        ) : (
          <button className="savings-total-display" onClick={startEditingTotal}>
            {formatMoney(savings.totalSavings)}
          </button>
        )}

        <div className="savings-overview-stats">
          <div className="savings-stat">
            <span className="savings-stat-value">{formatMoney(allocatedTotal)}</span>
            <span className="savings-stat-label">allocated</span>
          </div>
          <div className="savings-stat-divider" />
          <div className="savings-stat">
            <span className="savings-stat-value unallocated">{formatMoney(savings.unallocated)}</span>
            <span className="savings-stat-label">unallocated</span>
          </div>
        </div>

        <div className="savings-deposit-row">
          <span className="savings-deposit-label">Add Savings</span>
          <div className="savings-deposit-form">
            <div className="savings-deposit-input-wrap">
              <span className="savings-deposit-dollar">$</span>
              <input
                className="savings-deposit-input"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={depositAmount}
                onChange={event => {
                  setDepositAmount(event.target.value)
                  setDepositError('')
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void handleAddSavings()
                  }
                }}
                aria-label="Savings deposit amount"
              />
            </div>
            <button className="savings-deposit-button" onClick={() => void handleAddSavings()}>
              Add
            </button>
          </div>
          {depositError && <span className="savings-input-error">{depositError}</span>}
        </div>
      </section>

      <section className="unallocated-panel">
        <div className="unallocated-summary">
          <span className="unallocated-label">Unallocated Pool</span>
          <span className="unallocated-value">{formatMoney(savings.unallocated)}</span>
        </div>

        <div className="allocation-controls">
          <div className="allocation-form">
            <div className="allocation-input-wrap">
              <span className="allocation-dollar">$</span>
              <input
                className="allocation-input"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={allocationAmount}
                onChange={event => {
                  setAllocationAmount(event.target.value)
                  setAllocationError('')
                }}
                disabled={!hasUnallocated}
                aria-label="Manual allocation amount"
              />
            </div>
            <button
              className="allocation-button"
              onClick={() => void handleManualAllocate()}
              disabled={!hasUnallocated}
            >
              Allocate
            </button>
          </div>

          <div className="goal-chip-row" role="group" aria-label="Savings goal target">
            {displayGoals.map(goal => (
              <button
                key={goal.key}
                className={`goal-chip ${selectedGoal === goal.key ? 'active' : ''}`}
                style={{ '--goal-color': SAVINGS_GOAL_COLORS[goal.key] } as React.CSSProperties}
                onClick={() => setSelectedGoal(goal.key)}
                disabled={!hasUnallocated}
              >
                {goal.label}
              </button>
            ))}
          </div>

          <button
            className="auto-allocate-btn"
            onClick={() => void handleAutoAllocate()}
            disabled={!hasUnallocated}
          >
            Auto Allocate
          </button>
        </div>

        {allocationError && <span className="allocation-error">{allocationError}</span>}
      </section>

      <section className={`manual-override-panel ${manualOverrideEnabled ? 'open' : ''}`}>
        <div className="manual-override-header">
          <div>
            <span className="manual-override-kicker">Manual Override</span>
            <h2 className="manual-override-title">Spend or move bucket funds</h2>
          </div>
          <button
            className={`override-toggle ${manualOverrideEnabled ? 'active' : ''}`}
            onClick={() => setManualOverrideEnabled(enabled => !enabled)}
            aria-pressed={manualOverrideEnabled}
          >
            {manualOverrideEnabled ? 'On' : 'Off'}
          </button>
        </div>

        {manualOverrideEnabled && (
          <div className="override-controls">
            <div className="override-block">
              <div className="override-block-header">
                <span className="override-label">Subtract</span>
                <span className="override-balance">
                  Available {formatMoney(withdrawalSource?.balance ?? 0)}
                </span>
              </div>
              <div className="override-form withdraw-form">
                <MoneyInput
                  value={withdrawalAmount}
                  onChange={value => {
                    setWithdrawalAmount(value)
                    setWithdrawalError('')
                  }}
                  label="Withdrawal amount"
                />
                <GoalSelect
                  goals={displayGoals}
                  value={withdrawalGoal}
                  onChange={setWithdrawalGoal}
                />
                <input
                  className="override-description-input"
                  type="text"
                  placeholder="Description"
                  value={withdrawalDescription}
                  onChange={event => {
                    setWithdrawalDescription(event.target.value)
                    setWithdrawalError('')
                  }}
                  aria-label="Withdrawal description"
                />
                <button className="override-action danger" onClick={() => void handleWithdraw()}>
                  Subtract
                </button>
              </div>
              {withdrawalError && <span className="override-error">{withdrawalError}</span>}
            </div>

            <div className="override-block">
              <div className="override-block-header">
                <span className="override-label">Move</span>
                <span className="override-balance">
                  Available {formatMoney(transferSource?.balance ?? 0)}
                </span>
              </div>
              <div className="override-form transfer-form">
                <MoneyInput
                  value={transferAmount}
                  onChange={value => {
                    setTransferAmount(value)
                    setTransferError('')
                  }}
                  label="Transfer amount"
                />
                <GoalSelect
                  goals={displayGoals}
                  value={transferFromGoal}
                  onChange={value => {
                    setTransferFromGoal(value)
                    setTransferError('')
                  }}
                  label="From"
                />
                <GoalSelect
                  goals={displayGoals}
                  value={transferToGoal}
                  onChange={value => {
                    setTransferToGoal(value)
                    setTransferError('')
                  }}
                  label="To"
                />
                <button className="override-action" onClick={() => void handleTransfer()}>
                  Move
                </button>
              </div>
              {transferError && <span className="override-error">{transferError}</span>}
            </div>
          </div>
        )}
      </section>

      <section className="savings-goals-grid">
        {displayGoals.map(goal => {
          const color = SAVINGS_GOAL_COLORS[goal.key]
          const autoWeight = AUTO_ALLOCATION_WEIGHTS[goal.key]
          const share = savings.totalSavings > 0
            ? Math.min(goal.balance / savings.totalSavings, 1)
            : 0

          return (
            <article
              key={goal.key}
              className="savings-goal-card"
              style={{ '--goal-color': color } as React.CSSProperties}
            >
              <div className="goal-card-top">
                <h2 className="goal-card-title">{goal.label}</h2>
                <span className="goal-card-weight">
                  {autoWeight === undefined ? 'Manual' : formatPercent(autoWeight)}
                </span>
              </div>
              <span className="goal-card-balance">{formatMoney(goal.balance)}</span>
              <div className="goal-progress-track">
                <div className="goal-progress-fill" style={{ width: `${share * 100}%` }} />
              </div>
            </article>
          )
        })}
      </section>

      <section className="savings-activity-panel">
        <div className="savings-activity-header">
          <span className="savings-activity-kicker">Savings Activity</span>
          <span className="savings-activity-count">{savings.transactions.length}</span>
        </div>

        {savings.transactions.length === 0 ? (
          <div className="savings-activity-empty">No savings activity yet.</div>
        ) : (
          <div className="savings-activity-list">
            {savings.transactions.map(transaction => {
              const goal = transaction.goalKey
                ? displayGoals.find(item => item.key === transaction.goalKey)
                : undefined
              const isWithdrawal = transaction.type === 'withdrawal'

              return (
                <article className="savings-activity-item" key={transaction.id}>
                  <span className={`savings-activity-amount ${transaction.type}`}>
                    {isWithdrawal ? '-' : '+'}{formatMoney(transaction.amount)}
                  </span>
                  <div className="savings-activity-body">
                    <span className="savings-activity-description">
                      {transaction.description}
                    </span>
                    <span className="savings-activity-meta">
                      {goal?.label ?? 'Unallocated'} - {formatActivityDate(transaction.createdAt)}
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}% auto`
}

function formatActivityDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

interface MoneyInputProps {
  value: string
  label: string
  onChange: (value: string) => void
}

function MoneyInput({ value, label, onChange }: MoneyInputProps) {
  return (
    <div className="override-money-wrap">
      <span className="override-dollar">$</span>
      <input
        className="override-money-input"
        type="number"
        min="0.01"
        step="0.01"
        inputMode="decimal"
        placeholder="0.00"
        value={value}
        onChange={event => onChange(event.target.value)}
        aria-label={label}
      />
    </div>
  )
}

interface GoalSelectProps {
  goals: SavingsState['goals']
  value: SavingsGoalKey
  label?: string
  onChange: (goalKey: SavingsGoalKey) => void
}

function GoalSelect({ goals, value, label, onChange }: GoalSelectProps) {
  return (
    <label className="override-select-wrap">
      {label && <span className="override-select-label">{label}</span>}
      <select
        className="override-select"
        value={value}
        onChange={event => onChange(event.target.value as SavingsGoalKey)}
      >
        {goals.map(goal => (
          <option key={goal.key} value={goal.key}>
            {goal.label}
          </option>
        ))}
      </select>
    </label>
  )
}
