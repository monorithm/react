// The look of the Card (contract: ir/contracts/card.json). The tokens and the geometry of the contract (--mono-card-*,
// components.css) give each value. The container sets local custom properties: the padding, the inner radius, the ring
// color, and the press scale. The parts and the states read them. Thus two classes never set the same property.

export type CardVariant = 'basic' | 'stat' | 'chart' | 'content'
/** md: a padding of 16 px (the default). lg: a large card, with a padding of 20 px (card/padding). */
export type CardSize = 'md' | 'lg'
/** The heading level of the title. The screen sets it: the level after the heading of the section (card/heading-level). */
export type CardHeadingLevel = 2 | 3 | 4 | 5 | 6

/** card/padding: 16 px on each side, and 20 px for a large card. It is the same in the two densities (card/density). */
export const cardPaddings: Record<CardSize, string> = {
  md: '[--card-padding:var(--mono-space-4)]',
  lg: '[--card-padding:var(--mono-space-5)]',
}

/** The container: the surface, the ring, the radius, the padding, and the gap between the sections. */
export const cardBase = [
  // card/surface and card/density: the surface fill and the large radius of the density. The text of the body (body.size,
  // body.color) is the default text of the card.
  'relative flex min-w-0 flex-col rounded-mono-lg bg-mono-surface text-mono-body text-mono-fg',
  // card/padding and card/sections: the padding of the size, and 24 px between two sections.
  'p-(--card-padding) gap-(--mono-space-6)',
  // card/inner-radius: a part in the card has the card radius minus the padding, and not less than 0.
  '[--card-inner-radius:max(0px,calc(var(--mono-radius-lg)_-_var(--card-padding)))]',
  // card/surface and card/no-shadow: the ring is the ::after, 1 px on the inner side of the edge. It is not a shadow and
  // it does not change the size of the card. It shows on a photo at the edge, and a press goes through it.
  "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:content-['']",
  'after:border-solid after:border-(length:--mono-card-ring) after:border-[color:var(--card-ring,var(--mono-color-role-line))]',
  // card/hover and card/motion: the ring color changes in dur-fast. Reduced motion keeps this change.
  'after:transition-[border-color] after:duration-(--mono-duration-fast) after:ease-(--mono-easing-standard)',
].join(' ')

/** The states of an interactive card: a link or a button. A static card has none of them (card/static). */
export const cardInteractive = [
  // card/hover: Tailwind puts hover: in @media (hover: hover). Only the target changes the ring, not a nested control.
  'not-data-[disabled]:hover:has-[[data-part=target]:hover]:[--card-ring:var(--mono-color-role-line-strong)]',
  // card/press: at pointer down on the target, the strong ring and the press scale.
  'not-data-[disabled]:has-[[data-part=target]:active]:[--card-ring:var(--mono-color-role-line-strong)]',
  'not-data-[disabled]:has-[[data-part=target]:active]:scale-[var(--card-press,1)]',
  '[--card-press:var(--mono-scale-press)]',
  // card/motion: reduced motion (the system option, or data-motion="reduced" on an ancestor) has no scale.
  'motion-reduce:[--card-press:1] [[data-motion=reduced]_&]:[--card-press:1]',
  'transition-[scale] duration-(--mono-duration-press) ease-(--mono-easing-standard)',
  // card/focus: keyboard focus on the target shows the focus ring of the language on the full card. The outline follows
  // the radius of the card.
  'has-[[data-part=target]:focus-visible]:outline-solid has-[[data-part=target]:focus-visible]:outline-(length:--mono-focus-ring-width)',
  'has-[[data-part=target]:focus-visible]:outline-mono-ring has-[[data-part=target]:focus-visible]:outline-offset-(--mono-focus-ring-offset)',
  // card/disabled
  'data-[disabled]:opacity-(--mono-opacity-disabled)',
  // card/nested-control: a control in the card is above the ::after of the target. Thus it stays a separate target.
  // :where() gives the selector no specificity: a position class of the control wins.
  '[:where(&_:is(a[href],button,input,select,textarea,summary,label,[tabindex]):not([data-part=target]))]:relative',
  '[:where(&_:is(a[href],button,input,select,textarea,summary,label,[tabindex]):not([data-part=target]))]:z-1',
].join(' ')

