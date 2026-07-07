import { useState } from 'react'
import type { CategoryConfig, Transaction } from '../types/budget'
import { getJoyOwnerForTransaction, getJoyOwnerLabel, JOY_OWNER_OPTIONS } from '../lib/joyOwners'
import AddExpenseModal from './AddExpenseModal'
import './BudgetColumn.css'

interface Props {
  config: CategoryConfig
  budget: number
  transactions: Transaction[]
  presets: string[]
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void
  onAddCategoryFunds: (category: CategoryConfig['key'], amount: number) => void
  readOnly? : boolean
}

export default function BudgetColumn({
  config,
  budget,
  transactions,
  presets,
  onAddTransaction,
  onAddCategoryFunds,
  readOnly = false,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [addingFunds, setAddingFunds] = useState(false)
  const [fundsInput, setFundsInput] = useState('')
  const [fundsError, setFundsError] = useState('')

  const extraFunds = config.extraFunds ?? 0
  const spent = transactions.reduce((sum, t) => sum + t.amount, 0)
  const remaining = budget - spent
  const pct = budget > 0 ? Math.min(spent / budget, 1) : spent > 0 ? 1 : 0
  const overBudget = spent > budget
  const isJoyColumn = config.key === 'joy'
  const joySplitBudget = budget / JOY_OWNER_OPTIONS.length
  const joySplits = isJoyColumn
    ? JOY_OWNER_OPTIONS.map(owner => {
        const ownerSpent = transactions
          .filter(t => getJoyOwnerForTransaction(t) === owner.key)
          .reduce((sum, t) => sum + t.amount, 0)
        const ownerRemaining = joySplitBudget - ownerSpent
        const ownerPct = joySplitBudget > 0
          ? Math.min(ownerSpent / joySplitBudget, 1)
          : ownerSpent > 0 ? 1 : 0

        return {
          ...owner,
          color: owner.key === 'joshua' ? config.color : '#f472b6',
          spent: ownerSpent,
          remaining: ownerRemaining,
          pct: ownerPct,
          overBudget: ownerSpent > joySplitBudget,
        }
      })
    : []

  function commitCategoryFunds() {
    const amount = Number(fundsInput)
    if (!Number.isFinite(amount) || amount <= 0) {
      setFundsError('Enter a valid amount')
      return
    }

    onAddCategoryFunds(config.key, Math.round(amount * 100) / 100)
    setFundsInput('')
    setFundsError('')
    setAddingFunds(false)
  }

  // SVG ring math
  const R = 36
  const CIRC = 2 * Math.PI * R
  const dash = pct * CIRC

  return (
    <div className={`budget-column ${config.key}`} style={{ '--col-accent': config.color } as React.CSSProperties}>
      <div className="col-header">
        <svg className="progress-ring" viewBox="0 0 88 88" aria-hidden="true">
          <circle cx="44" cy="44" r={R} className="ring-track" />
          <circle
            cx="44" cy="44" r={R}
            className={`ring-fill ${overBudget ? 'over' : ''}`}
            strokeDasharray={`${dash} ${CIRC}`}
            strokeDashoffset={CIRC * 0.25}
          />
          <text x="44" y="40" className="ring-pct">{Math.round(pct * 100)}%</text>
          <text x="44" y="54" className="ring-label">used</text>
        </svg>
 
        <div className="col-meta">
          <h2 className="col-title">{config.label}</h2>
          <span className="col-alloc">{config.percentage}% of income</span>
          {extraFunds > 0 && (
            <span className="col-boost">+${formatMoney(extraFunds)} added</span>
          )}
        </div>
      </div>
 
      <div className="col-amounts">
        <div className="amount-block">
          <span className="amount-value">${formatMoney(budget)}</span>
          <span className="amount-label">budget</span>
        </div>
        <div className="amount-block">
          <span className="amount-value spent">${spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="amount-label">spent</span>
        </div>
        <div className="amount-block">
          <span className={`amount-value ${overBudget ? 'over' : 'remaining'}`}>
            {overBudget ? '-' : ''}${Math.abs(remaining).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="amount-label">{overBudget ? 'over' : 'left'}</span>
        </div>
      </div>
 
      {isJoyColumn ? (
        <div className="joy-split-bars">
          {joySplits.map(split => (
            <div
              key={split.key}
              className="joy-split-row"
              style={{ '--joy-owner-color': split.color } as React.CSSProperties}
            >
              <div className="joy-split-meta">
                <span className="joy-split-name">{split.label}</span>
                <span className={`joy-split-left ${split.overBudget ? 'over' : ''}`}>
                  {split.overBudget
                    ? `$${formatMoney(Math.abs(split.remaining))} over`
                    : `$${formatMoney(split.remaining)} left`}
                </span>
              </div>
              <div className="joy-split-track">
                <div
                  className={`joy-split-fill ${split.overBudget ? 'over' : ''}`}
                  style={{ width: `${split.pct * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="progress-bar-track">
          <div
            className={`progress-bar-fill ${overBudget ? 'over' : ''}`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      )}
 
      <div className="recent-transactions">
        {transactions.length === 0 ? (
          <p className="empty-state">No expenses yet</p>
        ) : (
          transactions
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 4)
            .map(t => {
              const joyOwner = getJoyOwnerForTransaction(t)
              return (
                <div key={t.id} className="txn-row">
                  <div className="txn-left">
                    <span className="txn-desc">{t.description}</span>
                    <span className="txn-date">
                      {formatDate(t.date)}
                      {joyOwner && ` - ${getJoyOwnerLabel(joyOwner)}`}
                    </span>
                  </div>
                  <span className="txn-amount">${t.amount.toFixed(2)}</span>
                </div>
              )
            })
        )}
        {transactions.length > 4 && (
          <p className="more-hint">+{transactions.length - 4} more in log</p>
        )}
      </div>
 
      {!readOnly && addingFunds && (
        <div className="add-funds-form">
          <div className="add-funds-input-wrap">
            <span className="add-funds-dollar">$</span>
            <input
              className="add-funds-input"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={fundsInput}
              onChange={event => {
                setFundsInput(event.target.value)
                setFundsError('')
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  commitCategoryFunds()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setAddingFunds(false)
                  setFundsError('')
                  setFundsInput('')
                }
              }}
              aria-label={`Add money to ${config.label}`}
              autoFocus
            />
          </div>
          <button className="add-funds-save" onClick={commitCategoryFunds}>
            Add
          </button>
          <button
            className="add-funds-cancel"
            onClick={() => {
              setAddingFunds(false)
              setFundsError('')
              setFundsInput('')
            }}
          >
            Cancel
          </button>
          {fundsError && <span className="add-funds-error">{fundsError}</span>}
        </div>
      )}

      {!readOnly && (
        <div className="column-actions">
          <button className="add-btn" onClick={() => setModalOpen(true)}>
            + Add Expense
          </button>
          <button className="boost-btn" onClick={() => setAddingFunds(open => !open)}>
            + Add Money
          </button>
        </div>
      )}
 
      {!readOnly && modalOpen && (
        <AddExpenseModal
          category={config.key}
          categoryLabel={config.label}
          accentColor={config.color}
          presets={presets || []}
          onAdd={(t) => { onAddTransaction(t); setModalOpen(false) }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
 
function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}

function formatMoney(amount: number) {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
