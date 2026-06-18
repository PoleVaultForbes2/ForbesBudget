import './StatusScreen.css'

export function LoadingScreen() {
  return (
    <div className="status-screen">
      <div className="status-spinner" />
      <p className="status-text">Loading your budget...</p>
    </div>
  )
}

export function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="status-screen">
      <div className="status-icon">⚠️</div>
      <p className="status-title">Couldn't load your budget</p>
      <p className="status-text">{message}</p>
      <button className="status-retry-btn" onClick={onRetry}>
        Try Again
      </button>
    </div>
  )
}