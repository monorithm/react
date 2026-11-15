// The look of the Menu (contract: ir/contracts/menu.json). The tokens of the density give the sizes, and
// --mono-menu-* gives the geometry (components.css). The trigger has the look of a button or of an icon button: it
// uses the classes of button/button.variants.ts. The states of an item set local custom properties, and one class reads
// them with a fallback for each. Thus two classes never set the same property.
import { buttonBase, buttonHeights, buttonPaddings, buttonVariants, type Size } from '../button/button.variants'
import { iconButtonWidths } from '../icon-button/icon-button.variants'
import { cx } from '@monorithm/react/lib/cx'
import { FOCUS } from '@monorithm/react/lib/row'

export type MenuTriggerVariant = 'ghost' | 'outline' | 'secondary'

/** The root: no box. The trigger is the box. The attribute data-mono gives the geometry to the trigger. */
export const menuRoot = 'contents'

/**
 * menu/trigger: while the menu is open, the trigger keeps its hover look. The values are the values of the hover
 * classes of buttonBase. The pressed classes have a higher specificity, thus a press keeps the pressed fill.
 */
const triggerOpen = [
  'data-[popup-open]:bg-[color:var(--btn-fill-hover,var(--btn-fill,transparent))]',
  'data-[popup-open]:border-[color:var(--btn-border-hover,var(--btn-border,transparent))]',
].join(' ')

/** The classes of the trigger: an icon button, or a button that shows the label (menu/trigger, menu/target). */
export function menuTrigger(iconOnly: boolean, variant: MenuTriggerVariant, size: Size): string {
  return iconOnly
    ? cx(
        buttonBase,
        'inline-flex p-0 rounded-mono-md',
        buttonVariants[variant],
        buttonHeights[size],
        iconButtonWidths[size],
        '[--btn-press:var(--mono-scale-press-icon)] [--btn-border-width:var(--mono-icon-button-border)]',
        triggerOpen,
      )
    : cx(
        buttonBase,
        'inline-flex rounded-mono-md',
        buttonVariants[variant],
        buttonHeights[size],
        buttonPaddings[size],
        size === 'sm' ? 'text-mono-small' : 'text-mono-body',
        '[--btn-press:var(--mono-scale-press)] [--btn-border-width:var(--mono-button-border)]',
        triggerOpen,
      )
}

/** The icon of an icon-button trigger: the icon size of the density. Assistive technology does not read it. */
export const menuTriggerIcon = 'inline-flex size-(--mono-size-icon) shrink-0 items-center justify-center [&>svg]:size-full'

/** The positioner: above the page. */
export const menuPositioner = 'z-(--mono-layer-popover) outline-none'

/** The menu: the raised surface (menu/surface, menu/density). It has no scrim. */
export const menuPopup = [
  'flex flex-col p-(--mono-menu-menu-padding) rounded-mono-lg bg-mono-raised shadow-mono-overlay outline-none',
  'text-mono-body text-mono-fg',
  // menu/surface and menu/wrap: 236 px wide or more. A long label makes the menu wider, until the edge of the window.
  'w-max min-w-(--mono-menu-menu-min-width) max-w-(--available-width)',
  'max-h-(--available-height) overflow-y-auto overscroll-contain',
  // menu/motion: the menu opens from the corner of the trigger.
  'origin-(--transform-origin) [transition-property:opacity,scale,translate]',
  // menu/motion: it moves into place and fades in for 150 ms with ease-out. It fades out for 100 ms with ease-in.
  '[transition-duration:var(--mono-duration-fast)] [transition-timing-function:var(--mono-easing-out)]',
  'data-[ending-style]:[transition-duration:var(--mono-duration-press)] data-[ending-style]:[transition-timing-function:var(--mono-easing-in)]',
  '[&[data-starting-style],&[data-ending-style]]:opacity-0',
  // menu/motion and menu/direction-motion: it starts 4 px nearer to the trigger, at scale 0.98. The move is vertical in
  // each reading direction. It closes with no move.
  'data-[side=bottom]:[--menu-from:calc(var(--mono-menu-open-offset)*-1)] data-[side=top]:[--menu-from:var(--mono-menu-open-offset)]',
  'data-[starting-style]:scale-[var(--menu-still-scale,var(--mono-scale-menu-in))]',
  'data-[starting-style]:translate-y-[var(--menu-still-move,var(--menu-from,0px))]',
  // menu/motion-reduced: no move and no scale. The fade stays.
  'motion-reduce:[--menu-still-scale:1] motion-reduce:[--menu-still-move:0px]',
  '[[data-motion=reduced]_&]:[--menu-still-scale:1] [[data-motion=reduced]_&]:[--menu-still-move:0px]',
].join(' ')

