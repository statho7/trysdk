import { InputForm } from '@/components/InputForm'
import Link from 'next/link'

const timeline = [
  ['Sandbox created', 'daytona · node:22 · 2 vCPU / 4 GB', '1.8s'],
  ['Repository cloned', 'git clone --depth 1 · main', '2.1s'],
  ['Dependencies installed', 'vite detected · package manager selected', '8.4s'],
  ['Starting dev server', 'vite --host 0.0.0.0 --port 5173', '…'],
  ['Preview ready', 'shareable URL', '—'],
]

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      <header className="border-b border-[#21262d]">
        <nav className="mx-auto flex max-w-[1080px] items-center gap-2 px-6 py-4" aria-label="Main navigation">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[#f0f6fc] no-underline">
            <span className="flex h-5 w-5 items-center justify-center text-[#3fb950]" aria-hidden="true">▸</span>
            Try SDK
          </Link>
          <div className="ml-auto flex items-center gap-5 text-sm">
            <a href="#how" className="hidden text-[#c9d1d9] no-underline hover:text-[#f0f6fc] sm:block">How it works</a>
            <a href="https://github.com/statho7/trysdk" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[#c9d1d9] no-underline hover:text-[#f0f6fc]">
              <span aria-hidden="true">◉</span><span className="hidden sm:inline">statho7/trysdk</span>
            </a>
          </div>
        </nav>
      </header>

      <section className="mx-auto grid max-w-[1080px] gap-12 px-6 py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
        <div>
          <p className="mb-4 font-mono text-xs text-[#8b949e]"><span className="text-[#3fb950]">●</span> v0.1 — Daytona HackSprint build</p>
          <h1 className="max-w-[20ch] text-4xl font-bold leading-[1.12] tracking-[-0.025em] text-[#f0f6fc] sm:text-5xl">Every repository deserves a Try button.</h1>
          <p className="mt-5 max-w-[46ch] text-base leading-7 text-[#8b949e]">Paste a public GitHub URL. Try SDK clones it into an isolated Daytona sandbox, starts the repository’s own dev server, and gives you a live preview link before you clone anything.</p>
          <div className="mt-8"><InputForm /></div>
        </div>

        <aside id="how" className="overflow-hidden rounded-lg border border-[#30363d] bg-[#161b22] shadow-[0_16px_48px_rgba(1,4,9,0.18)]">
          <div className="border-b border-[#21262d] bg-[#1c2128] px-4 py-3 font-mono text-xs text-[#8b949e]">launch — dgreenheck/threejs-procedural-planets</div>
          <ol className="p-4">
            {timeline.map(([title, log, time], index) => {
              const done = index < 3
              const active = index === 3
              return (
                <li key={title} className="grid grid-cols-[20px_minmax(0,1fr)_auto] gap-x-3">
                  <div className="flex flex-col items-center">
                    <span className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] ${done ? 'border-[#3fb950] text-[#3fb950]' : active ? 'border-[#58a6ff] text-[#58a6ff]' : 'border-[#30363d] text-[#6e7681]'}`}>{done ? '✓' : active ? '◌' : '•'}</span>
                    {index < timeline.length - 1 && <span className={`min-h-5 w-px flex-1 ${done ? 'bg-[#3fb950]/40' : 'bg-[#21262d]'}`} />}
                  </div>
                  <div className="min-w-0 pb-4">
                    <p className={`text-sm font-semibold ${active ? 'text-[#f0f6fc]' : 'text-[#c9d1d9]'}`}>{title}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-[#6e7681]">{log}</p>
                  </div>
                  <span className="pt-0.5 font-mono text-xs text-[#6e7681]">{time}</span>
                </li>
              )
            })}
            <li className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[#21262d] pt-3 font-mono text-xs text-[#6e7681]"><span>elapsed 12.3s</span><span>sandbox 9f2e</span><span>auto-destroy 30m</span></li>
          </ol>
        </aside>
      </section>

      <section className="mx-auto max-w-[1080px] px-6 pb-16">
        <div className="border-t border-[#21262d] pt-8">
          <h2 className="text-xl font-bold tracking-[-0.01em] text-[#f0f6fc]">The preview is the repo&apos;s own dev server.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8b949e]">Not a screenshot or rebuild. A completed launch gives you a working URL you can open, share, then destroy.</p>
          <div className="mt-6 grid gap-7 sm:grid-cols-3">
            {[
              ['No local setup', 'Evaluate a project without installing anything on your machine.'],
              ['Real repository code', 'The sandbox runs the actual repo, lockfile, scripts, and dev server.'],
              ['Disposable by design', 'Destroy the sandbox when done. Abandoned ones clean themselves up.'],
            ].map(([title, copy]) => <div key={title}><h3 className="text-sm font-semibold text-[#f0f6fc]">{title}</h3><p className="mt-1 text-sm leading-6 text-[#8b949e]">{copy}</p></div>)}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#21262d]"><div className="mx-auto flex max-w-[1080px] flex-wrap gap-4 px-6 py-6 text-xs text-[#6e7681]"><span>Try SDK — Daytona HackSprint 2026</span><a href="https://github.com/statho7/trysdk" className="ml-auto text-[#8b949e] no-underline hover:text-[#f0f6fc]">Source</a></div></footer>
    </main>
  )
}
