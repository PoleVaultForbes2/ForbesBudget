import './SavingsPage.css'

export default function SavingsPage() {
  return (
    <div className="savings-page">
      <div className="savings-content">
        <div className="savings-icon">🏦</div>
        <h2 className="savings-title">Savings</h2>
        <p className="savings-subtitle">Coming soon</p>
        <p className="savings-desc">
          Track your total savings and split them across goals — emergency fund,
          travel, gifts, and whatever else matters to you.
        </p>
        <div className="savings-preview">
          <div className="preview-item">
            <span className="preview-dot" style={{ background: '#4ade80' }} />
            Emergency Fund
          </div>
          <div className="preview-item">
            <span className="preview-dot" style={{ background: '#60a5fa' }} />
            Travel Savings
          </div>
          <div className="preview-item">
            <span className="preview-dot" style={{ background: '#fbbf24' }} />
            Gift Savings
          </div>
        </div>
      </div>
    </div>
  )
}