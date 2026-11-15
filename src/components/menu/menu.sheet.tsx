// The action sheet of the Menu (contract: ir/contracts/menu.json): on a phone, the menu opens as a modal panel at the
// bottom edge, with the same items (menu/action-sheet, menu/action-sheet-items). Base UI Dialog gives the modal
// dialog, the focus trap, Escape, the press on the scrim, and the return of the focus to the trigger
// (menu/action-sheet-role, menu/action-sheet-close). The sheet has no drag: the draggable sheet is the Bottom sheet.
import { Dialog } from '@base-ui/react/dialog'
import { Fragment, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { Moment } from '@monorithm/react/lib/moments'
import { axesOf, NO_AXES } from './menu.axes'
import { type MenuGroup, type MenuItem, MenuItemContent, MenuItemReason } from './menu.item'
import type { menuTriggerProps } from './menu.trigger'
import { menuGroupLabel, menuItem, sheetClose, sheetHandle, sheetList, sheetPopup, sheetScrim, sheetSeparator } from './menu.variants'
import { tokens } from '@monorithm/react/tokens/values'

/**
 * The media of the action sheet: a width of less than 768 px (menu/action-sheet). The contract gives the width. The
 * language has no token for it, and a media query cannot read a custom property.
 */
export const SHEET_MEDIA = `(width < ${tokens['breakpoint.tablet'].value.value}px)`

const sheetQuery = (): MediaQueryList | undefined =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(SHEET_MEDIA) : undefined

function subscribe(onChange: () => void): () => void {
  const query = sheetQuery()
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}

/**
 * True at a width of less than 768 px (menu/action-sheet). A tablet is wider: its menu opens at the trigger
 * (menu/tablet). The server and the first render of the client give false. Thus the hydration matches.
 */
export function useActionSheet(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => sheetQuery()?.matches === true,
    () => false,
  )
}

export interface MenuSheetProps {
  /** The name of the menu: the name of the trigger (menu/action-sheet-role). */
  label: string
  trigger: ReturnType<typeof menuTriggerProps>
  groups: readonly MenuGroup[]
  destructive?: MenuItem
  open: boolean
  setOpen: (open: boolean) => void
  emit: (moment: Moment) => void
  /** The name of the close button for assistive technology. */
  closeLabel: string
}

export function MenuSheet({ label, trigger, groups, destructive, open, setOpen, emit, closeLabel }: MenuSheetProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [axes, setAxes] = useState(NO_AXES)
  // The sheet in the portal gets the axes of the trigger before the first frame.
  useLayoutEffect(() => {
    if (open) setAxes(axesOf(triggerRef.current))
  }, [open])
  const select = (item: MenuItem) => {
    if (item.disabled) return
    // menu/moment: select comes before close.
    emit('select')
    item.onSelect?.()
    setOpen(false)
  }
  return (
    <Dialog.Root open={open} onOpenChange={(next) => setOpen(next)} triggerId={trigger.id}>
      <Dialog.Trigger ref={triggerRef} {...trigger} />
      <Dialog.Portal
        data-mono="menu"
        data-theme={axes.theme}
        // menu/action-sheet-rows: each item of the action sheet has the touch height, 44 px.
        data-density="touch"
        data-motion={axes.motion}
        // menu/direction-motion: the sheet comes up from the bottom edge in each reading direction.
        dir={axes.dir}
      >
        <Dialog.Backdrop data-part="scrim" className={sheetScrim} />
        {/* menu/action-sheet-role: a modal dialog with the name of the menu. Base UI makes the page behind it inert. */}
        <Dialog.Popup data-part="action-sheet" aria-label={label} aria-modal="true" className={sheetPopup}>
          <div aria-hidden="true" data-part="handle" className={sheetHandle} />
          <div data-part="items" className={sheetList}>
            {groups.map((group, g) => (
              <Fragment key={g}>
                {g > 0 ? <div role="separator" data-part="separator" className={sheetSeparator} /> : null}
                <SheetGroup group={group} select={select} />
              </Fragment>
            ))}
            {/* menu/action-sheet-items: the destructive item stays last, after a separator. */}
            {destructive ? (
              <>
                <div role="separator" data-part="separator" className={sheetSeparator} />
                <SheetItem item={destructive} destructive select={select} />
              </>
            ) : null}
          </div>
          {/* The close button is for a screen reader on a touch screen: it cannot press the scrim. The keyboard has
              Escape, thus the button is not in the focus order. */}
          <Dialog.Close data-part="close" tabIndex={-1} className={sheetClose}>
            {closeLabel}
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function SheetGroup({ group, select }: { group: MenuGroup; select: (item: MenuItem) => void }) {
  const labelId = useId()
  const items = group.items.map((item, i) => <SheetItem key={i} item={item} destructive={false} select={select} />)
  if (!group.label) return <>{items}</>
  return (
    <div role="group" aria-labelledby={labelId} data-part="group" className={sheetList}>
      <div id={labelId} data-part="group-label" className={menuGroupLabel}>
        {group.label}
      </div>
      {items}
    </div>
  )
}

function SheetItem({ item, destructive, select }: { item: MenuItem; destructive: boolean; select: (item: MenuItem) => void }) {
  const labelId = useId()
  const reasonId = useId()
  return (
    <button
      type="button"
      data-part={destructive ? 'destructive-item' : 'item'}
      // menu/disabled: a disabled item stays in the focus order and does not start its action.
      data-disabled={item.disabled ? '' : undefined}
      aria-disabled={item.disabled || undefined}
      aria-labelledby={labelId}
      aria-describedby={item.disabled && item.disabledReason ? reasonId : undefined}
      onClick={() => select(item)}
      className={menuItem(destructive)}
    >
      {/* menu/shortcut-desktop: the action sheet shows no shortcut. */}
      <MenuItemContent item={item} labelId={labelId} destructive={destructive} shortcut={false} />
      <MenuItemReason item={item} id={reasonId} />
    </button>
  )
}
