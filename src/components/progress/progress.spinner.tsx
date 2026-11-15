// The spinner of the language (contract: ir/contracts/progress.json, variant spinner). It has the drawing, the icon
// size, and the turn of the spinner of a loading button (button.spinner.tsx). Assistive technology does not read the
// icon: the announcer tells the activity.
import { type ReactNode, useEffect, useState } from 'react'
import { Announcer } from './progress.announcer'
import { ProgressMotion, SPINNER_DELAY } from './progress.motion'
import { spinnerIcon, spinnerRoot } from './progress.variants'
import { cx } from '@monorithm/react/lib/cx'

export interface SpinnerProps {
  /**
   * The activity, for example "Saving". The announcer tells it one time when the spinner shows (progress/spinner-name).
   * Use a spinner only for a wait of less than 2 s. For a longer wait, use a bar or a skeleton (progress/spinner-use).
   */
  label: ReactNode
  className?: string
}

export function Spinner({ label, className }: SpinnerProps) {
  // progress/spinner-delay: the spinner shows only after the delay. A task that ends before it shows no spinner.
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), SPINNER_DELAY)
    return () => clearTimeout(timer)
  }, [])
  return (
    <span data-mono="progress" data-variant="spinner" data-shown={shown ? '' : undefined} className={cx(spinnerRoot, className)}>
      <ProgressMotion />
      {/* progress/size: before the delay, the icon is invisible but keeps its box. Thus the layout does not change. */}
      <svg aria-hidden="true" data-part="spinner" viewBox="0 0 16 16" fill="none" className={cx(spinnerIcon, !shown && 'invisible')}>
        {/* The drawing of the spinner of a loading button. The stroke is 2 px at each size (the geometry of the contract). */}
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.3" vectorEffect="non-scaling-stroke" className="[stroke-width:var(--mono-progress-spinner-stroke)]" />
        <path d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5" stroke="currentColor" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="[stroke-width:var(--mono-progress-spinner-stroke)]" />
      </svg>
      <Announcer text={shown ? label : null} />
    </span>
  )
}
