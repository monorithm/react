// The look of the Segmented control (contract: ir/contracts/segmented-control.json): each size comes from
// --mono-segmented-control-* (components.css) and from the tokens of the density.
//
// The track is a grid: each segment has the same width (segmented-control/full-width). The pill is one element that
// moves to the selected segment. The component sets two local custom properties on the track: --seg-count (the number
// of segments) and --seg-index (the index of the selected segment). The pill calculates its width and its position
// from them. Thus the pill is correct with no measurement, also in a page from the server.

export type Size = 'md' | 'lg'

/** The track: the container of the segments. */
export const track = [
  'relative isolate grid-flow-col auto-cols-fr align-top text-mono-body',
  // segmented-control/pill: the segments are 2 px from the start edge and the end edge, with a gap of 2 px.
  'gap-(--mono-segmented-control-segment-gap) px-(--mono-segmented-control-track-inset)',
  // segmented-control/radius: 8 px.
  'rounded-(--mono-segmented-control-track-radius) bg-mono-segment-track',
  // segmented-control/motion: spring-control for the pill. segmented-control/motion-keyboard: spring-quick after a key.
  '[--seg-ease:var(--mono-spring-control)] [--seg-duration:var(--mono-spring-control-duration)]',
  'data-[input=keyboard]:[--seg-ease:var(--mono-spring-quick)] data-[input=keyboard]:[--seg-duration:var(--mono-spring-quick-duration)]',
].join(' ')

/** The height of each size, from the density (segmented-control/density, segmented-control/tv). */
export const trackHeights: Record<Size, string> = {
  md: 'h-(--mono-size-control-md)',
  lg: 'h-(--mono-size-control-lg)',
}

/** The pill: the sign of the selected segment. */
export const pill = [
  'pointer-events-none absolute start-(--mono-segmented-control-track-inset)',
  // segmented-control/pill: 2 px from the top edge and the bottom edge of the track. The width of one segment.
  'top-(--mono-segmented-control-track-inset) bottom-(--mono-segmented-control-track-inset)',
  'w-[calc((100%-2*var(--mono-segmented-control-track-inset)-(var(--seg-count)-1)*var(--mono-segmented-control-segment-gap))/var(--seg-count))]',
  // segmented-control/direction: the pill moves to the end side. In right-to-left, the end side is the left.
  'translate-x-[calc(var(--seg-index)*(100%+var(--mono-segmented-control-segment-gap)))]',
  'rtl:-translate-x-[calc(var(--seg-index)*(100%+var(--mono-segmented-control-segment-gap)))]',
  // segmented-control/selected-sign and segmented-control/radius: the pill fill, the raised shadow, and 6 px.
  'rounded-mono-sm bg-mono-segment-pill shadow-mono-raised',
  // segmented-control/disabled: a disabled group shows the disabled opacity on the pill too.
  '[[data-disabled]>&]:opacity-(--mono-opacity-disabled)',
  // segmented-control/motion: the spring of the track. Where no spring applies, 280 ms with ease-out.
  'transition-[translate] duration-(--seg-duration) ease-(--seg-ease)',
  'not-supports-[transition-timing-function:linear(0,1)]:duration-(--mono-duration-slide)',
  'not-supports-[transition-timing-function:linear(0,1)]:ease-(--mono-easing-out)',
  // segmented-control/reduced-motion: the pill goes to the selected segment with no movement.
  'motion-reduce:transition-none [[data-motion=reduced]_&]:transition-none',
].join(' ')

/** A segment: the target of one option. It has the full height of the track. */
export const segment = [
  'relative inline-flex min-w-(--mono-size-target-min) cursor-pointer select-none items-center justify-center whitespace-nowrap',
  // segmented-control/segment: the content is at the center, 10 px from the start side and the end side.
  'gap-(--mono-segmented-control-icon-gap) px-(--mono-segmented-control-segment-padding-inline) rounded-mono-sm',
  // segmented-control/hover: only a device with hover shows the body text color on a segment that is not selected.
  'text-mono-fg-muted not-data-[checked]:not-data-[disabled]:hover:text-mono-fg',
  // segmented-control/selected-sign: the strong text color and the strong weight.
  'data-[checked]:text-mono-fg-strong data-[checked]:font-mono-strong',
  // segmented-control/motion: the label color changes in 200 ms. Reduced motion keeps the change of color.
  'transition-[color] duration-(--mono-duration-base) ease-(--mono-easing-standard)',
  // segmented-control/disabled
  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-(--mono-opacity-disabled)',
].join(' ')

/** The box of an icon: the icon size of the density (segmented-control/density, segmented-control/icon). */
export const segmentIcon = 'inline-flex size-(--mono-size-icon) shrink-0 items-center justify-center [&>svg]:size-full'

/** The label and a copy in the strong weight. The copy keeps the width of the segment when the weight changes. */
export const segmentLabel = 'grid'
export const segmentLabelLayer = 'col-start-1 row-start-1'
