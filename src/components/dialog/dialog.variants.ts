// The look of the Dialog (contract: ir/contracts/dialog.json). Each size comes from the tokens and from --mono-dialog-*
// (components.css). The dialog has two forms. From a window of 768 px wide, it is in the center of the window. In a
// window less than 768 px wide, it is a modal bottom sheet (dialog/phone).
//
// A media query cannot read a custom property. Thus the variant max-mono-tablet comes from the breakpoint token
// breakpoint.tablet (768 px), which the emitter writes as a fixed value of the Tailwind theme. A test compares it with
// --mono-dialog-phone-below-width (the geometry phone.below-width).
//
// The form and the motion set local custom properties (--dlg-*). The base classes read them, with the value of the
// web form as the fallback. Thus two classes never set the same property.

export type DialogVariant = 'confirm' | 'destructive'

/** The button variant of the confirm action (dialog/variant). The safe action is always a ghost button. */
export const confirmVariants = {
  confirm: 'primary',
  destructive: 'destructive',
} as const satisfies Record<DialogVariant, 'primary' | 'destructive'>

/**
 * The durations of the scrim and the container. The scrim follows the container, thus the two layers share them.
 * The phone values apply only with full motion: reduced motion always has the reduced values.
 */
const dialogDurations = [
  // dialog/motion: the open is dur-base (200 ms), with ease-out. The close is dur-fast (150 ms), with ease-in.
  // dialog/motion-phone: the sheet comes up in dur-sheet (320 ms). It goes down in dur-base (200 ms).
  'motion-safe:max-mono-tablet:[--dlg-in:var(--mono-duration-sheet)] motion-safe:max-mono-tablet:[--dlg-out:var(--mono-duration-base)]',
  // dialog/motion-reduced: the fade in is dur-fast (150 ms). The fade out is dur-press (100 ms). The system option,
  // or data-motion="reduced" on an ancestor.
  'motion-reduce:[--dlg-in:var(--mono-duration-fast)] motion-reduce:[--dlg-out:var(--mono-duration-press)]',
  '[[data-motion=reduced]_&]:[--dlg-in:var(--mono-duration-fast)] [[data-motion=reduced]_&]:[--dlg-out:var(--mono-duration-press)]',
  'duration-[var(--dlg-in,var(--mono-duration-base))] ease-(--mono-easing-out)',
  'data-[ending-style]:duration-[var(--dlg-out,var(--mono-duration-fast))] data-[ending-style]:ease-(--mono-easing-in)',
].join(' ')

/** The modal layer (layer.dialog): above the page, the menus, and the popovers. A toast is above the dialog (dialog/layer). */
const LAYER = 'z-(--mono-layer-dialog)'

/** The scrim: it covers the page behind the dialog, and it fades with the dialog (dialog/scrim, dialog/motion). */
export const dialogScrim = [
  `fixed inset-0 ${LAYER} bg-mono-scrim`,
  '[transition-property:opacity]',
  dialogDurations,
  'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
].join(' ')

/** The place of the container in the window: the center, or the bottom edge for the phone form. */
export const dialogViewport = [
  `fixed inset-0 ${LAYER} flex justify-center`,
  // dialog/width and dialog/tablet: the center of the window. dialog/phone: the bottom edge.
  '[align-items:var(--dlg-align,center)] max-mono-tablet:[--dlg-align:flex-end]',
  // dialog/foldable: on a foldable, the dialog stays on one side of the fold: the first segment.
  '[@media(horizontal-viewport-segments:2)]:right-auto [@media(horizontal-viewport-segments:2)]:w-[env(viewport-segment-width_0_0)]',
  '[@media(vertical-viewport-segments:2)]:bottom-auto [@media(vertical-viewport-segments:2)]:h-[env(viewport-segment-height_0_0)]',
].join(' ')

