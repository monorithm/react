// The look of the Select (contract: ir/contracts/select.json). The trigger has the look of the input of a text field,
// with the same tokens. The text field has its own folder: this file has the field classes that the Select needs.
// Each size comes from the tokens of the density and from --mono-select-* (components.css).
// The states of the trigger set local custom properties, and one class reads them with a fallback for each. Thus two
// classes never set the same property.
import { cx } from '@monorithm/react/lib/cx'
import { FOCUS } from '@monorithm/react/lib/row'

export type SelectSize = 'sm' | 'md' | 'lg'

/** The field: the label, the trigger, and the help text or the error, 6 px apart (select/name, select/help). */
export const selectField = 'flex w-full min-w-0 flex-col gap-(--mono-select-field-gap) text-mono-body'

/** The label: the small size and the second text color (select/name). The name has the strong weight. */
export const selectLabel = 'text-mono-small text-mono-fg-2'
export const selectLabelName = 'font-mono-strong'
/** The word optional after the label: the regular weight and the muted text color (select/name). */
export const selectOptional = 'text-mono-fg-muted'

/** The height of the trigger for each size, from the density (select/size). */
export const selectHeights: Record<SelectSize, string> = {
  sm: 'h-(--mono-size-control-sm)',
  md: 'h-(--mono-size-control-md)',
  lg: 'h-(--mono-size-control-lg)',
}

/** The trigger: the look of the input of a text field (select/trigger). */
const triggerBase = [
  'relative flex w-full min-w-0 items-center gap-(--mono-select-chevron-gap) outline-none select-none',
  // select/direction: the padding is on the logical sides. The value is at the start side, the chevron at the end side.
  'ps-(--mono-select-trigger-padding) text-start text-mono-body',
  'rounded-mono-md border-(length:--mono-select-trigger-border)',
  // select/trigger, select/hover, select/focus, and select/error: the border color. The error comes first, then the
  // focus, then the hover, then the field line.
  'border-[color:var(--sel-error,var(--sel-focus,var(--sel-hover,var(--mono-color-role-field-line))))]',
  // select/focus: the soft ring of 3 px. It is transparent until the trigger has the focus or the list is open.
  '[box-shadow:0_0_0_var(--mono-focus-field-ring-width)_var(--sel-ring,transparent)]',
  '[&:is(:focus,[data-popup-open])]:[--sel-focus:var(--mono-color-role-ring)]',
  '[&:is(:focus,[data-popup-open])]:[--sel-ring:var(--sel-tint)]',
  // select/hover and select/motion-reduced: the border and the ring change color in 150 ms. Reduced motion keeps it.
  'transition-[border-color,box-shadow] duration-(--mono-duration-fast) ease-(--mono-easing-standard)',
  // select/target: the full trigger, with its border, is the target. A small trigger in the touch density extends it
  // to 44 px.
  "after:absolute after:-inset-x-(--mono-select-trigger-border) after:top-1/2 after:-translate-y-1/2 after:content-['']",
  'after:h-[calc(100%+var(--mono-select-trigger-border)*2)]',
  'after:min-h-(--mono-size-target-min)',
].join(' ')

/** The states of the trigger that the component selects (select/disabled, select/error, select/hover). */
const triggerEnabled =
  'cursor-pointer bg-mono-surface hover:[--sel-hover:var(--mono-color-role-fg-muted)]'
const triggerDisabled = 'cursor-not-allowed bg-mono-bg opacity-(--mono-opacity-disabled)'
const triggerValid = '[--sel-tint:var(--mono-color-role-accent-soft)]'
// select/error and select/error-motion: the danger border, and with the focus, the soft ring in the danger tint.
const triggerInvalid = '[--sel-error:var(--mono-color-role-danger)] [--sel-tint:var(--mono-color-role-danger-soft)]'

/** The classes of the trigger for a size and the states. The native select and the list trigger share them. */
export const selectTrigger = (size: SelectSize, invalid: boolean, disabled: boolean): string =>
  cx(triggerBase, selectHeights[size], disabled ? triggerDisabled : triggerEnabled, invalid ? triggerInvalid : triggerValid)

/** The end padding of the list trigger: the chevron inset (select/trigger). */
export const selectTriggerEnd = 'pe-(--mono-select-chevron-inset)'
/** The end padding of the native select: the chevron is on top of it, thus the padding keeps space for it. */
export const selectNativeEnd =
  'appearance-none pe-[calc(var(--mono-select-chevron-inset)+var(--mono-size-icon)+var(--mono-select-chevron-gap))]'

/** The value: the name of the selected option, or the placeholder in the muted text color (select/trigger). */
export const selectValue = 'min-w-0 flex-1 truncate text-mono-fg data-[placeholder]:text-mono-fg-muted'

/** The chevron: the icon size of the density and the muted text color (select/density, select/trigger). */
export const selectChevron =
  'pointer-events-none inline-flex size-(--mono-size-icon) shrink-0 items-center justify-center text-mono-fg-muted [&>svg]:size-full'
