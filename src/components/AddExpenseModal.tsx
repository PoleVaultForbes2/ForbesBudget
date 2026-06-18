import { useState } from 'react'
import type { Category, Transaction } from '../types/budget'
import './AddExpenseModal.css'

interface Props {
  category: Category
  categoryLabel: string
  accentColor: string
  presets: string[]
  onAdd: (t: Omit<Transaction, 'id'>) => void
  onClose: () => void
}

const today = () => new Date().toISOString().split('T')[0]

export default function AddExpenseModal({ category, categoryLabel, accentColor, presets, onAdd, onClose }: Props) {
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(today())
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!description.trim()) e.description = 'Description is required'
    if (!date) e.date = 'Date is required'
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) e.amount = 'Enter a valid amount'
    return e
  }

  function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onAdd({
      category,
      description: description.trim(),
      date,
      amount: parseFloat(parseFloat(amount).toFixed(2)),
      note: note.trim() || undefined,
    })
  }

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div className="modal" style={{ '--modal-accent': accentColor } as React.CSSProperties}>
        <div className="modal-header">
          <h3>Add to <span className="modal-cat">{categoryLabel}</span></h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          {/* Quick Preset Selection Section */}
          {presets && presets.length > 0 && (
            <div className="preset-section">
              <span className="field-label">Quick Select</span>
              <div className="preset-chips">
                {presets.map(preset => {
                  const isActive = description.toLowerCase() === preset.toLowerCase()
                  return (
                    <button
                      key={preset}
                      type="button"
                      className={`preset-chip ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setDescription(preset)
                        setErrors(p => ({ ...p, description: '' }))
                      }}
                    >
                      {preset}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <label className="field">
            <span className="field-label">Description *</span>
            <input
              className={`field-input ${errors.description ? 'error' : ''}`}
              type="text"
              placeholder="e.g. Grocery run, Rent, Gas"
              value={description}
              onChange={e => { setDescription(e.target.value); setErrors(p => ({ ...p, description: '' })) }}
              autoFocus
            />
            {errors.description && <span className="field-error">{errors.description}</span>}
          </label>

          <div className="field-row">
            <label className="field">
              <span className="field-label">Date *</span>
              <input
                className={`field-input ${errors.date ? 'error' : ''}`}
                type="date"
                value={date}
                onChange={e => { setDate(e.target.value); setErrors(p => ({ ...p, date: '' })) }}
              />
              {errors.date && <span className="field-error">{errors.date}</span>}
            </label>

            <label className="field">
              <span className="field-label">Amount *</span>
              <div className="amount-wrap">
                <span className="dollar-sign">$</span>
                <input
                  className={`field-input amount-input ${errors.amount ? 'error' : ''}`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setErrors(p => ({ ...p, amount: '' })) }}
                />
              </div>
              {errors.amount && <span className="field-error">{errors.amount}</span>}
            </label>
          </div>

          <label className="field">
            <span className="field-label">Note <span className="optional">(optional)</span></span>
            <textarea
              className="field-input field-textarea"
              placeholder="Any extra details..."
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
            />
          </label>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSubmit}>Save Expense</button>
        </div>
      </div>
    </div>
  )
}