import { useState } from 'react'
import type { CategoryConfig, Transaction } from '../types/budget'
import { getJoyOwnerForTransaction, getJoyOwnerLabel, getJoyOwnerOptions } from '../lib/joyOwners'
import type { JoyOwnerLabels } from '../lib/joyOwners'
import AddExpenseModal from './AddExpenseModal'
import './BudgetColumn.css'

interface Props {
  config: CategoryConfig
  budget: number
  transactions: Transaction[]
  presets: string[]
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void
  readOnly? : boolean
  joyOwnerLabels: JoyOwnerLabels
}

export default function BudgetColumn({
  config,
  budget,
  transactions,
  presets,
  onAddTransaction,
  readOnly = false,
  joyOwnerLabels,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const spent = transactions.reduce((sum, t) => sum + t.amount, 0)
  const remaining = budget - spent
  const pct = budget > 0 ? Math.min(spent / budget, 1) : spent > 0 ? 1 : 0
  const overBudget = spent > budget
  const isJoyColumn = config.key === 'joy'
  const joyOwnerOptions = getJoyOwnerOptions(joyOwnerLabels)
  const joySplitBudget = budget / joyOwnerOptions.length
  const joySplits = isJoyColumn
    ? joyOwnerOptions.map(owner => {
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
          <span className="col-alloc">{config.percentage}% auto target</span>
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
                      {joyOwner && ` - ${getJoyOwnerLabel(joyOwner, joyOwnerLabels)}`}
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
 
      {!readOnly && (
        <button className="add-btn" onClick={() => setModalOpen(true)}>
          + Add Expense
        </button>
      )}
 
      {!readOnly && modalOpen && (
        <AddExpenseModal
          category={config.key}
          categoryLabel={config.label}
          accentColor={config.color}
          presets={presets || []}
          joyOwnerLabels={joyOwnerLabels}
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
