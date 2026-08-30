'use client'

import { useSyncExternalStore } from 'react'

const THEME_CHANGE_EVENT = 'trysdk:theme-change'

function subscribe(listener: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, listener)
  return () => window.removeEventListener(THEME_CHANGE_EVENT, listener)
}

function getThemeSnapshot() {
  return document.documentElement.classList.contains('dark')
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getThemeSnapshot, () => true)

  function toggle() {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
    try {
      localStorage.setItem('trysdk-theme', next ? 'dark' : 'light')
    } catch {
      // Storage can be unavailable in embedded contexts; the toggle still works for the session.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to day theme' : 'Switch to night theme'}
      title={dark ? 'Day theme' : 'Night theme'}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--gh-border)] text-[var(--gh-fg-muted)] transition-colors hover:border-[var(--gh-fg-muted)] hover:text-[var(--gh-fg)]"
    >
      {dark ? (
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-1.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5ZM8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0ZM8 13a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13ZM2.343 2.343a.75.75 0 0 1 1.061 0l1.06 1.061a.75.75 0 0 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06Zm9.193 9.193a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 0 1-1.06 1.061l-1.061-1.06a.75.75 0 0 1 0-1.061ZM16 8a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 16 8ZM3 8a.75.75 0 0 1-.75.75H.75a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 3 8Zm10.657-5.657a.75.75 0 0 1 0 1.061l-1.061 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0Zm-9.193 9.193a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 1 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0Z" /></svg>
      ) : (
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M9.598 1.591a.749.749 0 0 1 .785-.175 7.001 7.001 0 1 1-8.967 8.967.75.75 0 0 1 .961-.96 5.5 5.5 0 0 0 7.046-7.046.75.75 0 0 1 .175-.786Zm1.616 1.945a7 7 0 0 1-7.678 7.678 5.499 5.499 0 1 0 7.678-7.678Z" /></svg>
      )}
    </button>
  )
}