/** The chevron of the native select: on top of the select, at the border and the chevron inset from the end side. */
export const selectNativeChevron =
  'absolute end-[calc(var(--mono-select-chevron-inset)+var(--mono-select-trigger-border))] top-1/2 -translate-y-1/2'

/** The help text: one line below the trigger (select/help). */
export const selectHelp = 'text-mono-small text-mono-fg-muted'
/** The error: the icon and the text in the danger text color. It fades in, with no shake (select/error-motion). */
export const selectError = [
  'flex items-start gap-(--mono-select-error-gap) text-mono-small text-mono-danger-text',
  'transition-opacity duration-(--mono-duration-fast) ease-(--mono-easing-standard) starting:opacity-0',
].join(' ')
/** The error icon: 14 px, centered on the first line of the error text (select/error). */
export const selectErrorIcon = 'flex h-lh shrink-0 items-center [&>svg]:size-(--mono-select-error-icon)'

/** The positioner: above the page. */
export const selectPositioner = 'z-(--mono-layer-popover) outline-none'

/** The list: the raised surface (select/list). It is as wide as the trigger or wider. */
export const selectPopup = [
  'min-w-(--anchor-width) overflow-hidden rounded-mono-lg bg-mono-raised text-mono-body shadow-mono-overlay outline-none',
  // select/motion: the list opens from the edge of the trigger.
  'origin-(--transform-origin) [transition-property:opacity,scale,translate]',
  // select/motion: it moves into place and fades in for 150 ms with ease-out. It fades out for 100 ms with ease-in.
  '[transition-duration:var(--sel-duration,var(--mono-duration-fast))]',
  '[transition-timing-function:var(--sel-easing,var(--mono-easing-out))]',
  'data-[ending-style]:[--sel-duration:var(--mono-duration-press)] data-[ending-style]:[--sel-easing:var(--mono-easing-in)]',
  '[&[data-starting-style],&[data-ending-style]]:opacity-0',
  // select/motion: it starts 4 px nearer to the trigger, at scale 0.98. It closes with no move.
  'data-[side=bottom]:[--sel-from:calc(var(--mono-select-open-offset)*-1)] data-[side=top]:[--sel-from:var(--mono-select-open-offset)]',
  'data-[starting-style]:scale-[var(--sel-still-scale,var(--mono-scale-menu-in))]',
  'data-[starting-style]:translate-y-[var(--sel-still-move,var(--sel-from,0px))]',
  // select/motion-reduced: no move and no scale. The fade stays.
  'motion-reduce:[--sel-still-scale:1] motion-reduce:[--sel-still-move:0px]',
  '[[data-motion=reduced]_&]:[--sel-still-scale:1] [[data-motion=reduced]_&]:[--sel-still-move:0px]',
].join(' ')

/** The scroll area of the list: eight options and the padding, then the other options scroll (select/max-height). */
export const selectList = [
  'overflow-y-auto overscroll-contain p-(--mono-select-list-padding) outline-none scroll-py-(--mono-select-list-padding)',
  '[--sel-list-max:calc(var(--mono-select-list-max-height)+var(--mono-select-list-padding)*2)]',
  'max-h-[min(var(--sel-list-max),var(--available-height,var(--sel-list-max)))]',
].join(' ')

/** An option: the medium height, the small radius, and the option padding (select/target). */
export const selectOption = [
  'flex w-full min-h-(--mono-size-control-md) cursor-pointer select-none items-center gap-(--mono-select-option-gap)',
  'px-(--mono-select-option-padding) py-(--mono-select-option-padding-block) rounded-mono-sm text-mono-body',
  // select/active-option and select/hover: the active option and the option at hover have the selected fill.
  'data-[highlighted]:bg-mono-selected',
  // select/active-option: with the keyboard, the active option also shows the focus ring of the language.
  FOCUS,
  'data-[disabled]:cursor-not-allowed',
].join(' ')
/** The text of an option: the name, and the description below it. */
export const selectOptionText = 'flex min-w-0 flex-1 flex-col'
/** The name of an option. The selected option has the strong weight and the strong text color (select/selected-sign). */
export const selectOptionName = [
  'text-mono-fg in-data-[selected]:font-mono-strong in-data-[selected]:text-mono-fg-strong',
  // select/disabled-option: the disabled opacity. The description stays readable: it tells why.
  'in-data-[disabled]:opacity-(--mono-opacity-disabled)',
].join(' ')
/** The description of an option: the small size and the muted text color. */
export const selectDescription = 'text-mono-small text-mono-fg-muted'
/** The check: the icon size of the density and the accent color, at the end side (select/selected-sign). */
export const selectCheck = [
  'inline-flex size-(--mono-size-icon) shrink-0 items-center justify-center text-mono-accent [&>svg]:size-full',
  'in-data-[disabled]:opacity-(--mono-opacity-disabled)',
].join(' ')
