import { useState } from 'react'
import type { CategoryConfig, Transaction } from '../types/budget'
import AddExpenseModal from './AddExpenseModal'
import './BudgetColumn.css'

interface Props {
  config: CategoryConfig
  budget: number
  transactions: Transaction[]
  presets: string[]
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void
  readOnly? : boolean
}

export default function BudgetColumn({ config, budget, transactions, presets, onAddTransaction, readOnly = false }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const spent = transactions.reduce((sum, t) => sum + t.amount, 0)
  const remaining = budget - spent
  const pct = budget > 0 ? Math.min(spent / budget, 1) : spent > 0 ? 1 : 0
  const overBudget = spent > budget

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
        </div>
      </div>
 
      <div className="col-amounts">
        <div className="amount-block">
          <span className="amount-value">${budget.toLocaleString()}</span>
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
 
      <div className="progress-bar-track">
        <div
          className={`progress-bar-fill ${overBudget ? 'over' : ''}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
 
      <div className="recent-transactions">
        {transactions.length === 0 ? (
          <p className="empty-state">No expenses yet</p>
        ) : (
          transactions
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 4)
            .map(t => (
              <div key={t.id} className="txn-row">
                <div className="txn-left">
                  <span className="txn-desc">{t.description}</span>
                  <span className="txn-date">{formatDate(t.date)}</span>
                </div>
                <span className="txn-amount">${t.amount.toFixed(2)}</span>
              </div>
            ))
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
