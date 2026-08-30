import { InputForm } from '@/components/InputForm'

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 px-6 py-16">
      <div className="flex flex-col items-center gap-8 w-full max-w-xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2 rounded-full border border-indigo-800 bg-indigo-950/40 px-3 py-1 text-xs text-indigo-400">
            ⚡ AI-powered OSS evaluation
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Scout any OSS app<br />for your use case
          </h1>
          <p className="text-zinc-400 text-base max-w-md">
            Paste a GitHub repo. Describe what you&apos;re building. Get an AI agent report on whether it fits.
          </p>
        </div>

        <InputForm />

        <p className="text-xs text-zinc-600 text-center">
          The repo is cloned in an isolated sandbox, run live, and analyzed by Claude vision.
        </p>
      </div>
    </main>
  )
}
