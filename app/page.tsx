import { InputForm } from '@/components/InputForm'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0d1117] px-4 py-8 text-[#f0f6fc] sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14">
        <header className="flex items-center gap-2 border-b border-[#21262d] pb-4 text-sm font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#f0f6fc] text-lg text-[#0d1117]">↗</span>
          <span>Try SDK</span>
          <span className="text-[#8b949e]">/</span>
          <span className="font-normal text-[#8b949e]">instant previews</span>
        </header>

        <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
          <div className="max-w-2xl">
            <p className="mb-4 font-mono text-xs font-medium uppercase tracking-[0.14em] text-[#58a6ff]">Preview a repository</p>
            <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.03em] text-[#f0f6fc] sm:text-5xl">
              See it running before you clone it.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#8b949e] sm:text-lg">
              Paste a public GitHub URL. Try SDK opens a temporary, shareable preview in an isolated Daytona sandbox.
            </p>

            <div className="mt-8 border-y border-[#21262d] py-6">
              <InputForm />
            </div>
          </div>

          <aside className="overflow-hidden border border-[#30363d] bg-[#161b22] text-sm shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between border-b border-[#30363d] px-5 py-3">
              <p className="font-medium text-[#f0f6fc]">Launch recipe</p>
              <span className="rounded-full border border-[#238636]/50 bg-[#238636]/15 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-[#3fb950]">Vite first</span>
            </div>
            <ol className="divide-y divide-[#21262d]">
              {[
                ['01', 'Inspect repository', 'Read package metadata and verify the launch path.'],
                ['02', 'Create sandbox', 'Clone and run code in an isolated Daytona environment.'],
                ['03', 'Open preview', 'Use the live app, share it, then clean it up.'],
              ].map(([number, title, description]) => (
                <li key={number} className="flex gap-3 px-5 py-4">
                  <span className="font-mono text-xs text-[#58a6ff]">{number}</span>
                  <div>
                    <p className="font-medium text-[#c9d1d9]">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-[#8b949e]">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </section>

        <section aria-label="Preview benefits" className="grid border-y border-[#21262d] py-6 sm:grid-cols-3">
          <div className="border-b border-[#21262d] py-4 sm:border-b-0 sm:border-r sm:py-1 sm:pr-7">
            <p className="text-sm font-medium text-[#f0f6fc]">No local setup</p>
            <p className="mt-1 text-sm leading-6 text-[#8b949e]">Try a project without changing your machine.</p>
          </div>
          <div className="border-b border-[#21262d] py-4 sm:border-b-0 sm:border-r sm:px-7 sm:py-1">
            <p className="text-sm font-medium text-[#f0f6fc]">Real repository code</p>
            <p className="mt-1 text-sm leading-6 text-[#8b949e]">The preview is the project’s own development server.</p>
          </div>
          <div className="py-4 sm:py-1 sm:pl-7">
            <p className="text-sm font-medium text-[#f0f6fc]">Disposable by design</p>
            <p className="mt-1 text-sm leading-6 text-[#8b949e]">Share the environment, then remove it when you are done.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
