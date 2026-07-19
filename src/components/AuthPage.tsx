import { useState } from 'react'
import * as authApi from '../api/authApi'
import './AuthPage.css'

type AuthMode = 'login' | 'signup'

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setMessage('')
    setIsError(false)

    if (mode === 'signup' && username.trim().length < 2) {
      setMessage('Username must be at least 2 characters.')
      setIsError(true)
      return
    }
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.')
      setIsError(true)
      return
    }

    setBusy(true)
    try {
      if (mode === 'login') {
        await authApi.signIn(email, password)
      } else {
        const signedIn = await authApi.signUp(email, password, username)
        if (!signedIn) {
          setMessage('Check your email to confirm your account, then sign in.')
          setMode('login')
          setPassword('')
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed. Please try again.')
      setIsError(true)
    } finally {
      setBusy(false)
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setMessage('')
    setIsError(false)
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-mark">F</div>
        <p className="auth-kicker">Forbes Budget</p>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Sign in to see your private budget and savings.'
            : 'Your financial data will be private to this account.'}
        </p>

        <div className="auth-tabs" role="tablist" aria-label="Authentication options">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')} type="button">
            Log in
          </button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')} type="button">
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label>
              <span>Username</span>
              <input
                value={username}
                onChange={event => setUsername(event.target.value)}
                autoComplete="username"
                maxLength={40}
                required
              />
            </label>
          )}
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              required
            />
          </label>
          {message && <p className={`auth-message ${isError ? 'error' : 'success'}`}>{message}</p>}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  )
}
