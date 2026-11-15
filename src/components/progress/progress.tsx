// The progress bar of the language (contract: ir/contracts/progress.json, variant bar). Base UI gives the role, the
// name, and the values for assistive technology. The tokens and the geometry of the contract give the look
// (progress.variants.ts, components.css).
import { Progress as Base } from '@base-ui/react/progress'
import { type CSSProperties, type ReactNode, useState } from 'react'
import { Announcer } from './progress.announcer'
import { ProgressMotion } from './progress.motion'
import { barFill, barFillIndeterminate, barLabel, barRoot, barTrack, barValue } from './progress.variants'
import { cx } from '@monorithm/react/lib/cx'

export interface ProgressBarProps {
  /** The name: the task, for example "Uploading 3 photos" (progress/name). */
  label: ReactNode
  /**
   * The amount of the task that is done, from min to max. With no value, the bar is indeterminate (progress/indeterminate).
   * Give max only when the system confirms the end of the task (progress/done).
   */
  value?: number | null
  /** The minimum. The default is 0 (progress/role). */
  min?: number
  /** The maximum. The default is 100 (progress/role). */
  max?: number
  /** The value text when the value is not a percentage, for example "96 of 240 KB" (progress/value-text). */
  valueText?: string
  /** The result at the end, for example "Uploaded". The announcer tells it one time when the value is max (progress/announce-once). */
  resultLabel?: ReactNode
  /** The locale of the digits of the percentage, for example "ar-EG". The default is the locale of the runtime (progress/direction). */
  locale?: Intl.LocalesArgument
  id?: string
  className?: string
}

/** The direction of the last change: a larger value moves with the spring, a smaller value jumps (progress/bar-motion). */
interface Last {
  fraction: number
  grows: boolean
}

export function ProgressBar({ label, value, min = 0, max = 100, valueText, resultLabel, locale, id, className }: ProgressBarProps) {
  const determinate = value != null && Number.isFinite(value)
  const fraction = determinate && max > min ? Math.min(Math.max((value - min) / (max - min), 0), 1) : 0
  const [last, setLast] = useState<Last>({ fraction, grows: true })
  if (determinate && fraction !== last.fraction) setLast({ fraction, grows: fraction > last.fraction })
  // progress/done: the percentage rounds down. Thus the bar shows 100 % only at the maximum.
  const percent = new Intl.NumberFormat(locale, { style: 'percent', roundingMode: 'floor' }).format(fraction)
  const complete = determinate && fraction === 1
  return (
    <div data-mono="progress" data-variant="bar" className={className}>
      <ProgressMotion />
      <Base.Root
        id={id}
        value={determinate ? value : null}
        min={min}
        max={max}
        // progress/value-text and progress/indeterminate: the value text, or the percentage. An indeterminate bar has
        // no value text, unless the app gives one.
        aria-valuetext={valueText ?? (determinate ? percent : undefined)}
        className={barRoot}
      >
        <Base.Label data-part="label" className={barLabel}>
          {label}
        </Base.Label>
        {determinate ? (
          <Base.Value data-part="value" className={barValue}>
            {() => percent}
          </Base.Value>
        ) : null}
        <Base.Track data-part="track" className={barTrack}>
          {determinate ? (
            <span
              data-part="fill"
              data-jump={last.grows ? undefined : ''}
              style={{ '--progress-fraction': fraction } as CSSProperties}
              className={barFill}
            />
          ) : (
            <span data-part="fill" className={barFillIndeterminate} />
          )}
        </Base.Track>
      </Base.Root>
      <Announcer text={complete && resultLabel ? resultLabel : label} />
    </div>
  )
}

// The other variants, thus one import path gives the three (for example the browser test).
export { Spinner, type SpinnerProps } from './progress.spinner'
export { Skeleton, SkeletonShape, type SkeletonProps, type SkeletonShapeProps, type SkeletonRadius } from './progress.skeleton'
