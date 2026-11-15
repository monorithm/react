// bottom-sheet/web-back: on the web, an open modal sheet adds a history entry. The Back button of the browser, and the
// back gesture of Android, go back one entry and close the sheet. When the sheet closes in a different way, the
// sheet removes its entry with history.back().
import { useEffect, useRef } from 'react'

/** The key of the entry in the state of the history. */
const KEY = 'monoBottomSheet'
/** The longest wait for the popstate of a history.back(), in ms. */
const SETTLE = 500

const entryOf = (state: unknown): unknown => (state && typeof state === 'object' ? (state as Record<string, unknown>)[KEY] : undefined)

/**
 * One listener for all sheets. A history.back() is asynchronous, and a pushState() before its popstate can cancel it.
 * Thus a sheet that opens while a back() of a different sheet is in progress waits for its popstate before it adds
 * its entry, and the listener does not give that popstate to the sheets.
 */
const listeners = new Set<() => void>()
const waiting: (() => void)[] = []
let backInProgress = false
let installed = false

function settle(): void {
  backInProgress = false
  for (const start of waiting.splice(0)) start()
}

function install(): void {
  if (installed) return
  installed = true
  window.addEventListener('popstate', () => {
    if (backInProgress) return settle()
    for (const listener of [...listeners]) listener()
  })
}

/** Adds a history entry while `active` is true. A Back to the previous entry calls onBack. */
export function useBackEntry(active: boolean, token: string, onBack: () => void): void {
  const back = useRef(onBack)
  back.current = onBack
  const live = useRef(false)
  useEffect(() => {
    if (!active || typeof window === 'undefined') return
    install()
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const onPop = () => {
      if (entryOf(window.history.state) !== token) back.current()
    }
    const start = () => {
      if (stopped) return
      const state: unknown = window.history.state
      // A second run of the effect (React strict mode) keeps the entry of the first run.
      if (entryOf(state) !== token) window.history.pushState({ ...(state && typeof state === 'object' ? state : {}), [KEY]: token }, '')
      listeners.add(onPop)
    }
    live.current = true
    if (backInProgress) {
      waiting.push(start)
      timer = setTimeout(settle, SETTLE)
    } else start()
    return () => {
      stopped = true
      clearTimeout(timer)
      listeners.delete(onPop)
      live.current = false
      // After the effect of a new run, the entry stays. Else the sheet closed in a different way: remove the entry.
      queueMicrotask(() => {
        if (live.current || entryOf(window.history.state) !== token) return
        backInProgress = true
        window.history.back()
      })
    }
  }, [active, token])
}
