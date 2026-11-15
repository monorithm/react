// The look of the bar, the spinner, and the skeleton (contract: ir/contracts/progress.json). Each size comes from the
// tokens and from --mono-progress-* (components.css). The keyframes are in progress.motion.tsx: they change only the
// transform and the opacity (progress/animate). The classes below give the durations and the curves from the tokens.

// Reduced motion is the system option, or data-motion="reduced" on an ancestor (progress/motion). Tailwind finds a class
// only as a literal. Thus each pulse class is in full text.

/**
 * The bar: the label and the value on one line, 8 px above the track (progress/label), in the small text size of the
 * density (progress/density). The label gap is also the minimum space between the label and the value.
 */
export const barRoot = 'grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-(--mono-progress-value-gap) text-mono-small'

/** The label: the task, at the start side (progress/label). */
export const barLabel = 'min-w-0 text-mono-fg'

/** The percentage: at the end side, with tabular figures (progress/label). */
export const barValue = 'text-mono-fg-muted tabular-nums'

/** The track: 6 px high in the two densities, with the full radius and the selected color (progress/bar). */
export const barTrack = 'col-span-2 h-(--mono-progress-track-height) overflow-hidden rounded-mono-full bg-mono-selected'

/** The fill: the full radius and the accent color (progress/bar). */
const fillBase = 'block size-full rounded-mono-full bg-mono-accent'

/** The fill of a bar with a value. The component sets --progress-fraction from 0 to 1. */
export const barFill = [
  fillBase,
  // progress/bar-motion and progress/direction: the fill changes its horizontal scale, from the start side.
  'origin-left rtl:origin-right scale-x-(--progress-fraction)',
  // progress/bar-motion: the fill follows each larger value with spring-control. A smaller value jumps (data-jump).
  'transition-[scale] duration-(--mono-spring-control-duration) ease-(--mono-spring-control)',
  'data-[jump]:transition-none',
  // progress/motion: with reduced motion, the bar jumps to each value.
  'motion-reduce:transition-none [[data-motion=reduced]_&]:transition-none',
].join(' ')

/** The fill of an indeterminate bar. */
export const barFillIndeterminate = [
  fillBase,
  // progress/indeterminate-motion: the fill moves from the start edge to the end edge in a loop of dur-shimmer, with the
  // linear curve. At rest, it is out of the track at the start side. In right-to-left, the loop goes in reverse.
  '-translate-x-full rtl:[--progress-sweep:reverse]',
  'animate-[mono-progress-sweep_var(--mono-duration-shimmer)_var(--mono-easing-linear)_infinite_var(--progress-sweep,normal)]',
  // progress/motion: with reduced motion, the fill does not move. It fills the track and pulses as the spinner.
  'motion-reduce:translate-none motion-reduce:animate-[mono-progress-pulse_var(--mono-duration-pulse)_var(--mono-easing-linear)_infinite]',
  '[[data-motion=reduced]_&]:translate-none [[data-motion=reduced]_&]:animate-[mono-progress-pulse_var(--mono-duration-pulse)_var(--mono-easing-linear)_infinite]',
].join(' ')

/** The box of the spinner. The live region in it has no size (sr-only). */
export const spinnerRoot = 'relative inline-flex shrink-0 align-middle'

/** The spinner: the loading icon at the icon size of the density, in the color of the text next to it (progress/spinner). */
export const spinnerIcon = [
  'size-(--mono-size-icon) shrink-0',
  // progress/spinner and progress/spinner-direction: one turn clockwise in dur-spin, with the linear curve. No mirror.
  'animate-[mono-progress-spin_var(--mono-duration-spin)_var(--mono-easing-linear)_infinite]',
  // progress/motion: with reduced motion, the spinner does not turn. It pulses its opacity in dur-pulse.
  'motion-reduce:animate-[mono-progress-pulse_var(--mono-duration-pulse)_var(--mono-easing-linear)_infinite]',
  '[[data-motion=reduced]_&]:animate-[mono-progress-pulse_var(--mono-duration-pulse)_var(--mono-easing-linear)_infinite]',
].join(' ')

/** The region that loads. The status text is on the shapes (progress/shimmer-stop). */
export const skeletonRegion = 'relative'

/** The status text after the shimmer limit: on the shapes, thus the region keeps its size (progress/size). */
export const skeletonStatus = 'absolute inset-0 flex items-center justify-center text-center text-mono-small text-mono-fg-muted'

/** The radii of a shape: the small radius for a line of text, the radius of the real image or avatar for media. */
export const shapeRadii = {
  sm: 'rounded-mono-sm',
  md: 'rounded-mono-md',
  lg: 'rounded-mono-lg',
  xl: 'rounded-mono-xl',
  full: 'rounded-mono-full',
} as const

/** A shape. The component sets --progress-shimmer-count: the number of loops in the shimmer limit (progress/shimmer-stop). */
export const shapeBase = [
  // progress/skeleton-shape: the selected color.
  'relative block shrink-0 overflow-hidden bg-mono-selected',
  // progress/shimmer: a band of the shimmer color moves across the shape in a loop of dur-shimmer, with the linear curve.
  "after:absolute after:inset-0 after:content-[''] after:-translate-x-full",
  'after:bg-linear-to-r after:from-transparent after:via-mono-skeleton-shimmer after:to-transparent',
  'after:animate-[mono-progress-sweep_var(--mono-duration-shimmer)_var(--mono-easing-linear)_var(--progress-shimmer-count,infinite)_var(--progress-sweep,normal)]',
  // progress/shimmer-direction: the band moves from the start edge to the end edge. In right-to-left, the loop goes in reverse.
  'rtl:[--progress-sweep:reverse]',
  // progress/shimmer-stop: after the limit, the region is expired and the shimmer stops.
  'in-data-[expired]:after:hidden',
  // progress/motion: with reduced motion, the skeleton has no shimmer.
  'motion-reduce:after:hidden [[data-motion=reduced]_&]:after:hidden',
].join(' ')

/** A shape for a line of text: one line high, at the line height of the text that it replaces (progress/size). */
export const shapeText = 'h-lh'