/** The target of an interactive card: the title, as a link or a button (card/role, card/name). */
export const cardTarget = [
  'cursor-pointer outline-none aria-disabled:cursor-not-allowed',
  // The link and the button take the look of the title.
  'border-0 bg-transparent p-0 text-start text-inherit no-underline [font:inherit]',
  // card/one-target: the ::after covers the full card. A press on each point of the card that is not a control presses
  // the target. The title and its ancestors in the card have no position, thus the card holds the ::after.
  "after:absolute after:inset-0 after:rounded-mono-lg after:content-['']",
].join(' ')

/** card/header: the title and the info icon at the start side, the legend and the actions at the end side, on one line. */
export const cardHeader = 'flex min-w-0 items-center gap-(--mono-card-header-gap)'
export const cardHeaderStart = 'flex min-w-0 items-center gap-(--mono-card-actions-gap)'
/** The end side: 12 px or more from the title (the gap of the header and the auto margin). */
export const cardHeaderEnd = 'ms-auto flex shrink-0 items-center gap-(--mono-card-actions-gap)'
/** card/header: 8 px between two actions. */
export const cardActions = 'flex items-center gap-(--mono-card-actions-gap)'

/** card/title: title-3 of the density, the strong weight, and the strong text color. */
export const cardTitle = 'min-w-0 text-mono-title-3 font-mono-strong text-mono-fg-strong'

/** card/stat: the label above the value. */
export const cardStat = 'flex min-w-0 flex-col'
/** card/stat: the label is the title of a stat card. It has the small size and the secondary text color. */
export const cardStatLabel = 'text-mono-small text-mono-fg-2'
/** card/stat-value: title-2 of the density, with tabular figures, the strong weight, and the strong text color. */
export const cardStatValue = 'text-mono-title-2 font-mono-strong tabular-nums text-mono-fg-strong'
/** card/stat-change: the change and its period, in the small size. The period has the muted text color. */
export const cardStatChange = 'text-mono-small text-mono-fg'
export const cardStatPeriod = 'text-mono-fg-muted'

/** card/chart: the frame of the chart. It has the inner radius (card/inner-radius). */
export const cardChart = 'min-w-0 rounded-(--card-inner-radius)'

/** card/content and card/inner-radius: the photo is at the top edge, with the card radius at the two top corners. */
export const cardMedia = [
  'relative -mx-(--card-padding) -mt-(--card-padding) overflow-hidden rounded-t-mono-lg',
  '[&_img]:block [&_img]:w-full [&_img]:object-cover',
].join(' ')
/**
 * card/content-counter: the photo counter and the stock badge are text on the surface fill. The counter is at the start
 * corner, thus at the top right in right-to-left (card/direction). The badge is at the end corner.
 */
export const cardMediaLabel =
  'absolute top-(--mono-card-media-inset) rounded-mono-full bg-mono-surface px-(--mono-card-media-badge-padding-inline) text-mono-caption text-mono-fg-strong'

/**
 * card/loading: a shape of the skeleton. The part keeps its layout but does not show, thus the card keeps its size. The
 * ::before is the shape (the shape color of progress), and the ::after is the shimmer: a band of light that moves from
 * the start edge to the end edge. Add the radius of the part (cardShapeRadius, or the radius of the photo).
 */
export const cardShape = [
  'invisible relative overflow-hidden',
  "before:visible before:absolute before:inset-0 before:bg-mono-selected before:content-['']",
  "after:visible after:absolute after:inset-0 after:content-['']",
  'after:bg-linear-to-r after:from-transparent after:via-mono-skeleton-shimmer after:to-transparent',
  'after:animate-[mono-card-shimmer_var(--mono-duration-shimmer)_var(--mono-easing-linear)_infinite_var(--card-shimmer-direction,normal)]',
  // In right-to-left, the shimmer moves from the right to the left.
  'rtl:[--card-shimmer-direction:reverse]',
  // card/motion: reduced motion has no shimmer.
  'motion-reduce:after:animate-none [[data-motion=reduced]_&]:after:animate-none',
].join(' ')
/** The radius of a shape: the small radius (the shape radius of progress). */
export const cardShapeRadius = 'rounded-mono-sm'

/** The keyframes of the shimmer. The motion changes only the transform. */
export const cardShimmerKeyframes = '@keyframes mono-card-shimmer{from{translate:-100% 0}to{translate:100% 0}}'
