// The trigger of the Menu (contract: ir/contracts/menu.json): a button or an icon button. The menu gives these props to
// the trigger of Base UI Menu, and the action sheet gives them to the trigger of Base UI Dialog. Base UI adds the
// popup attributes: aria-haspopup, aria-expanded, and aria-controls (menu/role).
import type { ReactNode } from 'react'
import type { Size } from '../button/button.variants'
import { cx, describedBy } from '@monorithm/react/lib/cx'
import { menuTrigger, menuTriggerIcon, type MenuTriggerVariant } from './menu.variants'

export interface MenuTriggerOptions {
  id: string
  label: string
  icon?: ReactNode
  variant?: MenuTriggerVariant
  size: Size
  disabled?: boolean
  /** The id of the cause of the disabled state, or undefined. */
  reasonId?: string
  describedBy?: string
  className?: string
}

/** The props of the trigger element. */
export function menuTriggerProps({ id, label, icon, variant, size, disabled, reasonId, className, ...rest }: MenuTriggerOptions) {
  const iconOnly = icon !== undefined && icon !== null
  return {
    id,
    // The geometry of the look: the trigger has the look of a button or of an icon button (menu/trigger).
    'data-mono': iconOnly ? 'icon-button' : 'button',
    'data-part': 'trigger',
    'data-variant': variant ?? (iconOnly ? 'ghost' : 'secondary'),
    'data-size': size,
    // menu/disabled-trigger: the trigger stays in the focus order. The menu refuses to open (menu.tsx).
    'data-disabled': disabled ? '' : undefined,
    'aria-disabled': disabled || undefined,
    // menu/name: a trigger with only an icon has the label as its text name.
    'aria-label': iconOnly ? label : undefined,
    'aria-describedby': describedBy(rest.describedBy, reasonId),
    className: cx(menuTrigger(iconOnly, variant ?? (iconOnly ? 'ghost' : 'secondary'), size), className),
    children: iconOnly ? (
      <span aria-hidden="true" data-part="icon" className={menuTriggerIcon}>
        {icon}
      </span>
    ) : (
      <span data-part="label">{label}</span>
    ),
  }
}
