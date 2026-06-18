import './SaveErrorToast.css'

interface Props {
  message: string
  onDismiss: () => void
}

export default function SaveErrorToast({ message, onDismiss }: Props) {
  return (
    <div className="save-toast">
      <span className="save-toast-icon">⚠️</span>
      <span className="save-toast-msg">{message}</span>
      <button className="save-toast-dismiss" onClick={onDismiss} aria-label="Dismiss">✕</button>
    </div>
  )
}