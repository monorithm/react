// The look of the Tab bar (contract: ir/contracts/tab-bar.json): each size comes from --mono-tab-bar-* (components.css)
// and from the tokens. The bar size, the icon size, and the label size are the same in each density (tab-bar/density).

/** The bar: the navigation landmark. Its fill continues behind the bottom safe area of the device. */
export const bar = [
  'w-full bg-mono-bg',
  // tab-bar/bar: a line of 1 px in the subtle line color at the top edge. The line is an inset shadow, thus it does not
  // add to the height of the bar, and each destination keeps the full height of the bar (tab-bar/target).
  'shadow-[inset_0_var(--mono-tab-bar-bar-line)_0_0_var(--mono-color-role-line-subtle)]',
  // tab-bar/safe-area and tab-bar/height: the bottom safe area of the device adds to the height of the bar. The
  // destinations stay above it, and the fill of the bar continues to the bottom edge of the screen.
  'pb-[env(safe-area-inset-bottom)]',
].join(' ')

/** The row of the destinations. */
export const row = [
  // tab-bar/layout: the destinations have the same width and fill the width of the bar. minmax(0, 1fr) keeps the same
  // width also for a long label. tab-bar/direction: the grid follows the direction, thus right-to-left mirrors it.
  'm-0 grid list-none grid-flow-col auto-cols-[minmax(0,1fr)] p-0',
  // tab-bar/height: 56 px. tab-bar/label-wrap: a label that wraps makes the bar higher. The bar never cuts a label.
  'min-h-(--mono-size-tab-bar)',
].join(' ')

/** A destination: the target. It has the full height of the bar. */
export const destination = [
  'relative flex h-full w-full flex-col items-center justify-center gap-(--mono-tab-bar-destination-gap) no-underline',
  // tab-bar/target: the minimum target of the density or more, on each axis.
  'min-h-(--mono-size-target-min) min-w-(--mono-size-target-min)',
  'cursor-pointer select-none [-webkit-tap-highlight-color:transparent] data-[disabled]:cursor-not-allowed',
  // tab-bar/color: the secondary text color on the icon and the label. The icon has the color of its label (tab-bar/icon).
  'text-mono-fg-2',
  // tab-bar/selected-sign: the strong text color on the current destination.
  'data-[current]:text-mono-fg-strong',
  // tab-bar/hover: Tailwind puts hover: in @media (hover: hover). Thus only a device with hover shows it.
  'not-data-[disabled]:hover:text-mono-fg-strong',
  // tab-bar/press: at pointer down, the destination scales to 0.97 in 100 ms.
  '[--tab-bar-press:var(--mono-scale-press)] not-data-[disabled]:active:scale-[var(--tab-bar-press)]',
  // tab-bar/reduced-motion: no scale. The change of color stays.
  'motion-reduce:[--tab-bar-press:1] [[data-motion=reduced]_&]:[--tab-bar-press:1]',
  // tab-bar/motion: the color changes in 150 ms (duration.fast), the scale in 100 ms (duration.press).
  '[transition-property:color,scale] [transition-duration:var(--mono-duration-fast),var(--mono-duration-press)] ease-(--mono-easing-standard)',
  // tab-bar/disabled
  'data-[disabled]:opacity-(--mono-opacity-disabled)',
].join(' ')

/** The box of the icon: 24 px in each density (tab-bar/icon). Assistive technology does not read it. */
export const icon = 'relative inline-flex size-(--mono-size-icon-nav) shrink-0 items-center justify-center'

/** The glyph: the icon of the app. tab-bar/icon: the stroke is 1.75 px, in the color of the label. */
export const glyph = 'relative inline-flex items-center justify-center [&>svg]:size-full [&>svg]:stroke-(length:--mono-tab-bar-icon-stroke)'

/** The size of the glyph: the nav icon, or the icon of the density on the primary mark (tab-bar/primary-destination). */
export const glyphSizes = {
  default: 'size-(--mono-size-icon-nav)',
  primary: 'size-(--mono-size-icon) text-mono-primary-fg',
} as const

/** tab-bar/direction-icons: in right-to-left, an icon that points forward or back mirrors. */
export const mirrored = 'rtl:-scale-x-100'

/**
 * tab-bar/primary-destination: the primary fill behind the icon, in a shape of 38 by 28 px. It is at the center of the
 * icon box. Thus its label stays on the line of the other labels.
 */
export const primaryMark = [
  'absolute top-1/2 left-1/2 -translate-1/2',
  'h-(--mono-tab-bar-primary-mark-height) w-(--mono-tab-bar-primary-mark-width) rounded-mono-md bg-mono-primary',
].join(' ')

/** The label: always on the screen, 11 px in each density (tab-bar/label, tab-bar/density). */
// tab-bar/label-wrap: a long label wraps, also inside a long word. It is never cut.
export const label = 'grid max-w-full text-center text-mono-tab-label wrap-anywhere'

/** One layer of the label. The two layers share one cell of a grid: the strong layer keeps the width. */
export const labelLayer = [
  'col-start-1 row-start-1',
  // tab-bar/motion: the weight changes in 150 ms.
  'transition-[font-weight] duration-(--mono-duration-fast) ease-(--mono-easing-standard)',
].join(' ')

/**
 * The anchor of the count and the dot: 5 px from the top edge of the destination. The start edge is 6 px from the center
 * of the icon, on the end side (tab-bar/count-position). In right-to-left, the end side is the left (tab-bar/direction).
 */
const badgeAnchor = 'pointer-events-none absolute top-(--mono-tab-bar-count-offset-top) inset-s-[calc(50%+var(--mono-tab-bar-count-offset-inline))]'

/** tab-bar/count-badge: the accent fill, the accent foreground text, a full radius, and a height of 17 px or more. */
export const count = [
  badgeAnchor,
  'inline-flex items-center justify-center whitespace-nowrap tabular-nums leading-none',
  'min-h-(--mono-tab-bar-count-min-height) min-w-(--mono-tab-bar-count-min-width) px-(--mono-tab-bar-count-padding-inline)',
  'rounded-mono-full bg-mono-accent text-mono-accent-fg text-mono-tab-label font-mono-strong',
  // tab-bar/count-position: a ring of 2 px in the background color.
  'shadow-[0_0_0_var(--mono-tab-bar-count-ring)_var(--mono-color-role-bg)]',
].join(' ')

/** tab-bar/dot: a dot of 8 px in the accent color, with a ring of 2 px in the background color. */
export const dot = [
  badgeAnchor,
  'size-(--mono-tab-bar-dot-size) rounded-mono-full bg-mono-accent',
  'shadow-[0_0_0_var(--mono-tab-bar-dot-ring)_var(--mono-color-role-bg)]',
].join(' ')