/** The fill of an item: one class reads the pressed fill, then the active fill (menu/focus, menu/hover). */
const itemBase = [
  'flex w-full min-h-(--mono-size-control-md) cursor-pointer select-none items-center outline-none',
  // menu/item: a padding of 8 px at the two sides, and the small radius. The vertical padding is the padding of the
  // menu: a label on two lines does not touch the edges of the item (menu/wrap).
  'px-(--mono-menu-item-padding) py-(--mono-menu-menu-padding) rounded-mono-sm text-start text-mono-body',
  'bg-[color:var(--mi-down,var(--mi-on,transparent))]',
  // menu/focus and menu/hover: the item with the focus, and the item at hover, have the active fill. Base UI gives
  // data-highlighted to the item with the focus, and a mouse on an item moves the focus to it.
  'data-[highlighted]:[--mi-on:var(--mi-active)] focus-visible:[--mi-on:var(--mi-active)] hover:[--mi-on:var(--mi-active)]',
  // menu/hover: with touch, the pressed fill at pointer down.
  'not-data-[disabled]:active:[--mi-down:var(--mi-pressed)]',
  // menu/hover and menu/motion-reduced: the fill changes in 150 ms. Reduced motion keeps the change of color.
  'transition-[background-color] duration-(--mono-duration-fast) ease-(--mono-easing-standard)',
  // menu/focus: with the keyboard, the item also shows the focus ring of the language.
  FOCUS,
  // menu/disabled: the content has the disabled opacity. The fill and the ring of the focus stay visible.
  'data-[disabled]:cursor-not-allowed data-[disabled]:*:opacity-(--mono-opacity-disabled)',
].join(' ')

/** An item, or the destructive item: the text color and the active fill (menu/item, menu/destructive). */
export function menuItem(destructive: boolean): string {
  return cx(
    itemBase,
    destructive
      ? 'text-mono-danger-text [--mi-active:var(--mono-color-role-danger-soft)] [--mi-pressed:var(--mono-color-role-danger-soft)]'
      : 'text-mono-fg [--mi-active:var(--mono-color-role-selected)] [--mi-pressed:var(--mono-color-role-pressed)]',
  )
}

/** The icon: the icon size of the density, 6 px from the label (menu/item, menu/density, menu/direction). */
export function menuItemIcon(destructive: boolean): string {
  return cx(
    'inline-flex size-(--mono-size-icon) shrink-0 items-center justify-center me-(--mono-menu-icon-gap) [&>svg]:size-full',
    // menu/item and menu/destructive: the muted text color, or the danger text color.
    destructive ? 'text-mono-danger-text' : 'text-mono-fg-muted',
  )
}

/** The label: it goes to a second line, and it does not truncate (menu/wrap, menu/no-truncate). */
export const menuItemLabel = 'min-w-0 flex-1 whitespace-normal [overflow-wrap:anywhere]'

/**
 * The key cap of the shortcut, at the end side, 8 px or more from the label (menu/shortcut, menu/shortcut-look). It
 * shows only in the Desktop layout: the breakpoint mono-desktop, 1,024 px (menu/shortcut-desktop).
 */
export const menuShortcut = [
  'hidden mono-desktop:inline-flex shrink-0 items-center justify-center ms-(--mono-menu-shortcut-gap)',
  'h-(--mono-menu-shortcut-height) min-w-(--mono-menu-shortcut-min-width) px-(--mono-menu-shortcut-padding)',
  'rounded-(--mono-menu-shortcut-radius) bg-mono-selected border-b-(length:--mono-menu-shortcut-line) border-mono-line-strong',
  // The language has no token for the mono font. The font-mono stack of Tailwind is the mono font.
  'font-mono text-(length:--mono-menu-shortcut-text) leading-none text-mono-fg-2',
].join(' ')

/** The group: the items of the group, with the label at its top (menu/group). */
export const menuGroup = 'flex flex-col'

/** The group label: the caption size and the muted text color. It is not a target (menu/group, menu/target). */
export const menuGroupLabel = [
  'pt-(--mono-menu-group-label-padding-top) px-(--mono-menu-group-label-padding-side) pb-(--mono-menu-group-label-padding-bottom)',
  'text-mono-caption text-mono-fg-muted select-none',
].join(' ')

