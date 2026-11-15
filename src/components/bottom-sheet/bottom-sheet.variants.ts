// The look of the Bottom sheet (contract: ir/contracts/bottom-sheet.json). The sizes come from the tokens and from the
// geometry of the contract (--mono-bottom-sheet-*, components.css). The component picks one class set for each layout:
// bottom (a phone, and a window less than 768 px wide) or side (from 768 px).
//
// The position: --sheet-x is the height of the sheet in view. At rest it is --sheet-rest: the snap point of data-snap,
// or the measured value that the component writes. During a drag and a spring, the component writes --sheet-drag and
// sets data-moving, thus no transition applies (bottom-sheet/tracking). The sheet is as high as Full and is translated
// down by Full less --sheet-x.
import { FOCUS } from '@monorithm/react/lib/row'

/** The entrance and the exit (bottom-sheet/motion, bottom-sheet/motion-reduced, bottom-sheet/side-sheet-motion). */
const ENTER_EXIT = [
  // Each layout sets --sheet-from: the position at the start of the entrance and at the end of the exit.
  '[--sheet-fade:1] [--sheet-in:var(--mono-duration-sheet)] [--sheet-out:var(--mono-duration-base)]',
  // bottom-sheet/motion-reduced: no slide. The sheet fades in for dur-fast and fades out for dur-press.
  'motion-reduce:[--sheet-fade:0] motion-reduce:[--sheet-in:var(--mono-duration-fast)] motion-reduce:[--sheet-out:var(--mono-duration-press)]',
  '[[data-motion=reduced]_&]:[--sheet-fade:0] [[data-motion=reduced]_&]:[--sheet-in:var(--mono-duration-fast)] [[data-motion=reduced]_&]:[--sheet-out:var(--mono-duration-press)]',
  'data-[starting-style]:opacity-(--sheet-fade) data-[ending-style]:opacity-(--sheet-fade)',
  // In: dur-sheet with ease-out. Out: dur-base with ease-in.
  '[transition-property:translate,opacity] duration-(--sheet-in) ease-(--mono-easing-out)',
  'data-[ending-style]:duration-(--sheet-out) data-[ending-style]:ease-(--mono-easing-in)',
  // bottom-sheet/tracking: the drag and the spring move the sheet with no transition.
  'data-[moving]:transition-none',
].join(' ')

/** bottom-sheet/surface: the raised fill and the overlay shadow, as menus and dialogs have. */
const SURFACE = 'flex flex-col bg-mono-raised text-mono-fg shadow-mono-overlay outline-none'

/** The sheet in the bottom layout. */
export const sheetBottom = [
  SURFACE,
  // bottom-sheet/width: 640 px wide or less, at the center of the screen. On a phone, the full width.
  'fixed z-(--mono-layer-dialog) inset-x-0 mx-auto w-full max-w-(--mono-size-sheet-max-width)',
  // bottom-sheet/surface: a radius of 16 px on the top corners.
  'rounded-t-mono-xl',
  // bottom-sheet/top-gap and bottom-sheet/web-height: Full is the screen area in view (dvh) less the top safe area and
  // the top gap. bottom-sheet/keyboard-order: the keyboard pushes the bottom edge up, and the sheet becomes shorter.
  '[--sheet-full:calc(100dvh_-_env(safe-area-inset-top,0px)_-_var(--mono-size-sheet-gap))]',
  'bottom-(--sheet-kb,0px) h-[calc(var(--sheet-full)_-_var(--sheet-kb,0px))]',
  // bottom-sheet/snap-values: the rest point of each snap point. Half is the default: the sheet opens at Half.
  '[--sheet-rest:calc(100dvh_*_var(--mono-ratio-sheet-half))]',
  'data-[snap=full]:[--sheet-rest:var(--sheet-full)] data-[snap=peek]:[--sheet-rest:var(--mono-size-sheet-peek)]',
  '[--sheet-x:var(--sheet-drag,var(--sheet-rest))] translate-y-[calc(var(--sheet-full)_-_var(--sheet-x))]',
  // bottom-sheet/motion: the sheet comes up from the bottom edge (--sheet-x is 0). With reduced motion, it stays at
  // its snap point and fades. bottom-sheet/direction: the same in each reading direction.
  '[--sheet-from:0px] motion-reduce:[--sheet-from:var(--sheet-rest)] [[data-motion=reduced]_&]:[--sheet-from:var(--sheet-rest)]',
  'data-[starting-style]:[--sheet-x:var(--sheet-from)] data-[ending-style]:[--sheet-x:var(--sheet-from)]',
  ENTER_EXIT,
  // A drag with the mouse does not select the text of the content.
  'data-[moving]:select-none',
  // bottom-sheet/rubber-band: past Full the sheet goes up. The raised fill continues below its bottom edge.
  "after:absolute after:inset-x-0 after:top-full after:h-dvh after:bg-mono-raised after:content-['']",
].join(' ')

/** The lowest snap point of each variant, for the footer of the static page. The component writes the measured value. */
export const sheetLow = {
  modal: '[--sheet-low:calc(100dvh_*_var(--mono-ratio-sheet-half))]',
  persistent: '[--sheet-low:var(--mono-size-sheet-peek)]',
} as const

