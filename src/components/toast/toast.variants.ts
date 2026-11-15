// The look of the Toast (contract: ir/contracts/toast.json). The geometry comes from --mono-toast-* (components.css): the
// region and each container have data-mono="toast". A state sets a local custom property, and one class reads it with a
// fallback. Thus two classes never set the same property.
import { FOCUS } from '@monorithm/react/lib/row'
import type { ToastKind } from './toast.types'

/**
 * The region: the area at the bottom edge of the window that holds the toasts. The toasts are in the safe area, 16 px
 * above the bottom edge, the tab bar, or the on-screen keyboard. The region keeps --toast-keyboard (the height of the
 * keyboard) and --toast-lift (the space below a control with the focus that a toast covers) up to date.
 */
export const toastRegion = [
  'fixed z-(--mono-layer-toast) outline-none',
  // toast/position, toast/position-phone, toast/position-keyboard, toast/not-obscured: the largest of the offsets.
  'bottom-[max(calc(var(--toast-tab-bar,0px)+env(safe-area-inset-bottom,0px)+var(--mono-space-4)),calc(var(--toast-keyboard,0px)+var(--mono-space-4)),calc(var(--toast-lift,0px)+var(--mono-space-4)))]',
  // toast/width, toast/position, toast/position-tablet, toast/direction: in a window of 768 px or more (mono-tablet), a
  // toast is 340 px wide, 16 px from the end edge: the right edge, or the left edge in a right-to-left layout.
  'mono-tablet:end-(--mono-space-4) mono-tablet:w-(--mono-toast-container-width)',
  // toast/width and toast/position-phone: in a narrower window, a toast is 16 px from each side, in the safe area.
  'max-mono-tablet:left-[calc(env(safe-area-inset-left,0px)+var(--mono-space-4))]',
  'max-mono-tablet:right-[calc(env(safe-area-inset-right,0px)+var(--mono-space-4))]',
  // toast/position and toast/position-phone: in a narrower window with a tab bar, the toasts are above the tab bar.
  'max-mono-tablet:[:root:has([data-mono=tab-bar])_&]:[--toast-tab-bar:var(--mono-size-tab-bar)]',
].join(' ')

/** The container: the surface of one toast. */
export const toastContainer = [
  // toast/queue-max: each toast is at the bottom of the region. Base UI gives --toast-index (0 for the newest toast) and
  // --toast-offset-y (the height of the newer toasts). Thus an older toast is above, with a gap of 10 px.
  'absolute inset-x-0 bottom-0',
  '[transform:translateY(calc((var(--toast-offset-y,0px)+var(--toast-index,0)*var(--mono-toast-stack-gap))*-1))]',
  // Base UI measures the height of a toast in full pixels (--toast-height). The toast takes that height, thus the gap of
  // the stack stays 10 px also when the text has a height in part pixels.
  'h-[var(--toast-height,auto)]',
  // toast/surface: the raised fill, the overlay shadow, and the large radius.
  'rounded-mono-lg bg-mono-raised shadow-mono-overlay',
  // toast/padding
  'py-(--mono-toast-container-padding-block) ps-(--mono-toast-container-padding-start) pe-(--mono-toast-container-padding-end)',
  FOCUS,
  // toast/motion: only the opacity and the transform change. The fade: 200 ms with ease-out in, 150 ms with ease-in out.
  '[transition-property:opacity,translate,transform]',
  '[--toast-fade:var(--toast-in,var(--mono-duration-base))] [--toast-ease:var(--mono-easing-out)]',
  'data-[ending-style]:[--toast-fade:var(--toast-out,var(--mono-duration-fast))] data-[ending-style]:[--toast-ease:var(--mono-easing-in)]',
  // toast/motion-stack: the other toasts move to their new positions with ease-in-out.
  '[transition-duration:var(--toast-fade),var(--mono-duration-base),var(--toast-stack,var(--mono-duration-base))]',
  '[transition-timing-function:var(--toast-ease),var(--mono-easing-out),var(--mono-easing-in-out)]',
  // toast/motion: the toast comes in from the bottom edge: it moves 16 px up and fades in. It goes out with a fade.
  // toast/direction: the entrance is vertical, thus it does not mirror.
  '[&[data-starting-style],&[data-ending-style]]:opacity-0',
  'data-[starting-style]:translate-y-[var(--toast-still,var(--mono-toast-enter-distance))]',
  // toast/reduced-motion: no move. The fade is 150 ms in and 100 ms out. The other toasts go to their positions immediately.
  'motion-reduce:[--toast-still:0px] motion-reduce:[--toast-stack:0s]',
  'motion-reduce:[--toast-in:var(--mono-duration-fast)] motion-reduce:[--toast-out:var(--mono-duration-press)]',
  '[[data-motion=reduced]_&]:[--toast-still:0px] [[data-motion=reduced]_&]:[--toast-stack:0s]',
  '[[data-motion=reduced]_&]:[--toast-in:var(--mono-duration-fast)] [[data-motion=reduced]_&]:[--toast-out:var(--mono-duration-press)]',
].join(' ')

/** The content: the disc, the text, and the buttons in one row, with a gap of 12 px (toast/padding). No part moves. */
export const toastContent = 'flex items-center gap-(--mono-toast-container-gap)'

/** The disc: 28 px and round, at the start side. The icon is 16 px at its center (toast/icon-style). */
export const toastDisc = [
  'flex size-(--mono-toast-disc-size) shrink-0 items-center justify-center rounded-mono-full',
  '[&>svg]:size-(--mono-toast-icon-size)',
].join(' ')

/** The soft color of the tone on the disc and the text color of the tone on the icon. Loading has the neutral disc. */
export const toastDiscTones: Record<ToastKind, string> = {
  info: 'bg-mono-accent-soft text-mono-accent-text',
  success: 'bg-mono-success-soft text-mono-success-text',
  warning: 'bg-mono-warning-soft text-mono-warning-text',
  danger: 'bg-mono-danger-soft text-mono-danger-text',
  loading: 'bg-mono-selected text-mono-fg-2',
}

/** The title and the text: the text is 1 px below the title. Long words go onto more lines, never cut (toast/wrap). */
export const toastText = 'flex min-w-0 flex-1 flex-col gap-(--mono-toast-text-gap) break-words'
/** toast/density and toast/text-color: the small size, the strong weight, and the strong text color. */
export const toastTitle = 'text-mono-small font-mono-strong text-mono-fg-strong'
/** toast/density and toast/text-color: the caption size and the secondary text color. */
export const toastTextLine = 'text-mono-caption text-mono-fg-2'

/**
 * toast/hover: at hover, the close button gets the selected fill, not the hover fill of a ghost button. The selector has
 * the container, thus it has a higher specificity than the class of the ghost variant.
 */
export const toastClose = '[[data-part=container]_&]:[--btn-fill-hover:var(--mono-color-role-selected)]'

/**
 * The spinner: one turn in duration.spin, linear. With reduced motion, it does not turn: it pulses its opacity in
 * duration.pulse (toast/reduced-motion). The keyframes are in toast.icons.tsx.
 */
export const toastSpinner = [
  'animate-[var(--toast-spin,mono-toast-spin_var(--mono-duration-spin)_var(--mono-easing-linear)_infinite)]',
  'motion-reduce:[--toast-spin:mono-toast-pulse_var(--mono-duration-pulse)_var(--mono-easing-linear)_infinite]',
  '[[data-motion=reduced]_&]:[--toast-spin:mono-toast-pulse_var(--mono-duration-pulse)_var(--mono-easing-linear)_infinite]',
].join(' ')
