'use client'

import { useEffect, useState } from 'react'
import { ArrowUp, Check, ChevronDown, Clock3, FileText, FolderOpen, Menu, Paperclip, Plus, Search, Settings2, Sparkles, Terminal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const starterPrompts = ['Turn notes into a brief', 'Summarize a document', 'Plan a project', 'Explore capabilities']
const activities = [
  { title: 'Reviewed workspace context', meta: 'Context', icon: Search },
  { title: 'Mapped the request', meta: 'Reasoning', icon: Terminal },
  { title: 'Ready to help', meta: 'Complete', icon: Check },
]

type ChatMessage = { role: 'user' | 'assistant'; content: string }
const supabase = createClient()

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'activity' | 'capabilities'>('activity')
  const [showMenu, setShowMenu] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [attached, setAttached] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [aiStatus, setAiStatus] = useState<{ provider: string; ready: boolean; model: string }>({ provider: 'ollama', ready: false, model: 'llama3.2:3b' })

  useEffect(() => {
    fetch('/api/ai-status').then((response) => response.json()).then((status) => setAiStatus(status)).catch(() => undefined)
    if (!supabase) return
    const guestMode = new URLSearchParams(window.location.search).get('guest') === '1'
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user && !guestMode) window.location.replace('/auth')
      else if (!data.user && guestMode) setUserEmail(null)
      else {
        setUserEmail(data.user.email ?? null)
        const { data: conversation } = await supabase.from('conversations').select('id').eq('user_id', data.user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle()
        if (conversation) {
          setConversationId(conversation.id)
          const { data: saved } = await supabase.from('messages').select('role, content, created_at').eq('conversation_id', conversation.id).order('created_at', { ascending: true }).limit(40)
          if (saved?.length) setMessages(saved.filter((item) => item.role !== 'system').map((item) => ({ role: item.role as 'user' | 'assistant', content: item.content })))
        }
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user && !guestMode) window.location.replace('/auth')
      else setUserEmail(session?.user?.email ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function authenticate(mode: 'signin' | 'signup') {
    if (!supabase) return setAuthMessage('Supabase is not configured in this environment yet.')
    const result = mode === 'signin' ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword }) : await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback` } })
    setAuthMessage(result.error ? (mode === 'signin' ? 'Invalid email or password.' : result.error.message) : mode === 'signup' ? 'Check your email to confirm your account.' : 'Signed in. Conversations will be saved.')
    if (result.data.user) setShowAuth(false)
  }

  async function submitPrompt() {
    const content = prompt.trim()
    if (!content || isLoading) return
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages([...nextMessages, { role: 'assistant', content: '' }])
    setPrompt('')
    setError('')
    setIsLoading(true)

    try {
      const { data: sessionData } = supabase ? await supabase.auth.getUser() : { data: { user: null } }
      const currentUser = sessionData.user
      let activeConversationId = conversationId
      if (currentUser && supabase && !activeConversationId) {
        const { data: created } = await supabase.from('conversations').insert({ user_id: currentUser.id, title: content.slice(0, 60) }).select('id').single()
        activeConversationId = created?.id ?? null
        setConversationId(activeConversationId)
      }
      if (currentUser && activeConversationId && supabase) await supabase.from('messages').insert({ conversation_id: activeConversationId, user_id: currentUser.id, role: 'user', content })
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 8000)
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: nextMessages }), signal: controller.signal })
      window.clearTimeout(timeout)
      if (!response.ok || !response.body) throw new Error((await response.json().catch(() => null))?.error || 'ARTEN could not respond.')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let answer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        answer += decoder.decode(value, { stream: true })
        setMessages([...nextMessages, { role: 'assistant', content: answer }])
      }
      if (currentUser && activeConversationId && answer && supabase) {
        await supabase.from('messages').insert({ conversation_id: activeConversationId, user_id: currentUser.id, role: 'assistant', content: answer })
        await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversationId)
      }
    } catch (caught) {
      const fallback = `I’m ready to help with “${content}”. Tell me the outcome you want, and I’ll help shape it into a practical next step.`
      setMessages([...nextMessages, { role: 'assistant', content: fallback }])
      setError(aiStatus.ready ? 'ARTEN used its local model.' : 'Local intelligence mode is active. Install Ollama and load a model for full generative responses.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground [perspective:1200px]">
      <header className="flex h-16 items-center justify-between border-b border-border/70 px-5 md:px-8">
        <div className="flex items-center gap-3">
          <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden" aria-label="Open menu" onClick={() => setShowMenu(!showMenu)}><Menu /></button>
          <div className="flex items-center gap-3"><div className="size-9 overflow-hidden rounded-xl bg-accent shadow-sm"><img src="/arten-face.png" alt="ARTEN character" className="size-full object-cover" /></div><div><div className="font-semibold tracking-tight">ARTEN</div><div className="text-[11px] text-muted-foreground">{aiStatus.ready ? `${aiStatus.provider} · ${aiStatus.model}` : 'Local fallback ready'}</div></div></div>
        </div>
        <div className="flex items-center gap-2"><button className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted md:flex"><Clock3 className="size-4" /> History</button><button className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Settings"><Settings2 className="size-4" /></button><button className="hidden rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted md:block" onClick={() => setShowAuth(!showAuth)}>{userEmail ? userEmail : 'Guest · Sign in'}</button><div className="size-8 rounded-full bg-foreground text-center text-xs leading-8 text-background">LM</div></div>
      </header>
      {showAuth && !userEmail && <div className="mx-auto flex max-w-[1440px] justify-end px-5 pt-3 md:px-8"><div className="flex w-full max-w-sm flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm"><input className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none" aria-label="Account email" placeholder="Email" type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} /><input className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none" aria-label="Account password" placeholder="Password" type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} /><div className="flex gap-2"><button className="rounded-lg bg-foreground px-3 py-2 text-xs text-background" onClick={() => void authenticate('signin')}>Sign in</button><button className="rounded-lg border border-border px-3 py-2 text-xs" onClick={() => void authenticate('signup')}>Create account</button></div>{authMessage && <p className="text-xs text-muted-foreground">{authMessage}</p>}</div></div>}

      <div className="mx-auto flex max-w-[1440px]">
        <aside className={`${showMenu ? 'flex' : 'hidden'} absolute inset-x-0 top-16 z-10 min-h-[calc(100vh-4rem)] flex-col border-r border-border bg-background p-5 md:relative md:top-0 md:flex md:w-64 md:min-h-[calc(100vh-4rem)] md:bg-transparent md:[transform:translateZ(26px)]`}>
          <button className="mb-7 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setMessages([]); setConversationId(null) }}><Plus className="size-4" /> New conversation</button>
          <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Workspace</div>
          <nav className="flex flex-col gap-1 text-sm">{['Conversations', 'Artifacts', 'Memory'].map((item, i) => <button key={item} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left ${i === 0 ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted'}`}><span className="size-1.5 rounded-full bg-current opacity-50" />{item}</button>)}</nav>
          <div className="mt-auto rounded-xl border border-border bg-muted/50 p-4"><div className="mb-2 flex items-center gap-2 text-sm font-medium"><Sparkles className="size-4" />ARTEN is ready</div><p className="text-xs leading-5 text-muted-foreground">A calm place to think, create, and move work forward.</p></div>
        </aside>

        <section className="spatial-panel flex min-h-[calc(100vh-4rem)] min-w-0 flex-1 flex-col rounded-t-[2rem] border-b-0 border-l-0 border-r-0 md:my-5 md:rounded-[2rem] md:border-b md:border-l md:border-r" style={{ transform: 'translateZ(12px)' }}>
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3 md:px-10"><div className="text-sm text-muted-foreground">{messages.length ? 'Active conversation' : 'New conversation'}</div><button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">General <ChevronDown className="size-3" /></button></div>
          <div className="flex flex-1 flex-col px-5 py-10 md:px-16 lg:px-24"><div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center">
            {messages.length ? <div className="mb-10 flex flex-col gap-8">{messages.map((item, index) => <div key={`${item.role}-${index}`} className={item.role === 'user' ? 'ml-auto max-w-xl rounded-2xl bg-foreground px-5 py-4 text-sm leading-6 text-background' : 'flex gap-4'}>{item.role === 'assistant' && <div className="size-8 shrink-0 overflow-hidden rounded-xl"><img src="/arten-face.png" alt="ARTEN" className="size-full object-cover" /></div>}<div>{item.role === 'assistant' && <p className="text-sm font-medium">ARTEN</p>}<p className={item.role === 'assistant' ? 'mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground' : ''}>{item.content || (isLoading ? 'Thinking…' : '')}</p></div></div>)}{error && <p className="text-sm text-destructive">{error}</p>}</div> : <div className="text-center"><div className="mx-auto mb-7 size-24 overflow-hidden rounded-[28px] shadow-[0_16px_40px_rgba(95,173,225,0.25)]"><img src="/arten-face.png" alt="ARTEN character" className="size-full object-cover" /></div><p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Your intelligence workspace</p><h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] md:text-6xl">What are we building<br className="hidden md:block" /> today?</h1><p className="mx-auto mt-5 max-w-md text-pretty text-sm leading-6 text-muted-foreground">Bring a question, a rough idea, or a complex task. ARTEN helps you shape it into something clear.</p><div className="mt-8 flex flex-wrap justify-center gap-2">{starterPrompts.map((item) => <button key={item} onClick={() => setPrompt(item)} className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground transition hover:border-foreground hover:text-foreground">{item}</button>)}</div></div>}
            <div className="spatial-panel mt-12 rounded-[1.5rem] p-2"><div className="flex items-end gap-2"><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); submitPrompt() } }} placeholder="Ask ARTEN anything..." className="min-h-14 flex-1 resize-none bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground" aria-label="Ask ARTEN anything" disabled={isLoading} /><button onClick={() => setAttached(!attached)} className={`rounded-xl p-3 ${attached ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'}`} aria-label="Attach file"><Paperclip className="size-4" /></button><button onClick={submitPrompt} className="rounded-xl bg-foreground p-3 text-background transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Send message" disabled={isLoading || !prompt.trim()}><ArrowUp className="size-4" /></button></div><div className="flex items-center justify-between px-3 pb-1 pt-2 text-[11px] text-muted-foreground"><span>{isLoading ? 'ARTEN is thinking…' : attached ? '1 file attached' : 'Shift + Enter for a new line'}</span><span>ARTEN 1.0</span></div></div>
          </div></div>
        </section>

        <aside className="spatial-panel hidden w-72 rounded-[1.75rem] border-l-0 p-5 lg:block lg:[transform:translateZ(34px)]"><div className="flex gap-1 rounded-lg bg-muted p-1"><button onClick={() => setActiveTab('activity')} className={`flex-1 rounded-md px-2 py-2 text-xs ${activeTab === 'activity' ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}>Activity</button><button onClick={() => setActiveTab('capabilities')} className={`flex-1 rounded-md px-2 py-2 text-xs ${activeTab === 'capabilities' ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}>Capabilities</button></div>{activeTab === 'activity' ? <div className="mt-7"><div className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Task activity</div><div className="flex flex-col gap-4">{activities.map(({ title, meta, icon: Icon }) => <div key={title} className="flex gap-3"><div className="mt-0.5 rounded-md border border-border p-1.5 text-muted-foreground"><Icon className="size-3.5" /></div><div><p className="text-xs font-medium">{title}</p><p className="mt-1 text-[11px] text-muted-foreground">{meta} · done</p></div></div>)}</div></div> : <div className="mt-7"><div className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">What ARTEN can do</div><div className="flex flex-col gap-2">{['Research and synthesize', 'Write and edit', 'Plan and organize', 'Work with files'].map((item) => <div key={item} className="flex items-center gap-3 rounded-lg border border-border p-3 text-xs"><Sparkles className="size-3.5 text-muted-foreground" />{item}</div>)}</div></div>}<div className="mt-12 border-t border-border pt-5"><div className="mb-3 flex items-center gap-2 text-xs font-medium"><FileText className="size-3.5" />Recent artifacts</div><div className="flex items-center gap-3 rounded-lg p-2 text-xs text-muted-foreground hover:bg-muted"><FolderOpen className="size-4" />No artifacts yet</div></div></aside>
      </div>
    </main>
  )
}