/** The sheet in the side layout (bottom-sheet/side-sheet, bottom-sheet/desktop). */
export const sheetSide = [
  SURFACE,
  // bottom-sheet/width: a side sheet is 400 px wide, at the end side, with the full height of the content area.
  'fixed z-(--mono-layer-dialog) inset-y-0 end-0 w-(--mono-size-sheet-side-width) max-w-full',
  // bottom-sheet/side-sheet-motion: it comes in from its edge. In right-to-left, the end edge is the left edge
  // (--sheet-side is -1). With reduced motion, it stays at its place and fades.
  '[--sheet-side:1] rtl:[--sheet-side:-1] [--sheet-from:calc(100%_*_var(--sheet-side))]',
  'motion-reduce:[--sheet-from:0%] [[data-motion=reduced]_&]:[--sheet-from:0%]',
  'data-[starting-style]:translate-x-(--sheet-from) data-[ending-style]:translate-x-(--sheet-from)',
  ENTER_EXIT,
].join(' ')

/** bottom-sheet/scrim: only for a modal sheet. Its opacity follows the position of the sheet. */
export const sheetScrim = [
  'fixed inset-0 z-(--mono-layer-dialog) bg-mono-scrim',
  '[--sheet-in:var(--mono-duration-sheet)] [--sheet-out:var(--mono-duration-base)]',
  'motion-reduce:[--sheet-in:var(--mono-duration-fast)] motion-reduce:[--sheet-out:var(--mono-duration-press)]',
  '[[data-motion=reduced]_&]:[--sheet-in:var(--mono-duration-fast)] [[data-motion=reduced]_&]:[--sheet-out:var(--mono-duration-press)]',
  'transition-opacity duration-(--sheet-in) ease-(--mono-easing-out)',
  'data-[ending-style]:duration-(--sheet-out) data-[ending-style]:ease-(--mono-easing-in)',
  'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[moving]:transition-none',
].join(' ')

/** The row of the handle: the bar is 8 px from the top edge (bottom-sheet/handle). It is part of the drag area. */
export const sheetHandleRow = 'flex shrink-0 justify-center pt-(--mono-bottom-sheet-handle-top) touch-none select-none'

/** The handle: a bar of 36 × 4 px in line-strong with round ends, at the center (bottom-sheet/handle). */
export const sheetHandle = [
  'relative block cursor-grab rounded-mono-full bg-mono-line-strong',
  'w-(--mono-size-sheet-handle-width) h-(--mono-size-sheet-handle-height)',
  // bottom-sheet/focus: the focus ring of the language, for keyboard focus only.
  FOCUS,
  // bottom-sheet/target: the target extends past the bar: the minimum target of the density on each axis, or more.
  "after:absolute after:top-1/2 after:left-1/2 after:-translate-1/2 after:content-['']",
  'after:h-(--mono-size-target-min) after:w-[calc(var(--mono-size-sheet-handle-width)_+_var(--mono-size-target-min))]',
].join(' ')

/** bottom-sheet/header: the title and the count at the start side, the close button at the end side. */
export const sheetHeader = 'flex shrink-0 items-center gap-2 px-(--mono-space-4) py-2 select-none'
/** The header is also the drag area in the bottom layout (bottom-sheet/drag-area). */
export const sheetHeaderDrag = 'touch-none'
export const sheetTitleGroup = 'flex min-w-0 flex-1 items-baseline gap-2'
/** bottom-sheet/header: title-3, the strong weight, and the strong text color. */
export const sheetTitle = 'min-w-0 truncate text-mono-title-3 font-mono-strong text-mono-fg-strong outline-none'
/** bottom-sheet/header: the count has the muted text color. */
export const sheetCount = 'shrink-0 text-mono-body text-mono-fg-muted'

/** The content: a list or a form. */
const CONTENT = 'min-h-0 flex-1 overflow-x-hidden overscroll-contain px-(--mono-space-4) text-mono-body text-mono-fg'
export const sheetContent = {
  // bottom-sheet/scroll-at-full: the content scrolls only at Full. bottom-sheet/handoff: the engine moves the content for
  // a vertical drag; a horizontal pan stays with the browser (bottom-sheet/carousel).
  bottom: `${CONTENT} overflow-y-hidden touch-pan-x [[data-snap=full]_&]:overflow-y-auto`,
  // bottom-sheet/desktop: the side sheet scrolls by itself.
  side: `${CONTENT} overflow-y-auto`,
} as const

/** The footer: an input or one primary button, above the bottom safe area (bottom-sheet/footer). */
const FOOTER = 'shrink-0 bg-mono-raised px-(--mono-space-4) pt-2 pb-[calc(--spacing(2)_+_env(safe-area-inset-bottom,0px))]'
export const sheetFooter = {
  // bottom-sheet/footer: the footer stays at the bottom edge of the screen at each snap point. Below the lowest snap
  // point it goes down with the sheet. Above the keyboard, the bottom safe area is under the keyboard.
  bottom: `${FOOTER} translate-y-[calc(max(var(--sheet-x),var(--sheet-low))_-_var(--sheet-full))] [[data-keyboard]_&]:pb-2`,
  side: FOOTER,
} as const