/** The separator: 1 px in the subtle line color, 4 px above and below, to the edges of the menu (menu/separator). */
export const menuSeparator = [
  'shrink-0 h-(--mono-menu-separator-height) my-(--mono-menu-separator-margin) -mx-(--mono-menu-menu-padding)',
  'bg-mono-line-subtle',
].join(' ')

// The action sheet (menu/action-sheet-look, menu/action-sheet-rows, menu/action-sheet-motion). The open and the close
// read local custom properties with a fallback: reduced motion sets them.
const sheetMotion = [
  // menu/action-sheet-motion: in for 320 ms with ease-out, out for 200 ms with ease-in.
  '[transition-duration:var(--ms-in,var(--mono-duration-sheet))] [transition-timing-function:var(--mono-easing-out)]',
  'data-[ending-style]:[transition-duration:var(--ms-out,var(--mono-duration-base))] data-[ending-style]:[transition-timing-function:var(--mono-easing-in)]',
  // menu/action-sheet-motion: with reduced motion, in for 150 ms and out for 100 ms.
  'motion-reduce:[--ms-in:var(--mono-duration-fast)] motion-reduce:[--ms-out:var(--mono-duration-press)]',
  '[[data-motion=reduced]_&]:[--ms-in:var(--mono-duration-fast)] [[data-motion=reduced]_&]:[--ms-out:var(--mono-duration-press)]',
].join(' ')

/** The scrim: the dark layer behind the action sheet. It fades in and out (menu/action-sheet-close). */
export const sheetScrim = cx(
  'fixed inset-0 z-(--mono-layer-dialog) bg-mono-scrim transition-opacity [&[data-starting-style],&[data-ending-style]]:opacity-0',
  sheetMotion,
)

/** The action sheet: a modal panel at the bottom edge (menu/action-sheet, menu/action-sheet-look). */
export const sheetPopup = cx(
  'fixed inset-x-0 bottom-0 z-(--mono-layer-dialog) flex max-h-dvh flex-col overflow-y-auto overscroll-contain outline-none',
  // menu/action-sheet-look: the raised fill, the overlay shadow, and a radius of 16 px at the top corners.
  'rounded-t-mono-xl bg-mono-raised shadow-mono-overlay text-mono-body text-mono-fg',
  // menu/action-sheet-rows: a padding of 8 px. The last item is above the bottom safe area.
  'pt-(--mono-menu-sheet-handle-top) px-(--mono-menu-sheet-padding)',
  'pb-[calc(var(--mono-menu-sheet-padding)+env(safe-area-inset-bottom,0px))]',
  // menu/action-sheet-motion and menu/direction-motion: it comes up from the bottom edge in each reading direction.
  // With reduced motion, it has no slide and it fades.
  '[transition-property:translate,opacity]',
  'data-[starting-style]:translate-y-[var(--ms-slide,100%)] data-[ending-style]:translate-y-[var(--ms-slide,100%)]',
  '[&[data-starting-style],&[data-ending-style]]:opacity-[var(--ms-fade,1)]',
  'motion-reduce:[--ms-slide:0px] motion-reduce:[--ms-fade:0] [[data-motion=reduced]_&]:[--ms-slide:0px] [[data-motion=reduced]_&]:[--ms-fade:0]',
  sheetMotion,
)

/** The handle: 36 px wide, 4 px high, in the strong line color, 8 px from the top edge (menu/action-sheet-look). */
export const sheetHandle = [
  'mx-auto mb-(--mono-menu-sheet-handle-gap) shrink-0 h-(--mono-menu-sheet-handle-height) w-(--mono-menu-sheet-handle-width)',
  'rounded-mono-full bg-mono-line-strong',
].join(' ')

/** The items of the action sheet, and the items of one group: a gap of 2 px (menu/action-sheet-rows). */
export const sheetList = 'flex flex-col gap-(--mono-menu-sheet-gap)'

/**
 * The separator of the action sheet: to the edges of the sheet (menu/separator, menu/action-sheet-items). The gap of the
 * items is a part of the 4 px above and below it.
 */
export const sheetSeparator = [
  'shrink-0 h-(--mono-menu-separator-height) -mx-(--mono-menu-sheet-padding)',
  'my-[calc(var(--mono-menu-separator-margin)-var(--mono-menu-sheet-gap))]',
  'bg-mono-line-subtle',
].join(' ')

/** The close button of the action sheet, for assistive technology only. The scrim is the close target on the screen. */
export const sheetClose = 'sr-only'
