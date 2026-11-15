// The motion of the bar, the spinner, and the shimmer: the keyframes and the times of the timers. The keyframes change
// only the transform and the opacity (progress/animate). The durations and the curves come from the tokens, in the
// animation classes (progress.variants.ts). React puts one copy of the style element in the head of the document.
import { tokens } from '@monorithm/react/tokens/values'

/** The time before a spinner shows (progress/spinner-delay), in ms. */
export const SPINNER_DELAY = tokens['duration.spinner-delay'].value.value

/** The time after which the shimmer stops and a status text shows (progress/shimmer-stop), in ms. */
export const SHIMMER_LIMIT = tokens['duration.shimmer-limit'].value.value

/** The number of loops of the shimmer in the shimmer limit (progress/shimmer-stop). */
export const SHIMMER_COUNT = SHIMMER_LIMIT / tokens['duration.shimmer'].value.value

export const KEYFRAMES = [
  // progress/spinner: one turn, clockwise.
  '@keyframes mono-progress-spin{to{transform:rotate(1turn)}}',
  // progress/indeterminate-motion and progress/shimmer: the element is at -100 % at rest (its translate). The loop moves
  // it to +100 %: from the start edge to the end edge, out of the track or the shape at each end.
  '@keyframes mono-progress-sweep{to{transform:translateX(200%)}}',
  // progress/motion: the pulse of the opacity, from 1 to the pulse opacity (0.4) and back.
  '@keyframes mono-progress-pulse{50%{opacity:var(--mono-opacity-pulse)}}',
].join('')

/** The keyframes of the progress motion. Each part renders it; React keeps one copy. */
export function ProgressMotion() {
  return (
    <style href="mono-progress-motion" precedence="mono">
      {KEYFRAMES}
    </style>
  )
}
