// The region of the toasts and the announcer (contract: ir/contracts/toast.json). Base UI gives the region: it stops the
// timers while the pointer is on a toast and while the focus is in a toast (toast/pause). The announcer is a polite live
// region that only assistive technology reads.
import { Toast as Base, type ToastObject } from '@base-ui/react/toast'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { ToastItem } from './toast.item'
import type { ToastQueue } from './toast.queue'
import type { ToastData } from './toast.types'
import { toastRegion } from './toast.variants'
import { cx } from '@monorithm/react/lib/cx'

interface ToastViewportProps {
  queue: ToastQueue
  label: string
  closeLabel: string
  describeAction: (label: string) => string
  className?: string | undefined
}

/** The sentence ends with a mark. Thus the screen reader stops between the title, the text, and the action. */
const sentence = (s: string): string => (/[.!?…。]$/.test(s) ? s : `${s}.`)

/**
 * toast/announce and toast/announce-action: the message of a toast is its title and its text. When the toast has an
 * action, the message also tells it, for example "Product hidden. Black shirt. Undo is available."
 */
export function message(toast: ToastObject<ToastData>, describeAction: (label: string) => string): string {
  const action = toast.data?.action
  const parts = [toast.title, toast.description, action ? describeAction(action.label) : undefined]
  return parts
    .filter((p): p is string => typeof p === 'string' && p !== '')
    .map(sentence)
    .join(' ')
}

export function ToastViewport({ queue, label, closeLabel, describeAction, className }: ToastViewportProps) {
  const { toasts } = Base.useToastManager<ToastData>()
  const ref = useRef<HTMLDivElement>(null)
  useKeyboardInset(ref)
  useNotObscured(ref)
  // The announcer is empty in the first render. Thus a toast of the first render also goes to the announcer as a new
  // message, and the screen reader speaks it.
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  // Base UI keeps the newest toast first. The DOM order is the order on the screen: the oldest toast at the top and the
  // newest toast at the bottom (toast/queue-max). The focus order is the same.
  const ordered = [...toasts].reverse()
  return (
    <>
      <Base.Viewport
        ref={ref}
        data-mono="toast"
        data-part="region"
        // toast/role: the area of the toasts is a region with a name. The announcer speaks the messages, thus the region
        // is not a live region (toast/announce).
        aria-label={label}
        aria-live="off"
        aria-atomic={undefined}
        aria-relevant={undefined}
        className={cx(toastRegion, className)}
      >
        {ordered.map((toast) => (
          <ToastItem key={toast.id} toast={toast} queue={queue} closeLabel={closeLabel} />
        ))}
      </Base.Viewport>
      {/*
        toast/announce: the announcer speaks the message of an info, a success, a warning, or a loading toast one time,
        when the toast shows. It is polite: the message waits until the current speech ends. Each message is a new line,
        and a removed line is not spoken. A danger toast is an alert, and the alert speaks its message.
      */}
      <div data-part="announcer" aria-live="polite" className="sr-only">
        {ready
          ? ordered
              .filter((t) => t.type !== 'danger' && t.transitionStatus !== 'ending')
              .map((t) => <p key={t.id}>{message(t, describeAction)}</p>)
          : null}
      </div>
    </>
  )
}

/**
 * toast/position-keyboard: when the on-screen keyboard is open, the toasts are 16 px above it. The visual viewport is the
 * part of the window above the keyboard. Its distance to the bottom edge of the window goes into --toast-keyboard.
 */
function useKeyboardInset(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const region = ref.current
    const view = region?.ownerDocument.defaultView
    const vv = view?.visualViewport
    if (!region || !view || !vv) return undefined
    const sync = () => {
      const inset = Math.max(0, Math.round(view.innerHeight - vv.height - vv.offsetTop))
      if (inset > 0) region.style.setProperty('--toast-keyboard', `${inset}px`)
      else region.style.removeProperty('--toast-keyboard')
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
    }
  }, [ref])
}

/**
 * toast/not-obscured: a toast never fully covers the control that has the focus. When the focus goes to a control that a
 * toast fully covers, the toasts go up to 16 px above the control (--toast-lift). When the focus goes to a different
 * control, the toasts go back.
 */
function useNotObscured(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const region = ref.current
    if (!region) return undefined
    const doc = region.ownerDocument
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Element | null
      if (!target || typeof target.getBoundingClientRect !== 'function' || region.contains(target)) return
      region.style.removeProperty('--toast-lift')
      const r = target.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return
      const covered = [...region.querySelectorAll('[data-part="container"]')].some((toast) => {
        const t = toast.getBoundingClientRect()
        return t.left <= r.left && t.right >= r.right && t.top <= r.top && t.bottom >= r.bottom
      })
      const view = doc.defaultView
      if (covered && view) region.style.setProperty('--toast-lift', `${Math.round(view.innerHeight - r.top)}px`)
    }
    doc.addEventListener('focusin', onFocusIn)
    return () => doc.removeEventListener('focusin', onFocusIn)
  }, [ref])
}