/** The container: the raised surface. */
export const dialogContainer = [
  'relative flex flex-col outline-none',
  // dialog/container: the raised fill and the overlay shadow. The 1 px ring of the shadow is the edge.
  'bg-mono-raised shadow-mono-overlay text-start',
  // dialog/width: 440 px wide, never more than the window. dialog/phone: the full width of the window.
  'w-[var(--dlg-width,var(--mono-dialog-container-width))] max-w-full max-mono-tablet:[--dlg-width:100%]',
  // dialog/overflow: the dialog stays inside the window. When the content is higher than the window, the content scrolls.
  'max-h-full overflow-y-auto overscroll-contain',
  // dialog/container: the large radius (12 px pointer, 14 px touch). dialog/phone: 16 px on the top corners only.
  'rounded-t-[var(--dlg-radius-top,var(--mono-radius-lg))] rounded-b-[var(--dlg-radius-bottom,var(--mono-radius-lg))]',
  'max-mono-tablet:[--dlg-radius-top:var(--mono-radius-xl)] max-mono-tablet:[--dlg-radius-bottom:0px]',
  // dialog/spacing: a padding of 20 px. dialog/phone: a padding of 16 px, and the sheet stays above the bottom safe area.
  'px-[var(--dlg-pad,var(--mono-space-5))] pt-[var(--dlg-pad,var(--mono-space-5))]',
  'pb-[var(--dlg-pad-bottom,var(--mono-space-5))]',
  'max-mono-tablet:[--dlg-pad:var(--mono-space-4)] max-mono-tablet:[--dlg-pad-bottom:calc(var(--mono-space-4)+env(safe-area-inset-bottom,0px))]',
  // dialog/spacing: the gap between the text and the footer is 16 px (space.4).
  'gap-(--mono-space-4)',
  // dialog/motion and dialog/direction-motion: the scale starts at the center, in each reading direction.
  'origin-center [transition-property:opacity,scale,translate]',
  dialogDurations,
  // dialog/motion: the dialog scales from 0.96 (scale.dialog-in) and fades in. It scales back and fades out.
  // dialog/motion-phone: the sheet comes up from the bottom edge, with no scale and no fade.
  'motion-safe:max-mono-tablet:[--dlg-from-scale:1] motion-safe:max-mono-tablet:[--dlg-from-y:100%] motion-safe:max-mono-tablet:[--dlg-from-opacity:1]',
  // dialog/motion-reduced: a fade only, with no scale and no move.
  'motion-reduce:[--dlg-from-scale:1] [[data-motion=reduced]_&]:[--dlg-from-scale:1]',
  'motion-reduce:[--dlg-from-y:0px] [[data-motion=reduced]_&]:[--dlg-from-y:0px]',
  'motion-reduce:[--dlg-from-opacity:0] [[data-motion=reduced]_&]:[--dlg-from-opacity:0]',
  'data-[starting-style]:scale-[var(--dlg-from-scale,var(--mono-scale-dialog-in))] data-[ending-style]:scale-[var(--dlg-from-scale,var(--mono-scale-dialog-in))]',
  'data-[starting-style]:translate-y-[var(--dlg-from-y,0px)] data-[ending-style]:translate-y-[var(--dlg-from-y,0px)]',
  'data-[starting-style]:opacity-[var(--dlg-from-opacity,0)] data-[ending-style]:opacity-[var(--dlg-from-opacity,0)]',
].join(' ')

/** The handle of the sheet: on the phone form only (dialog/phone). It is out of the flow, thus it adds no gap. */
export const dialogHandle = [
  'hidden max-mono-tablet:block absolute top-(--mono-dialog-handle-inset) left-1/2 -translate-x-1/2',
  'w-(--mono-dialog-handle-width) h-(--mono-dialog-handle-height) rounded-mono-full bg-mono-line-strong',
].join(' ')

/** The title and the text. dialog/spacing: the gap between the title and the text is 6 px. */
export const dialogText = 'flex flex-col gap-(--mono-dialog-title-gap) wrap-break-word'

/** dialog/type and dialog/density: title-3 (16 px pointer, 17 px touch), the strong weight, the strong text color. */
export const dialogTitle = 'm-0 text-mono-title-3 font-mono-strong text-mono-fg-strong'

/** dialog/type and dialog/density: the small size (13 px pointer, 14 px touch), the secondary text color. */
export const dialogDescription = 'm-0 text-mono-small text-mono-fg-2'

/**
 * The footer. dialog/footer: the actions are at the end side, the confirm action is last, with a gap of 8 px.
 * dialog/footer-phone: the actions are stacked at full width, the confirm action is first, with a gap of 12 px. The
 * DOM order stays the same: the safe action, then the confirm action. Thus the focus order does not change.
 */
export const dialogFooter = [
  'flex justify-end',
  '[flex-direction:var(--dlg-footer-direction,row)] max-mono-tablet:[--dlg-footer-direction:column-reverse]',
  'gap-[var(--dlg-footer-gap,var(--mono-dialog-footer-gap))] max-mono-tablet:[--dlg-footer-gap:var(--mono-dialog-phone-footer-gap)]',
].join(' ')

/**
 * The height of an action on the phone form: control-lg (dialog/footer-phone). The Button sets control-md. A variant
 * class comes after a base class in the CSS of Tailwind, thus this class replaces the height in a narrow window only.
 */
export const dialogActionPhone = 'max-mono-tablet:h-(--mono-size-control-lg)'
