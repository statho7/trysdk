import { InputForm } from '@/components/InputForm'
import { ThemeToggle } from '@/components/ThemeToggle'
import { InlinePreview, LiveLaunchPanel } from '@/components/LivePreviewPanels'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--gh-canvas)] text-[var(--gh-fg-body)]">
      <header className="border-b border-[var(--gh-border-muted)]">
        <nav className="mx-auto flex max-w-[1080px] items-center gap-2 px-6 py-4" aria-label="Main navigation">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[var(--gh-fg)] no-underline">
            <span className="flex h-5 w-5 items-center justify-center text-[var(--gh-success)]" aria-hidden="true">▸</span>
            Try SDK
          </Link>
          <div className="ml-auto flex items-center gap-5 text-sm">
            <a href="https://github.com/statho7/trysdk" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[var(--gh-fg-body)] no-underline hover:text-[var(--gh-fg)]">
              <span aria-hidden="true">◉</span><span className="hidden sm:inline">Project repository</span>
            </a>
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <section className="mx-auto grid max-w-[1080px] grid-cols-[minmax(0,1fr)] gap-12 px-6 py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
        <div className="min-w-0">
          <p className="mb-4 font-mono text-xs text-[var(--gh-fg-muted)]"><span className="text-[var(--gh-success)]">●</span> Daytona × Codex × Parallel</p>
          <h1 className="max-w-[20ch] text-4xl font-bold leading-[1.12] tracking-[-0.025em] text-[var(--gh-fg)] sm:text-5xl">Every repository deserves a Try button.</h1>
          <ul className="mt-5 grid max-w-[46ch] gap-2 text-base text-[var(--gh-fg-muted)]" aria-label="Try SDK value proposition">
            <li className="flex items-center gap-2"><span className="text-[var(--gh-success)]" aria-hidden="true">✓</span>Paste a public GitHub URL</li>
            <li className="flex items-center gap-2"><span className="text-[var(--gh-accent)]" aria-hidden="true">✓</span>Open a live preview in seconds</li>
            <li className="flex items-center gap-2"><span className="text-[#a371f7]" aria-hidden="true">✓</span>See whether it matches your needs</li>
          </ul>
          <div className="mt-8"><InputForm /></div>
        </div>

        <LiveLaunchPanel />
      </section>

      <InlinePreview />

      <section className="mx-auto max-w-[1080px] px-6 pb-16">
        <div className="border-t border-[var(--gh-border-muted)] pt-8">
          <h2 className="text-xl font-bold tracking-[-0.01em] text-[var(--gh-fg)]">The preview is the repo&apos;s own dev server.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--gh-fg-muted)]">Not a screenshot or rebuild. A completed launch gives you a working URL you can open, share, then destroy.</p>
          <div className="mt-6 grid gap-7 sm:grid-cols-3">
            {[
              ['No local setup', 'Evaluate a project without installing anything on your machine.'],
              ['Real repository code', 'The sandbox runs the actual repo, lockfile, scripts, and dev server.'],
              ['Disposable by design', 'Destroy the sandbox when done. Abandoned ones clean themselves up.'],
            ].map(([title, copy]) => <div key={title}><h3 className="text-sm font-semibold text-[var(--gh-fg)]">{title}</h3><p className="mt-1 text-sm leading-6 text-[var(--gh-fg-muted)]">{copy}</p></div>)}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--gh-border-muted)]"><div className="mx-auto flex max-w-[1080px] flex-wrap gap-4 px-6 py-6 text-xs text-[var(--gh-fg-subtle)]"><span>Try SDK — Daytona HackSprint 2026</span><a href="https://github.com/statho7/trysdk" className="ml-auto text-[var(--gh-fg-muted)] no-underline hover:text-[var(--gh-fg)]">Source</a></div></footer>
    </main>
  )
}
