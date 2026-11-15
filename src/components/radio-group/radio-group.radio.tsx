// An option of the Radio group (contract: ir/contracts/radio-group.json): a row, or an option card in the cards variant.
import { Radio as BaseRadio } from '@base-ui/react/radio'
import { type ReactNode, useContext, useId } from 'react'
import { cx } from '../../lib/cx'
import { DESCRIPTION, FOCUS, LABEL, LINE, ROW, ROW_INNER, TEXT } from '../../lib/row'
import { RadioGroupContext } from './radio-group.context'
import { radioCard, radioDot, radioRing } from './radio-group.variants'

export interface RadioProps {
  value: string
  /** The name of the option. */
  label: ReactNode
  /** Help text under the label. */
  description?: ReactNode
  /** The cause of the disabled state. It replaces the description when the option is disabled (radio-group/disabled). */
  disabledReason?: ReactNode
  /** A value at the end side of an option card, for example a price. */
  detail?: ReactNode
  disabled?: boolean
  className?: string
}

export function Radio({ value, label, description, disabledReason, detail, disabled, className }: RadioProps) {
  const variant = useContext(RadioGroupContext)
  const labelId = useId()
  const descriptionId = useId()
  const help = disabled && disabledReason ? disabledReason : description
  const control = (
    <span className={LINE}>
      <BaseRadio.Root
        value={value}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-describedby={help ? descriptionId : undefined}
        // radio-group/focus: a row shows the ring on the ring of the option. A card shows it on the full card.
        className={cx(radioRing, variant === 'list' ? FOCUS : 'outline-none')}
      >
        <BaseRadio.Indicator keepMounted data-part="dot" className={radioDot} />
      </BaseRadio.Root>
    </span>
  )
  const text = (
    <span className={cx(TEXT, 'flex-1')}>
      <span id={labelId} className={cx(LABEL, variant === 'cards' && 'font-mono-strong')}>
        {label}
      </span>
      {help ? (
        <span id={descriptionId} className={DESCRIPTION}>
          {help}
        </span>
      ) : null}
    </span>
  )
  if (variant === 'cards') {
    return (
      <label data-part="option" className={cx(radioCard, className)}>
        {control}
        {text}
        {detail ? (
          <span data-part="detail" className="shrink-0 whitespace-nowrap text-mono-small text-mono-fg-strong tabular-nums">
            {detail}
          </span>
        ) : null}
      </label>
    )
  }
  return (
    <label data-part="option" className={cx(ROW, className)}>
      <span className={cx(ROW_INNER, 'gap-(--mono-radio-group-option-gap)')}>
        {control}
        {text}
      </span>
    </label>
  )
}
