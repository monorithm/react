// The signs of the Toast (contract: ir/contracts/toast.json): the icons info, success, warning, error, and close of the
// icon set of the language (a grid of 24, a stroke of 1.75, round caps and round joins), and the spinner of a loading
// toast. Each tone has a different shape, thus color is not the only sign of the tone (toast/tone-sign, toast/icon). Each
// sign takes the text color of its box (currentColor). Assistive technology does not read them (toast/icon-style).
import type { JSX } from 'react'
import { toastSpinner } from './toast.variants'
import type { ToastTone } from './toast.types'

const svg = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
} as const

/** The icon info: a circle with the letter i. */
export function ToastInfoIcon() {
  return (
    <svg {...svg} data-icon="info">
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M12 11v5M12 8h.01" />
    </svg>
  )
}

/** The icon success: a circle with a check. */
export function ToastSuccessIcon() {
  return (
    <svg {...svg} data-icon="success">
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M8 12.5l3 3l5 -6" />
    </svg>
  )
}

/** The icon warning: a triangle with an exclamation mark. */
export function ToastWarningIcon() {
  return (
    <svg {...svg} data-icon="warning">
      <path d="M12 4 2.5 20h19zM12 10v4M12 17h.01" />
    </svg>
  )
}

/** The icon error: a circle with a cross. */
export function ToastErrorIcon() {
  return (
    <svg {...svg} data-icon="error">
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M15 9l-6 6M9 9l6 6" />
    </svg>
  )
}

/** The icon close of the close button (toast/close). */
export function ToastCloseIcon() {
  return (
    <svg {...svg} data-icon="close">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

/** The icon of each tone (toast/icon). */
export const toneIcons: Record<ToastTone, () => JSX.Element> = {
  info: ToastInfoIcon,
  success: ToastSuccessIcon,
  warning: ToastWarningIcon,
  danger: ToastErrorIcon,
}

/**
 * The keyframes of the spinner: one turn, and the pulse of the opacity from 1 to 0.4 and back (duration.pulse). The
 * language has no token for 0.4 at this time. Only the transform and the opacity change.
 */
const KEYFRAMES = '@keyframes mono-toast-spin{to{transform:rotate(1turn)}}@keyframes mono-toast-pulse{50%{opacity:0.4}}'

/**
 * The spinner of a loading toast (toast/loading). It turns in duration.spin. With reduced motion, it does not turn: it
 * pulses its opacity (toast/reduced-motion). React puts one copy of the style element in the head of the document.
 */
export function ToastSpinner() {
  return (
    <>
      <style href="mono-toast-motion" precedence="mono">
        {KEYFRAMES}
      </style>
      <svg aria-hidden="true" focusable="false" data-icon="spinner" viewBox="0 0 16 16" fill="none" className={toastSpinner}>
        {/* The drawing of the spinner of a loading button. The stroke is 2 of the 16 units of the icon. */}
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
        <path d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      </svg>
    </>
  )
}
