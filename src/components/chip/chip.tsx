// The Chip of the language (contract: ir/contracts/chip.json). Base UI gives the behavior and the accessibility: the
// Toggle for a filter chip, the Button for a menu chip. The tokens and the geometry of the contract give the look
// (chip.variants.ts, components.css).
import { Button as BaseButton } from '@base-ui/react/button'
import { Toggle } from '@base-ui/react/toggle'
import { type MouseEvent, type ReactNode, type Ref, useContext, useId, useState } from 'react'
import { cx, describedBy } from '@monorithm/react/lib/cx'
import { useMoment } from '@monorithm/react/hooks/use-moment'
import { ChipCheck } from './chip.check'
import { ChipChevron } from './chip.chevron'
import { ChipGroupContext } from './chip.context'
import { chipBase, chipStates } from './chip.variants'

export type ChipVariant = 'filter' | 'menu'

interface CommonProps {
  /** The label: the name of the filter, for example "On sale" or "Size" (chip/name). */
  children: ReactNode
  disabled?: boolean
  /** The cause of the disabled state, for assistive technology (chip/disabled). */
  disabledReason?: string
  id?: string
  className?: string
  'aria-describedby'?: string
  ref?: Ref<HTMLButtonElement>
}

/** filter: a toggle button that turns one filter on or off. The default. */
export interface ChipFilterProps extends CommonProps {
  variant?: 'filter'
  /** The chip is on. With this prop, the app keeps the state. */
  pressed?: boolean
  /** The state at the start, when the app does not keep the state. */
  defaultPressed?: boolean
  /** Called at the change of the state, with the new state. The moment select comes first (chip/moment). */
  onPressedChange?: (pressed: boolean) => void
  value?: never
  separator?: never
  expanded?: never
  onClick?: never
}

/** menu: a button that opens a menu of values for one filter. */
export interface ChipMenuProps extends CommonProps {
  variant: 'menu'
  /** The value that applies, for example "Medium". The label shows "Size: Medium", and the chip is on (chip/menu-value). */
  value?: ReactNode
  /** The text between the label and the value. The default is ": ". Give the separator of the language of the app. */
  separator?: string
  /** The menu is open (chip/menu-role). */
  expanded?: boolean
  /** Called at the press. Open the menu here, 4 px from the chip (chip/menu). */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  pressed?: never
  defaultPressed?: never
  onPressedChange?: never
}

export type ChipProps = ChipFilterProps | ChipMenuProps

export function Chip(props: ChipProps) {
  return props.variant === 'menu' ? <MenuChip {...props} /> : <FilterChip {...props} />
}

/** The cause of the disabled state: hidden text that aria-describedby gives to assistive technology (chip/disabled). */
function Reason({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span id={id} hidden>
      {children}
    </span>
  )
}

function FilterChip({ children, pressed, defaultPressed, onPressedChange, disabled, disabledReason, id, className, ref, ...rest }: ChipFilterProps) {
  const emit = useMoment('chip')
  const reasonId = useId()
  const reason = disabled && disabledReason ? reasonId : undefined
  const [inner, setInner] = useState(defaultPressed ?? false)
  // chip/clear: a press on Clear filters sets the chip off. The change emits no moment (chip/menu-moment).
  const clears = useContext(ChipGroupContext)
  const [seen, setSeen] = useState(clears)
  if (seen !== clears) {
    setSeen(clears)
    setInner(false)
  }
  const on = pressed ?? inner
  return (
    <Toggle
      ref={ref}
      id={id}
      data-mono="chip"
      data-variant="filter"
      pressed={on}
      // chip/disabled: the chip stays in the focus order. Thus Base UI does not get the disabled prop: the chip cancels
      // the change itself. The data attribute stops the hover and the press styles.
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? '' : undefined}
      aria-describedby={describedBy(rest['aria-describedby'], reason)}
      onPressedChange={(next, details) => {
        if (disabled) {
          details.cancel()
          return
        }
        // chip/moment: the click comes at the release on the chip, or at Enter or Space. Not at pointer down.
        emit('select', next ? 'on' : 'off')
        if (pressed === undefined) setInner(next)
        onPressedChange?.(next)
      }}
      className={cx(chipBase, on ? chipStates.on : chipStates.off, className)}
    >
      {/* chip/on-sign: a filter chip that is on shows a check at the start side of the label. */}
      {on ? <ChipCheck /> : null}
      <span data-part="label">{children}</span>
      {reason ? <Reason id={reasonId}>{disabledReason}</Reason> : null}
    </Toggle>
  )
}

function MenuChip({ children, value, separator = ': ', expanded, onClick, disabled, disabledReason, id, className, ref, ...rest }: ChipMenuProps) {
  const reasonId = useId()
  const reason = disabled && disabledReason ? reasonId : undefined
  // chip/menu-value: a menu chip with a value is on. When no value applies, the chip is off.
  const on = value !== undefined && value !== null && value !== false && value !== ''
  return (
    <BaseButton
      ref={ref}
      id={id}
      data-mono="chip"
      data-variant="menu"
      // chip/menu-role: a button that opens a menu. The expanded state tells if the menu is open. A value sets pressed.
      aria-haspopup="menu"
      aria-expanded={expanded ?? false}
      aria-pressed={on}
      // chip/disabled: the chip stays in the focus order. Base UI stops the press.
      disabled={disabled}
      focusableWhenDisabled
      aria-describedby={describedBy(rest['aria-describedby'], reason)}
      // chip/menu-moment: a menu chip emits no moment. The menu emits open, select, and close.
      onClick={onClick}
      className={cx(chipBase, on ? chipStates.on : chipStates.off, className)}
    >
      {/* chip/name: the label names the filter and the value that applies, for example "Size: Medium". */}
      <span data-part="label">
        {children}
        {on ? (
          <>
            {separator}
            {value}
          </>
        ) : null}
      </span>
      {/* chip/menu-value: the chevron at the end side of the label, not a check. */}
      <ChipChevron />
      {reason ? <Reason id={reasonId}>{disabledReason}</Reason> : null}
    </BaseButton>
  )
}
