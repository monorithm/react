// The signs of the Alert (contract: ir/contracts/alert.json): the icons info, success, warning, error, and close of the
// icon set of the language (a grid of 24, a stroke of 1.75, round caps and round joins). Each tone has a different
// shape, thus color is not the only sign of the tone (alert/tone-sign, alert/icon). Each sign takes the text color of
// its box (currentColor). Assistive technology does not read them.
import type { JSX } from 'react'
import type { AlertTone } from './alert.variants'

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
export function AlertInfoIcon() {
  return (
    <svg {...svg} data-icon="info">
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M12 11v5M12 8h.01" />
    </svg>
  )
}

/** The icon success: a circle with a check. */
export function AlertSuccessIcon() {
  return (
    <svg {...svg} data-icon="success">
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M8 12.5l3 3l5 -6" />
    </svg>
  )
}

/** The icon warning: a triangle with an exclamation mark. */
export function AlertWarningIcon() {
  return (
    <svg {...svg} data-icon="warning">
      <path d="M12 4 2.5 20h19zM12 10v4M12 17h.01" />
    </svg>
  )
}

/** The icon error: a circle with a cross. */
export function AlertErrorIcon() {
  return (
    <svg {...svg} data-icon="error">
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M15 9l-6 6M9 9l6 6" />
    </svg>
  )
}

/** The icon close of the close button (alert/close). */
export function AlertCloseIcon() {
  return (
    <svg {...svg} data-icon="close">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

/** The icon of each tone: info for info, success for success, warning for warning, and error for danger (alert/icon). */
export const toneIcons: Record<AlertTone, () => JSX.Element> = {
  info: AlertInfoIcon,
  success: AlertSuccessIcon,
  warning: AlertWarningIcon,
  danger: AlertErrorIcon,
}
