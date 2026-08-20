'use client'

import { FormEvent, useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const supabase = createClient()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'info' | 'error' | 'success'>('info')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get('error')
    if (error === 'confirmation_failed') { setMessageTone('error'); setMessage('That confirmation link is invalid or expired. Request a fresh one from Supabase.') }
    if (error === 'missing_code') { setMessageTone('error'); setMessage('The confirmation link was incomplete. Request a fresh one and try again.') }
  }, [])

  function describeAuthError(error: { message?: string; status?: number }) {
    const raw = error.message?.toLowerCase() ?? ''
    if (raw.includes('email not confirmed')) return 'Your email is not confirmed yet. Open the confirmation email, then return here and sign in.'
    if (raw.includes('email rate limit') || raw.includes('over_email_send_rate_limit')) return 'Supabase has temporarily paused confirmation emails for this address. Do not keep pressing Create account. Wait about an hour, then use Sign in if you already received a confirmation email.'
    if (raw.includes('rate limit') || error.status === 429) return 'Supabase has temporarily limited email requests. Wait a moment before trying again, then use Sign in if this account already exists.'
    if (raw.includes('password') && raw.includes('6')) return 'Use a password with at least 6 characters.'
    if (raw.includes('invalid login')) return 'The email or password is incorrect. Check both and try again.'
    if (raw.includes('already registered') || raw.includes('already been registered')) return 'That email already has an ARTEN account. Switch to sign in.'
    return mode === 'signin' ? 'We could not sign you in. Check your details and try again.' : 'We could not create the account. Check your details and try again.'
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) { setMessageTone('error'); return setMessage('Authentication is not configured in this preview.') }
    setBusy(true)
    setMessageTone('info')
    setMessage(mode === 'signin' ? 'Checking your secure session…' : 'Creating your private ARTEN space…')
    try {
      const result = mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback` } })
      if (result.error) {
        const authMessage = describeAuthError(result.error)
        if (authMessage.toLowerCase().includes('temporarily') || authMessage.toLowerCase().includes('paused')) setRateLimited(true)
        setMessageTone('error'); setMessage(authMessage); return
      }
      if (mode === 'signup') { setMessageTone('success'); setMessage('Account created. Check your inbox for the confirmation link. This page will stay open until you confirm.'); return }
      setMessageTone('success'); setMessage('Signed in. Opening your private workspace…'); window.setTimeout(() => window.location.assign('/'), 650)
    } catch {
      setMessageTone('error')
      setMessage('The connection took too long. Check your network and try again.')
    } finally { setBusy(false) }
  }

  async function resendConfirmation() {
    if (!supabase || !email.trim()) { setMessageTone('error'); setMessage('Enter your email first, then request a new confirmation link.'); return }
    setBusy(true); setMessageTone('info'); setMessage('Sending a fresh confirmation link…')
    const result = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback` } })
    setBusy(false)
    setMessageTone(result.error ? 'error' : 'success')
    setMessage(result.error ? 'We could not resend the email yet. Wait a moment and try again.' : 'A fresh confirmation link is on its way.')
  }

  return (
    <main className="auth-shell">
      <div className="auth-glow auth-glow-blue" />
      <div className="auth-glow auth-glow-pink" />
      <section className="auth-card spatial-panel">
        <div className="auth-brand"><Image src="/arten-face.png" alt="ARTEN" width={52} height={52} className="auth-avatar" /><div><p className="eyebrow">ARTEN / PRIVATE SPACE</p><p className="auth-caption">A workspace for useful intelligence.</p></div></div>
        <div className="auth-heading"><p className="eyebrow">SECURE ENTRY</p><h1>{mode === 'signin' ? 'Welcome back.' : 'Create your space.'}</h1><p>{mode === 'signin' ? 'Sign in to continue your private ARTEN workspace.' : 'Start a private workspace for thinking, planning, and creating.'}</p></div>
        <form onSubmit={submit} className="auth-form" aria-busy={busy}>
          <label>Email<input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <label>Password<div className="password-wrap"><input autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} type={showPassword ? 'text' : 'password'} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
          <button className="primary-action" disabled={busy}>{busy ? <><span className="auth-spinner" aria-hidden="true" />{mode === 'signin' ? 'Checking secure entry…' : 'Creating private space…'}</> : mode === 'signin' ? 'Enter ARTEN' : 'Create account'}</button>
        </form>
        {message && <div className={`auth-message auth-message-${messageTone}`} role={messageTone === 'error' ? 'alert' : 'status'}><span className="auth-status-dot" aria-hidden="true" />{message}</div>}
        {message.toLowerCase().includes('not confirmed') && <button type="button" className="auth-resend" disabled={busy} onClick={() => void resendConfirmation()}>Resend confirmation email</button>}
        {rateLimited && mode === 'signup' && <button type="button" className="auth-resend" onClick={() => { setMode('signin'); setRateLimited(false); setMessage(''); setMessageTone('info') }}>I already have an account — sign in</button>}
        <button type="button" className="auth-switch" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setRateLimited(false); setMessage(''); setMessageTone('info') }}>{mode === 'signin' ? 'Need an account? Create one' : 'Already have an account? Sign in'}</button>
      </section>
    </main>
  )
}
