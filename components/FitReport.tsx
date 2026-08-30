'use client'

import { useEffect, useState } from 'react'
import type { EvalResult, Screenshot } from '@/lib/types'

function ScoreRing({ score }: { score: number }) {
  const color =
    score <= 4 ? 'text-[var(--gh-danger)] border-[var(--gh-danger)]' :
    score <= 7 ? 'text-[var(--gh-attention)] border-[var(--gh-attention)]' :
    'text-[var(--gh-success)] border-[var(--gh-success)]'

  return (
    <div className={`flex items-center justify-center w-24 h-24 rounded-full border-4 ${color} shrink-0`}>
      <span className={`text-4xl font-bold ${color.split(' ')[0]}`}>{score}</span>
      <span className="text-[var(--gh-fg-subtle)] text-sm self-end mb-2">/10</span>
    </div>
  )
}

interface Props {
  result: EvalResult
}

export function FitReport({ result }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null)

  useEffect(() => {
    if (!selectedScreenshot) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedScreenshot(null)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [selectedScreenshot])

  const verdictColor =
    result.fitScore <= 4 ? 'border-[var(--gh-danger)]/40 bg-[var(--gh-danger)]/10' :
    result.fitScore <= 7 ? 'border-[var(--gh-attention)]/40 bg-[var(--gh-attention)]/10' :
    'border-[var(--gh-success)]/40 bg-[var(--gh-success)]/10'

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl">
      {/* Score + summary */}
      <div className="flex items-center gap-6">
        <ScoreRing score={result.fitScore} />
        <div>
          <h2 className="text-lg font-semibold text-[var(--gh-fg)]">Fit Score</h2>
          <p className="text-[var(--gh-fg-muted)] text-sm mt-1">{result.summary}</p>
        </div>
      </div>

      {/* Verdict */}
      <div className={`rounded-md border px-4 py-3 ${verdictColor}`}>
        <p className="font-semibold text-sm">Verdict</p>
        <p className="text-sm mt-0.5">{result.verdict}</p>
      </div>

      {/* Features */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--gh-fg)] mb-3">Feature analysis</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {result.features.map(feature => (
            <div
              key={feature.name}
              className="relative group flex items-start gap-2 rounded-md bg-[var(--gh-surface)] border border-[var(--gh-border-muted)] px-3 py-2 cursor-default"
              onMouseEnter={() => setExpanded(feature.name)}
              onMouseLeave={() => setExpanded(null)}
            >
              <span className={`mt-0.5 shrink-0 ${feature.found ? 'text-[var(--gh-success)]' : 'text-[var(--gh-danger)]'}`}>
                {feature.found ? '✓' : '✗'}
              </span>
              <span className="text-sm text-[var(--gh-fg-body)]">{feature.name}</span>
              {expanded === feature.name && feature.notes && (
                <div className="absolute bottom-full left-0 mb-1 z-10 w-64 rounded-md bg-[var(--gh-surface-2)] border border-[var(--gh-border)] px-3 py-2 text-xs text-[var(--gh-fg-body)] shadow-xl">
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
          <h3 className="text-sm font-semibold text-[var(--gh-fg-body)] mb-3">Screenshots</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {result.screenshots.filter(s => s.base64).map(shot => (
              <div key={shot.route} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedScreenshot(shot)}
                  className="group relative overflow-hidden rounded-md border border-[var(--gh-border-muted)] text-left outline-none transition hover:border-[var(--gh-fg-muted)] focus-visible:ring-2 focus-visible:ring-[var(--gh-accent)]"
                  aria-label={`Open screenshot of ${shot.route}`}
                >
                  <img
                    src={`data:${shot.mimeType};base64,${shot.base64}`}
                    alt={`Screenshot of ${shot.route}`}
                    className="aspect-video w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/65 px-2 py-1 text-right text-[11px] text-[var(--gh-fg)] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">View full size</span>
                </button>
                <p className="text-xs text-[var(--gh-fg-subtle)] truncate">{shot.route}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Caveats */}
      {result.caveats.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--gh-fg-body)] mb-2">Caveats</h3>
          <ul className="flex flex-col gap-1.5">
            {result.caveats.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--gh-fg-muted)]">
                <span className="text-[var(--gh-attention)] shrink-0 mt-0.5">⚠</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedScreenshot && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="screenshot-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--gh-overlay)] p-4 backdrop-blur-sm"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="relative flex max-h-full max-w-6xl flex-col gap-3" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 text-sm text-[var(--gh-fg)]">
              <div>
                <p id="screenshot-dialog-title" className="font-medium">{selectedScreenshot.route}</p>
                <p className="text-xs text-[var(--gh-fg-muted)]">{selectedScreenshot.description}</p>
              </div>
              <button type="button" onClick={() => setSelectedScreenshot(null)} className="rounded-md border border-[var(--gh-border)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--gh-fg-muted)] hover:bg-[var(--gh-surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--gh-accent)]">Close</button>
            </div>
            <img src={`data:${selectedScreenshot.mimeType};base64,${selectedScreenshot.base64}`} alt={`Full-size screenshot of ${selectedScreenshot.route}`} className="max-h-[80vh] max-w-full rounded-md border border-[var(--gh-border)] object-contain shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  )
}
