'use client'

import { FormEvent, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const supabase = createClient()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return setMessage('Authentication is not configured in this preview.')
    setBusy(true)
    setMessage('')
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback` } })
    setBusy(false)
    if (result.error) return setMessage(mode === 'signin' ? 'Invalid email or password.' : result.error.message)
    if (mode === 'signup') return setMessage('Check your email to confirm your ARTEN account.')
    window.location.assign('/')
  }

  return (
    <main className="auth-shell">
      <div className="auth-glow auth-glow-blue" />
      <div className="auth-glow auth-glow-pink" />
      <section className="auth-card spatial-panel">
        <div className="auth-brand"><Image src="/arten-face.png" alt="ARTEN" width={52} height={52} className="auth-avatar" /><div><p className="eyebrow">ARTEN / PRIVATE SPACE</p><p className="auth-caption">A workspace for useful intelligence.</p></div></div>
        <div className="auth-heading"><p className="eyebrow">SECURE ENTRY</p><h1>{mode === 'signin' ? 'Welcome back.' : 'Create your space.'}</h1><p>{mode === 'signin' ? 'Sign in to continue your private ARTEN workspace.' : 'Start a private workspace for thinking, planning, and creating.'}</p></div>
        <form onSubmit={submit} className="auth-form">
          <label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <label>Password<input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label>
          <button className="primary-action" disabled={busy}>{busy ? 'Connecting…' : mode === 'signin' ? 'Enter ARTEN' : 'Create account'}</button>
        </form>
        {message && <p className="auth-message" role="status">{message}</p>}
        <button className="auth-switch" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage('') }}>{mode === 'signin' ? 'Need an account? Create one' : 'Already have an account? Sign in'}</button>
      </section>
    </main>
  )
}
