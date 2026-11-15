// The Checkbox of the language (contract: ir/contracts/checkbox.json). Base UI gives the behavior and the
// accessibility. The tokens and the geometry of the contract give the look: each size comes from --mono-checkbox-*.
import { Checkbox as Base } from '@base-ui/react/checkbox'
import { type ReactNode, useId } from 'react'
import { checkboxBox, checkboxMark } from './checkbox.variants'
import { cx } from '../../lib/cx'
import { DESCRIPTION, LABEL, LINE, ROW, ROW_INNER, TEXT } from '../../lib/row'
import { useMoment } from '../../hooks/use-moment'

export interface CheckboxProps {
  /** The name of the option. */
  label: ReactNode
  /** Help text under the label. For a parent checkbox, the count: "2 of 3 selected" (checkbox/mixed). */
  description?: ReactNode
  /** The cause of the disabled state. It replaces the description when the checkbox is disabled (checkbox/disabled). */
  disabledReason?: ReactNode
  checked?: boolean
  defaultChecked?: boolean
  /** The mixed state of a parent checkbox: some of its options are on. A press turns it on (checkbox/mixed). */
  mixed?: boolean
  /** Called at the change of the state, with the new state. */
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  required?: boolean
  /** The form sends the value under this name when the checkbox is on (checkbox/form). */
  name?: string
  /** The value that the form sends. The default is "on". */
  value?: string
  id?: string
  className?: string
}

export function Checkbox({
  label,
  description,
  disabledReason,
  checked,
  defaultChecked,
  mixed,
  onCheckedChange,
  disabled,
  required,
  name,
  value,
  id,
  className,
}: CheckboxProps) {
  const emit = useMoment('checkbox')
  const labelId = useId()
  const descriptionId = useId()
  const help = disabled && disabledReason ? disabledReason : description
  return (
    <label data-mono="checkbox" className={cx(ROW, className)}>
      <span className={cx(ROW_INNER, 'gap-(--mono-checkbox-row-gap)')}>
        <span className={LINE}>
          <Base.Root
            id={id}
            name={name}
            value={value}
            checked={checked}
            defaultChecked={defaultChecked}
            indeterminate={mixed}
            disabled={disabled}
            required={required}
            aria-labelledby={labelId}
            aria-describedby={help ? descriptionId : undefined}
            // checkbox/moment: the moment comes at the change of the state, not at the end of the mark motion.
            onCheckedChange={(next) => {
              emit('toggle', next ? 'on' : 'off')
              onCheckedChange?.(next)
            }}
            className={checkboxBox}
          >
            <Base.Indicator keepMounted data-part="mark" className={checkboxMark}>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-full">
                <path
                  d={mixed ? 'M4.5 8h7' : 'M4 8.5 6.75 11 12 5.25'}
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  className="[stroke-width:var(--mono-checkbox-mark-stroke)]"
                />
              </svg>
            </Base.Indicator>
          </Base.Root>
        </span>
        <span className={TEXT}>
          <span id={labelId} className={LABEL}>
            {label}
          </span>
          {help ? (
            <span id={descriptionId} className={DESCRIPTION}>
              {help}
            </span>
          ) : null}
        </span>
      </span>
    </label>
  )
}
