'use client'

import { useState } from 'react'
import type { EvalResult } from '@/lib/types'

function ScoreRing({ score }: { score: number }) {
  const color =
    score <= 4 ? 'text-red-400 border-red-600' :
    score <= 7 ? 'text-amber-400 border-amber-500' :
    'text-emerald-400 border-emerald-500'

  return (
    <div className={`flex items-center justify-center w-24 h-24 rounded-full border-4 ${color} shrink-0`}>
      <span className={`text-4xl font-bold ${color.split(' ')[0]}`}>{score}</span>
      <span className="text-zinc-500 text-sm self-end mb-2">/10</span>
    </div>
  )
}

interface Props {
  result: EvalResult
}

export function FitReport({ result }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const verdictColor =
    result.fitScore <= 4 ? 'border-red-800 bg-red-950/40 text-red-300' :
    result.fitScore <= 7 ? 'border-amber-800 bg-amber-950/40 text-amber-300' :
    'border-emerald-800 bg-emerald-950/40 text-emerald-300'

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl">
      {/* Score + summary */}
      <div className="flex items-center gap-6">
        <ScoreRing score={result.fitScore} />
        <div>
          <h2 className="text-lg font-semibold text-white">Fit Score</h2>
          <p className="text-zinc-400 text-sm mt-1">{result.summary}</p>
        </div>
      </div>

      {/* Verdict */}
      <div className={`rounded-lg border px-4 py-3 ${verdictColor}`}>
        <p className="font-semibold text-sm">Verdict</p>
        <p className="text-sm mt-0.5">{result.verdict}</p>
      </div>

      {/* Features */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Feature Analysis</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {result.features.map(feature => (
            <div
              key={feature.name}
              className="relative group flex items-start gap-2 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 cursor-default"
              onMouseEnter={() => setExpanded(feature.name)}
              onMouseLeave={() => setExpanded(null)}
            >
              <span className={`mt-0.5 shrink-0 ${feature.found ? 'text-emerald-400' : 'text-red-400'}`}>
                {feature.found ? '✓' : '✗'}
              </span>
              <span className="text-sm text-zinc-300">{feature.name}</span>
              {expanded === feature.name && feature.notes && (
                <div className="absolute bottom-full left-0 mb-1 z-10 w-64 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs text-zinc-300 shadow-xl">
                  {feature.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Screenshots */}
      {result.screenshots.filter(s => s.base64).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Screenshots</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {result.screenshots.filter(s => s.base64).map(shot => (
              <div key={shot.route} className="flex flex-col gap-1">
                <img
                  src={`data:image/png;base64,${shot.base64}`}
                  alt={shot.route}
                  className="w-full rounded-lg border border-zinc-800 object-cover aspect-video"
                />
                <p className="text-xs text-zinc-500 truncate">{shot.route}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Caveats */}
      {result.caveats.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">Caveats</h3>
          <ul className="flex flex-col gap-1.5">
            {result.caveats.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                <span className="text-amber-500 shrink-0 mt-0.5">⚠</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
