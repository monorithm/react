// The spinner of a loading button (button/loading). It does not turn with reduced motion (button/motion).
import { cx } from '@monorithm/react/lib/cx'
import { buttonIcon } from './button.variants'

/** The spinner of a loading button. It does not turn with reduced motion (button/motion). */
export function ButtonSpinner() {
  return (
    <svg
      aria-hidden="true"
      data-part="spinner"
      viewBox="0 0 16 16"
      fill="none"
      className={cx(
        buttonIcon,
        'animate-spin [animation-duration:var(--mono-duration-spin)] motion-reduce:animate-none in-data-[motion=reduced]:animate-none',
      )}
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.3" vectorEffect="non-scaling-stroke" className="[stroke-width:var(--mono-button-spinner-stroke)]" />
      <path d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5" stroke="currentColor" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="[stroke-width:var(--mono-button-spinner-stroke)]" />
    </svg>
  )
}
