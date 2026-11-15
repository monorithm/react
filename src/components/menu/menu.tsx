// The Menu of the language (contract: ir/contracts/menu.json). A button opens a list of the actions of an item, 4 px
// from the button. At a width of less than 768 px, the same items open in an action sheet (menu.sheet.tsx). Base UI
// Menu gives the behavior and the accessibility of the menu: the roles, the keys, the typeahead, the focus, and the
// position. The tokens and the geometry of the contract give the look (menu.variants.ts, components.css).
import { DirectionProvider } from '@base-ui/react/direction-provider'
import { Menu as Base } from '@base-ui/react/menu'
import { Fragment, type ReactNode, useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
import { useMoment } from '@monorithm/react/hooks/use-moment'
import type { Moment } from '@monorithm/react/lib/moments'
import type { Size } from '../button/button.variants'
import { axesOf, NO_AXES } from './menu.axes'
import { type MenuGroup, type MenuItem, MenuItemContent, MenuItemReason } from './menu.item'
import { MenuSheet, useActionSheet } from './menu.sheet'
import { menuTriggerProps } from './menu.trigger'
import { menuGroup, menuGroupLabel, menuItem, menuPopup, menuPositioner, menuRoot, menuSeparator, type MenuTriggerVariant } from './menu.variants'

/** The container of the items: the menu at the trigger, or the action sheet at the bottom edge (menu/surfaces). */
export type MenuContainer = 'menu' | 'action-sheet'

interface CommonProps {
  /** The name of the trigger: "Product actions" (menu/name). The menu and the action sheet have this name too. */
  label: string
  /**
   * The icon of the trigger, for example three dots. With an icon, the trigger is an icon button and the label is its
   * text name for assistive technology. With no icon, the trigger is a button that shows the label (menu/trigger).
   */
  icon?: ReactNode
  /** The variant of the trigger. The default is ghost for an icon button and secondary for a button. */
  variant?: MenuTriggerVariant
  /** The size of the trigger. */
  size?: Size
  /**
   * The item that removes data, in the danger text color: "Delete product". It is the last item, after a separator
   * (menu/destructive, menu/destructive-sign).
   */
  destructive?: MenuItem
  /**
   * The container of the items. With no value, the action sheet at a width of less than 768 px, and the menu at the
   * trigger on a larger screen (menu/action-sheet, menu/tablet).
   */
  container?: MenuContainer
  /** A disabled trigger stays in the focus order, and its menu does not open (menu/disabled-trigger). */
  disabled?: boolean
  /** The cause of the disabled state, for assistive technology: "Publish the product first" (menu/disabled-trigger). */
  disabledReason?: string
  /** The menu is open at the first render. */
  defaultOpen?: boolean
  /** Called when the menu opens or closes. The moments open and close come first (menu/moment). */
  onOpenChange?: (open: boolean) => void
  /** The name of the close button of the action sheet, for assistive technology. The default is "Close". */
  closeLabel?: string
  /** The id of the trigger. */
  id?: string
  /** The classes of the trigger. */
  className?: string
  'aria-describedby'?: string
}

/** The items: one group with no name, or groups. A separator divides two groups (menu/group, menu/separator). */
export type MenuProps = CommonProps &
  ({ items: readonly MenuItem[]; groups?: undefined } | { groups: readonly MenuGroup[]; items?: undefined })

export function Menu(props: MenuProps) {
  const { label, size = 'md', disabled, onOpenChange } = props
  const emit = useMoment('menu')
  const autoId = useId()
  const triggerId = props.id ?? autoId
  const reasonId = useId()
  const reason = disabled && props.disabledReason ? reasonId : undefined
  const phone = useActionSheet()
  const container = props.container ?? (phone ? 'action-sheet' : 'menu')
  const groups: readonly MenuGroup[] = props.groups ?? [{ items: props.items }]

  const [open, setOpenState] = useState(props.defaultOpen === true && !disabled)
  const isOpen = useRef(open)
  const setOpen = useCallback(
    (next: boolean) => {
      // menu/disabled-trigger: the menu of a disabled trigger does not open. menu/moment-trigger: thus no moment.
      if (next && disabled) return
      if (isOpen.current === next) return
      isOpen.current = next
      // menu/moment and menu/moment-trigger: open when the menu opens, close when it closes. A press on the trigger
      // emits no moment press.
      emit(next ? 'open' : 'close')
      setOpenState(next)
      onOpenChange?.(next)
    },
    [disabled, emit, onOpenChange],
  )

  const trigger = menuTriggerProps({
    id: triggerId,
    label,
    icon: props.icon,
    variant: props.variant,
    size,
    disabled,
    reasonId: reason,
    describedBy: props['aria-describedby'],
    className: props.className,
  })
  const shared = { label, trigger, groups, destructive: props.destructive, open, setOpen, emit }

  return (
    <span data-mono="menu" data-container={container} className={menuRoot}>
      {/* menu/surfaces: the two containers show the same items, in the same order, with the same actions. */}
      {container === 'action-sheet' ? <MenuSheet {...shared} closeLabel={props.closeLabel ?? 'Close'} /> : <MenuPopover {...shared} />}
      {reason ? (
        <span id={reasonId} hidden>
          {props.disabledReason}
        </span>
      ) : null}
    </span>
  )
}

interface PopoverProps {
  trigger: ReturnType<typeof menuTriggerProps>
  groups: readonly MenuGroup[]
  destructive?: MenuItem
  open: boolean
  setOpen: (open: boolean) => void
  emit: (moment: Moment) => void
}

function MenuPopover({ trigger, groups, destructive, open, setOpen, emit }: PopoverProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [axes, setAxes] = useState(NO_AXES)
  // The menu in the portal gets the axes of the trigger before the first frame.
  useLayoutEffect(() => {
    if (open) setAxes(axesOf(triggerRef.current))
  }, [open])
  return (
    <Base.Root open={open} onOpenChange={(next) => setOpen(next)} triggerId={trigger.id}>
      <Base.Trigger ref={triggerRef} {...trigger} />
      {/* menu/direction: in right-to-left, the start edge is the right edge of the trigger. */}
      <DirectionProvider direction={axes.dir}>
        <Base.Portal>
          <Base.Positioner
            data-mono="menu"
            data-theme={axes.theme}
            data-density={axes.density}
            data-motion={axes.motion}
            dir={axes.dir}
            // menu/position: 4 px below the trigger, at its start edge. If the menu does not fit below, 4 px above it.
            side="bottom"
            align="start"
            sideOffset={axes.offset}
            // menu/position-flip: if the menu does not fit at the start edge, it aligns with the end edge. Then it moves
            // inside the window.
            collisionAvoidance={{ side: 'flip', align: 'flip', fallbackAxisSide: 'none' }}
            className={menuPositioner}
          >
            <Base.Popup data-part="menu" className={menuPopup}>
              {groups.map((group, g) => (
                <Fragment key={g}>
                  {g > 0 ? <Base.Separator data-part="separator" className={menuSeparator} /> : null}
                  <PopoverGroup group={group} emit={emit} />
                </Fragment>
              ))}
              {/* menu/destructive: the destructive item is the last item, after a separator. */}
              {destructive ? (
                <>
                  <Base.Separator data-part="separator" className={menuSeparator} />
                  <PopoverItem item={destructive} destructive emit={emit} />
                </>
              ) : null}
            </Base.Popup>
          </Base.Positioner>
        </Base.Portal>
      </DirectionProvider>
    </Base.Root>
  )
}

function PopoverGroup({ group, emit }: { group: MenuGroup; emit: (moment: Moment) => void }) {
  const items = group.items.map((item, i) => <PopoverItem key={i} item={item} destructive={false} emit={emit} />)
  if (!group.label) return <>{items}</>
  // menu/item-name: the accessibility tree shows the group with its label as its name.
  return (
    <Base.Group data-part="group" className={menuGroup}>
      <Base.GroupLabel data-part="group-label" className={menuGroupLabel}>
        {group.label}
      </Base.GroupLabel>
      {items}
    </Base.Group>
  )
}

function PopoverItem({ item, destructive, emit }: { item: MenuItem; destructive: boolean; emit: (moment: Moment) => void }) {
  const labelId = useId()
  const reasonId = useId()
  return (
    <Base.Item
      label={item.label}
      // menu/disabled: Base UI stops the action. The arrow keys can move the focus to the item.
      disabled={item.disabled}
      // menu/role and menu/item-name: the label is the name, and the item tells its shortcut.
      aria-labelledby={labelId}
      aria-keyshortcuts={item.shortcut}
      aria-describedby={item.disabled && item.disabledReason ? reasonId : undefined}
      data-part={destructive ? 'destructive-item' : 'item'}
      onClick={() => {
        if (item.disabled) return
        // menu/moment: select comes at the choice of the item. Then Base UI closes the menu: close comes after select.
        emit('select')
        item.onSelect?.()
      }}
      className={menuItem(destructive)}
    >
      <MenuItemContent item={item} labelId={labelId} destructive={destructive} shortcut />
      <MenuItemReason item={item} id={reasonId} />
    </Base.Item>
  )
}
