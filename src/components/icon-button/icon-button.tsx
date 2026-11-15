// The Icon button of the language (contract: ir/contracts/icon-button.json). It shares the look of the Button
// (button/button.variants.ts). It is square: the width is the height of its size.
import { Button as Base } from '@base-ui/react/button'
import { type MouseEvent, type ReactNode, type Ref, useId } from 'react'
import type { ButtonNativeProps } from '../button/button'
import { buttonBase, buttonHeights, buttonVariants, type Size } from '../button/button.variants'
import { iconButtonWidths } from './icon-button.variants'
import { cx, describedBy } from '@monorithm/react/lib/cx'
import { useMoment } from '@monorithm/react/hooks/use-moment'

export interface IconButtonProps extends ButtonNativeProps {
  /** The accessible name: the action, for example "Search". The icon is not the name (icon-button/name). */
  label: string
  /** The icon. Assistive technology does not read it (icon-button/icon). */
  icon: ReactNode
  /** ghost for toolbars (the default). round only for search and for the account (icon-button/round). */
  variant?: 'ghost' | 'outline' | 'secondary' | 'round'
  size?: Size
  /**
   * A dot badge that shows new items. The text goes into the accessible name, for example "New items" gives the name
   * "Notifications, New items" (icon-button/badge).
   */
  badge?: string
  disabled?: boolean
  /** The cause of the disabled state, for assistive technology (icon-button/disabled). */
  disabledReason?: string
  type?: 'button' | 'submit' | 'reset'
  /** Called at the press. The moment press comes first (icon-button/moment). */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  id?: string
  className?: string
  'aria-describedby'?: string
  ref?: Ref<HTMLButtonElement>
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'md',
  badge,
  disabled,
  disabledReason,
  type = 'button',
  onClick,
  id,
  className,
  ref,
  'aria-describedby': describedByProp,
  // The other attributes (for example the attributes of a trigger) go to the element.
  ...native
}: IconButtonProps) {
  const emit = useMoment('icon-button')
  const reasonId = useId()
  const reason = disabled && disabledReason ? reasonId : undefined
  return (
    <Base
      {...native}
      ref={ref}
      id={id}
      data-mono="icon-button"
      data-variant={variant}
      data-size={size}
      type={type}
      aria-label={badge ? `${label}, ${badge}` : label}
      disabled={disabled}
      focusableWhenDisabled
      aria-describedby={describedBy(describedByProp, reason)}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        emit('press')
        onClick?.(event)
      }}
      className={cx(
        buttonBase,
        'inline-flex p-0',
        buttonVariants[variant],
        buttonHeights[size],
        iconButtonWidths[size],
        variant === 'round' ? 'rounded-mono-full' : 'rounded-mono-md',
        '[--btn-press:var(--mono-scale-press-icon)] [--btn-border-width:var(--mono-icon-button-border)]',
        className,
      )}
    >
      <span aria-hidden="true" data-part="icon" className="inline-flex size-(--mono-size-icon) items-center justify-center [&>svg]:size-full">
        {icon}
      </span>
      {badge ? (
        <span
          aria-hidden="true"
          data-part="badge"
          className={cx(
            'absolute top-(--mono-icon-button-badge-inset) inset-e-(--mono-icon-button-badge-inset) size-(--mono-icon-button-badge-size)',
            'rounded-mono-full bg-mono-accent shadow-[0_0_0_var(--mono-icon-button-badge-ring)_var(--mono-color-role-bg)]',
          )}
        />
      ) : null}
      {reason ? (
        <span id={reasonId} hidden>
          {disabledReason}
        </span>
      ) : null}
    </Base>
  )
}
