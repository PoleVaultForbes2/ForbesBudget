import type { CategoryConfig, Category } from '../types/budget'
import './CategorySettings.css'

interface CategorySettingsProps {
  categories: CategoryConfig[]
  onUpdateCategory: (key: Category, percentage: number) => void
  onClose: () => void
}

export default function CategorySettings({
  categories,
  onUpdateCategory,
  onClose,
}: CategorySettingsProps) {
  const totalPercentage = categories.reduce((sum, cat) => sum + cat.percentage, 0)

  return (
    <div className="category-settings-overlay" onClick={onClose}>
      <div className="category-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Budget Category Percentages</h2>
          <button className="close-btn" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="settings-content">
          <div className="percentage-info">
            Total: <span className={totalPercentage === 100 ? 'valid' : 'invalid'}>{totalPercentage}%</span>
          </div>

          <div className="category-inputs">
            {categories.map(cat => (
              <div key={cat.key} className="category-input-group">
                <div className="input-label">
                  <span className="color-dot" style={{ background: cat.color }} />
                  <span className="label-text">{cat.label}</span>
                </div>
                <div className="input-wrapper">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={cat.percentage}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0
                      onUpdateCategory(cat.key, Math.max(0, Math.min(100, val)))
                    }}
                    className="percentage-input"
                  />
                  <span className="input-suffix">%</span>
                </div>
              </div>
            ))}
          </div>

          {totalPercentage !== 100 && (
            <div className="warning-message">
              ⚠️ Percentages should add up to 100% (currently {totalPercentage}%)
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button className="close-settings-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
