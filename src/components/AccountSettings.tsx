import { useState } from 'react'
import type { UserProfile } from '../types/budget'
import './AccountSettings.css'

interface Props {
  profile: UserProfile
  onSave: (username: string, partnerName: string) => Promise<void>
  onClose: () => void
  onSignOut: () => Promise<void>
}

export default function AccountSettings({ profile, onSave, onClose, onSignOut }: Props) {
  const [username, setUsername] = useState(profile.username)
  const [partnerName, setPartnerName] = useState(profile.partnerName)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (username.trim().length < 2) {
      setError('Username must be at least 2 characters.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSave(username, partnerName)
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update your account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="account-backdrop" onClick={event => event.target === event.currentTarget && onClose()}>
      <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <div className="account-modal-header">
          <div>
            <span>Account</span>
            <h2 id="account-title">Joy Fund names</h2>
          </div>
          <button onClick={onClose} aria-label="Close account settings">×</button>
        </div>
        <p className="account-help">These names appear throughout your Joy budget and savings buckets.</p>
        <label>
          <span>Your username</span>
          <input value={username} onChange={event => setUsername(event.target.value)} maxLength={40} />
        </label>
        <label>
          <span>Partner display name</span>
          <input
            value={partnerName}
            onChange={event => setPartnerName(event.target.value)}
            placeholder="Partner"
            maxLength={40}
          />
        </label>
        {error && <p className="account-error">{error}</p>}
        <div className="account-actions">
          <button className="account-signout" onClick={() => void onSignOut()}>Sign out</button>
          <button className="account-save" onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving...' : 'Save names'}
          </button>
        </div>
      </section>
    </div>
  )
}
