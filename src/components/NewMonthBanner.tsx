import './NewMonthBanner.css'

interface Props {
  newMonthLabel: string   // e.g. "July 2025"
  onStartNewMonth: () => void
}

export default function NewMonthBanner({ newMonthLabel, onStartNewMonth }: Props) {
  return (
    <div className="nmb-banner">
      <div className="nmb-text">
        <span className="nmb-icon">📅</span>
        <div>
          <p className="nmb-title">It's a new month!</p>
          <p className="nmb-sub">Ready to start tracking <strong>{newMonthLabel}</strong>? Your previous month will be saved and locked.</p>
        </div>
      </div>
      <button className="nmb-btn" onClick={onStartNewMonth}>
        Start {newMonthLabel}
      </button>
    </div>
  )
}