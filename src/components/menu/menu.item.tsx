// An item of the Menu (contract: ir/contracts/menu.json): the data of an item and of a group, and the content of an
// item. The menu and the action sheet show the same content (menu/surfaces, menu/action-sheet-items).
import type { ReactNode } from 'react'
import { menuItemIcon, menuItemLabel, menuShortcut } from './menu.variants'

/** One action of the menu. */
export interface MenuItem {
  /** The action, as a verb: "Edit", "Duplicate", "Share link" (menu/name). Typeahead finds an item by its label. */
  label: string
  /** An icon at the start side of the label. Assistive technology does not read it (menu/item-name). */
  icon?: ReactNode
  /**
   * The key of the action, for example "E", in a key cap at the end side (menu/shortcut). Only the Desktop layout shows
   * it, and the action sheet does not show it (menu/shortcut-desktop). Assistive technology reads it with the label.
   */
  shortcut?: string
  /** A disabled item does not start its action. The arrow keys can move the focus to it (menu/disabled). */
  disabled?: boolean
  /** The cause of the disabled state, for assistive technology: "Publish the product first" (menu/disabled). */
  disabledReason?: string
  /**
   * The action. The moment select comes first, then the menu closes (menu/moment). If the user cannot undo the action
   * of a destructive item, open a dialog to confirm it (menu/confirm).
   */
  onSelect?: () => void
}

/** Items that go together. A separator divides two groups (menu/group, menu/separator). */
export interface MenuGroup {
  /** The name of the group, at its top. Example: the name of the product (menu/group). */
  label?: string
  items: readonly MenuItem[]
}

interface ContentProps {
  item: MenuItem
  /** The id of the label: the label is the accessible name of the item (menu/role). */
  labelId: string
  destructive: boolean
  /** The action sheet shows no shortcut (menu/shortcut-desktop). */
  shortcut: boolean
}

/** The icon, the label, and the shortcut of an item (menu/item, menu/shortcut, menu/direction). */
export function MenuItemContent({ item, labelId, destructive, shortcut }: ContentProps) {
  return (
    <>
      {item.icon ? (
        <span aria-hidden="true" data-part="icon" className={menuItemIcon(destructive)}>
          {item.icon}
        </span>
      ) : null}
      <span id={labelId} data-part="label" className={menuItemLabel}>
        {item.label}
      </span>
      {/* menu/item-name: the item tells its shortcut with aria-keyshortcuts. Thus the key cap is hidden. */}
      {shortcut && item.shortcut ? (
        <kbd aria-hidden="true" data-part="shortcut" className={menuShortcut}>
          {item.shortcut}
        </kbd>
      ) : null}
    </>
  )
}

/** The cause of a disabled item, for its description (menu/disabled). */
export function MenuItemReason({ item, id }: { item: MenuItem; id: string }) {
  return item.disabled && item.disabledReason ? (
    <span id={id} hidden>
      {item.disabledReason}
    </span>
  ) : null
}
