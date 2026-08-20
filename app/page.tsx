'use client'

import { useState } from 'react'
import { ArrowUp, Check, ChevronDown, Clock3, FileText, FolderOpen, Menu, Paperclip, Plus, Search, Settings2, Sparkles, Terminal } from 'lucide-react'

const starterPrompts = ['Turn notes into a brief', 'Summarize a document', 'Plan a project', 'Explore capabilities']
const activities = [
  { title: 'Reviewed workspace context', meta: 'Context', icon: Search },
  { title: 'Mapped the request', meta: 'Reasoning', icon: Terminal },
  { title: 'Ready to help', meta: 'Complete', icon: Check },
]

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'activity' | 'capabilities'>('activity')
  const [showMenu, setShowMenu] = useState(false)
  const [attached, setAttached] = useState(false)

  function submitPrompt() {
    if (!prompt.trim()) return
    setMessage(prompt.trim())
    setPrompt('')
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="flex h-16 items-center justify-between border-b border-border/70 px-5 md:px-8">
        <div className="flex items-center gap-3">
          <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden" aria-label="Open menu" onClick={() => setShowMenu(!showMenu)}><Menu /></button>
          <div className="flex items-center gap-3"><div className="size-9 overflow-hidden rounded-xl bg-accent shadow-sm"><img src="/arten-face.png" alt="ARTEN character" className="size-full object-cover" /></div><div><div className="font-semibold tracking-tight">ARTEN</div><div className="text-[11px] text-muted-foreground">Intelligence workspace</div></div></div>
        </div>
        <div className="flex items-center gap-2"><button className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted md:flex"><Clock3 className="size-4" /> History</button><button className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Settings"><Settings2 className="size-4" /></button><div className="size-8 rounded-full bg-foreground text-center text-xs leading-8 text-background">LM</div></div>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        <aside className={`${showMenu ? 'flex' : 'hidden'} absolute inset-x-0 top-16 z-10 min-h-[calc(100vh-4rem)] flex-col border-r border-border bg-background p-5 md:relative md:top-0 md:flex md:w-64 md:min-h-[calc(100vh-4rem)] md:bg-transparent`}>
          <button className="mb-7 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-muted"><Plus className="size-4" /> New conversation</button>
          <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Workspace</div>
          <nav className="flex flex-col gap-1 text-sm">{['Conversations', 'Artifacts', 'Memory'].map((item, i) => <button key={item} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left ${i === 0 ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted'}`}><span className="size-1.5 rounded-full bg-current opacity-50" />{item}</button>)}</nav>
          <div className="mt-auto rounded-xl border border-border bg-muted/50 p-4"><div className="mb-2 flex items-center gap-2 text-sm font-medium"><Sparkles className="size-4" />ARTEN is ready</div><p className="text-xs leading-5 text-muted-foreground">A calm place to think, create, and move work forward.</p></div>
        </aside>

        <section className="flex min-h-[calc(100vh-4rem)] min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3 md:px-10"><div className="text-sm text-muted-foreground">New conversation</div><button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">General <ChevronDown className="size-3" /></button></div>
          <div className="flex flex-1 flex-col px-5 py-10 md:px-16 lg:px-24"><div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center">
            {message ? <div className="mb-10"><div className="ml-auto max-w-xl rounded-2xl bg-foreground px-5 py-4 text-sm leading-6 text-background">{message}</div><div className="mt-8 flex gap-4"><div className="size-8 shrink-0 overflow-hidden rounded-xl"><img src="/arten-face.png" alt="ARTEN" className="size-full object-cover" /></div><div><p className="text-sm font-medium">ARTEN</p><p className="mt-2 text-sm leading-6 text-muted-foreground">I&apos;m ready to work through that with you. This workspace will keep the context, decisions, and useful artifacts together.</p></div></div></div> : <div className="text-center"><div className="mx-auto mb-7 size-24 overflow-hidden rounded-[28px] shadow-[0_16px_40px_rgba(95,173,225,0.25)]"><img src="/arten-face.png" alt="ARTEN character" className="size-full object-cover" /></div><p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Your intelligence workspace</p><h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] md:text-6xl">What are we building<br className="hidden md:block" /> today?</h1><p className="mx-auto mt-5 max-w-md text-pretty text-sm leading-6 text-muted-foreground">Bring a question, a rough idea, or a complex task. ARTEN helps you shape it into something clear.</p><div className="mt-8 flex flex-wrap justify-center gap-2">{starterPrompts.map((item) => <button key={item} onClick={() => setPrompt(item)} className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground transition hover:border-foreground hover:text-foreground">{item}</button>)}</div></div>}
            <div className="mt-12 rounded-2xl border border-border bg-card p-2 shadow-sm"><div className="flex items-end gap-2"><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); submitPrompt() } }} placeholder="Ask ARTEN anything..." className="min-h-14 flex-1 resize-none bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground" aria-label="Ask ARTEN anything" /><button onClick={() => setAttached(!attached)} className={`rounded-xl p-3 ${attached ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'}`} aria-label="Attach file"><Paperclip className="size-4" /></button><button onClick={submitPrompt} className="rounded-xl bg-foreground p-3 text-background transition hover:opacity-80" aria-label="Send message"><ArrowUp className="size-4" /></button></div><div className="flex items-center justify-between px-3 pb-1 pt-2 text-[11px] text-muted-foreground"><span>{attached ? '1 file attached' : 'Shift + Enter for a new line'}</span><span>ARTEN 1.0</span></div></div>
          </div></div>
        </section>

        <aside className="hidden w-72 border-l border-border/70 p-5 lg:block"><div className="flex gap-1 rounded-lg bg-muted p-1"><button onClick={() => setActiveTab('activity')} className={`flex-1 rounded-md px-2 py-2 text-xs ${activeTab === 'activity' ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}>Activity</button><button onClick={() => setActiveTab('capabilities')} className={`flex-1 rounded-md px-2 py-2 text-xs ${activeTab === 'capabilities' ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}>Capabilities</button></div>{activeTab === 'activity' ? <div className="mt-7"><div className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Task activity</div><div className="flex flex-col gap-4">{activities.map(({ title, meta, icon: Icon }) => <div key={title} className="flex gap-3"><div className="mt-0.5 rounded-md border border-border p-1.5 text-muted-foreground"><Icon className="size-3.5" /></div><div><p className="text-xs font-medium">{title}</p><p className="mt-1 text-[11px] text-muted-foreground">{meta} · done</p></div></div>)}</div></div> : <div className="mt-7"><div className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">What ARTEN can do</div><div className="flex flex-col gap-2">{['Research and synthesize', 'Write and edit', 'Plan and organize', 'Work with files'].map((item) => <div key={item} className="flex items-center gap-3 rounded-lg border border-border p-3 text-xs"><Sparkles className="size-3.5 text-muted-foreground" />{item}</div>)}</div></div>}<div className="mt-12 border-t border-border pt-5"><div className="mb-3 flex items-center gap-2 text-xs font-medium"><FileText className="size-3.5" />Recent artifacts</div><div className="flex items-center gap-3 rounded-lg p-2 text-xs text-muted-foreground hover:bg-muted"><FolderOpen className="size-4" />No artifacts yet</div></div></aside>
      </div>
    </main>
  )
}
