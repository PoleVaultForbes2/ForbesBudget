import { useState } from 'react'
import type { Category, Transaction, CategoryConfig } from '../types/budget'
import './TransactionLog.css'

interface Props {
  transactions: Transaction[]
  categories: CategoryConfig[]
  onDelete: (id: string) => void
  readOnly?: boolean
}

export default function TransactionLog({ transactions, categories, onDelete, readOnly = false }: Props) {
  const [activeTab, setActiveTab] = useState<Category | 'all'>('all')

  const filtered = transactions
    .filter(t => activeTab === 'all' || t.category === activeTab)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))

  const getConfig = (cat: Category) => categories.find(c => c.key === cat)!

  return (
    <div className="log-section">
      <h2 className="log-heading">Transaction Log</h2>

      <div className="log-tabs">
        <button
          className={`log-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All <span className="tab-count">{transactions.length}</span>
        </button>
        {categories.map(cat => {
          const count = transactions.filter(t => t.category === cat.key).length
          return (
            <button
              key={cat.key}
              className={`log-tab ${activeTab === cat.key ? 'active' : ''}`}
              style={{ '--tab-accent': cat.color } as React.CSSProperties}
              onClick={() => setActiveTab(cat.key)}
            >
              {cat.label} <span className="tab-count">{count}</span>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="log-empty">No transactions yet — add your first expense above</div>
      ) : (
        <div className="log-table">
          <div className="log-table-header">
            <span>Description</span>
            <span>Category</span>
            <span>Date</span>
            <span>Amount</span>
            <span></span>
          </div>
          {filtered.map(t => {
            const cfg = getConfig(t.category)
            return (
              <div key={t.id} className="log-row">
                <div className="log-desc-cell">
                  <span className="log-desc">{t.description}</span>
                  {t.note && <span className="log-note">{t.note}</span>}
                </div>
                <span
                  className="log-cat-badge"
                  style={{ '--badge-color': cfg.color } as React.CSSProperties}
                >
                  {cfg.label}
                </span>
                <span className="log-date">{formatDate(t.date)}</span>
                <span
                  className="log-amount"
                  style={{ color: cfg.color }}
                >
                  ${t.amount.toFixed(2)}
                </span>
                <button
                  className="log-delete"
                  onClick={() => onDelete(t.id)}
                  aria-label={`Delete ${t.description}`}
                  style={{ visibility: readOnly ? 'hidden' : 'visible' }}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}