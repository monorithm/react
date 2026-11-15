// The look of the Tabs (contract: ir/contracts/tabs.json): each size comes from --mono-tabs-* (components.css) and from
// the tokens of the density.
//
// The scroller holds the list. The list has the line of 1 px at its bottom edge (a border). The indicator is one element
// in the list. Base UI measures the selected tab and gives its offset and its width to the indicator as custom
// properties (--active-tab-left, --active-tab-width). The offset is physical: from the left edge of the list, also in
// right-to-left. Thus the indicator uses left and translate-x, with no mirror.

export type Size = 'md' | 'tv'

/** The root: the list and the panels. */
export const root = [
  'flex min-w-0 flex-col',
  // tabs/focus: --tabs-ring is the space of the focus ring: its width and its offset.
  '[--tabs-ring:calc(var(--mono-focus-ring-width)+var(--mono-focus-ring-offset))]',
  // tabs/motion: spring-control for the indicator. tabs/motion-keyboard: spring-quick after a key or a remote.
  '[--tabs-ease:var(--mono-spring-control)] [--tabs-duration:var(--mono-spring-control-duration)]',
  'data-[input=keyboard]:[--tabs-ease:var(--mono-spring-quick)] data-[input=keyboard]:[--tabs-duration:var(--mono-spring-quick-duration)]',
].join(' ')

/** The scroller: it scrolls the list on the horizontal axis when the list is too wide (tabs/overflow). */
export const scroller = [
  'min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  // tabs/focus: the padding and the negative margin keep the focus ring in the scroll area, with no change of the layout.
  'py-(--tabs-ring) -my-(--tabs-ring)',
  // tabs/overflow-focus: a tab that gets the focus shows with its focus ring.
  'scroll-px-(--tabs-ring)',
].join(' ')

/** The list: the tabs on one line, with the line of 1 px at its bottom edge. */
export const list = [
  'relative flex w-max min-w-full flex-nowrap items-stretch',
  // tabs/list: the gap between two tabs is 24 px.
  'gap-(--mono-space-6)',
  // tabs/focus: the padding keeps the focus ring of the first tab and of the last tab in the scroll area.
  'px-(--tabs-ring)',
  // tabs/list: the line of 1 px in the line color, for the full width of the list.
  'border-b-(length:--mono-tabs-list-line) border-solid border-mono-line',
].join(' ')

/** A tab: the target of one view. It has the full height of the list. */
export const tab = [
  'relative inline-flex shrink-0 cursor-pointer select-none items-center whitespace-nowrap outline-none',
  // tabs/density: 40 px for pointer and 52 px for touch. tabs/list: 2 px at the start side and at the end side.
  'h-(--mono-size-control-lg) px-(--mono-tabs-tab-padding-inline) gap-(--mono-tabs-count-gap)',
  // tabs/label: the muted text color. tabs/hover: only a device with hover shows the body text color.
  'text-mono-fg-muted not-data-[active]:not-data-[disabled]:hover:text-mono-fg',
  // tabs/selected-sign: the strong text color.
  'data-[active]:text-mono-fg-strong',
  // tabs/motion: the label color changes in 150 ms. Reduced motion keeps the change of color.
  'transition-[color] duration-(--mono-duration-fast) ease-(--mono-easing-standard)',
  // tabs/focus: the focus ring of the language, for keyboard focus only.
  'focus-visible:outline-solid focus-visible:outline-(length:--mono-focus-ring-width) focus-visible:outline-mono-ring',
  'focus-visible:outline-offset-(--mono-focus-ring-offset)',
  // tabs/disabled
  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-(--mono-opacity-disabled)',
  // tabs/target: the target has the full height of the tab and the minimum target of the density on each axis. A tab
  // is the minimum target less half the gap wide or more. Thus each extension is half the gap or less, and the targets
  // of two tabs do not overlap.
  'min-w-[calc(var(--mono-size-target-min)-var(--mono-space-6)/2)] justify-center',
  "after:absolute after:inset-y-0 after:content-['']",
].join(' ')

/**
 * The target of a narrow tab extends into the gap next to it (tabs/target). A tab in the middle extends to its two
 * sides. The first tab extends only to its end side, and the last tab only to its start side: thus the target stays in
 * the list, and it does not make the list wider than its tabs.
 */
export const tabTargets = {
  first: 'after:start-0 after:end-[min(0px,calc(100%-var(--mono-size-target-min)))]',
  center: 'after:inset-x-[min(0px,calc((100%-var(--mono-size-target-min))/2))]',
  last: 'after:start-[min(0px,calc(100%-var(--mono-size-target-min)))] after:end-0',
} as const

export type TargetPlace = keyof typeof tabTargets

/** The size of the label and its weight (tabs/density, tabs/label, tabs/selected-sign, tabs/tv-label). */
export const tabSizes: Record<Size, string> = {
  md: 'text-mono-body data-[active]:font-mono-strong',
  // tabs/tv-label: 24 px, with a line height of 32 px and the weight 500.
  tv: 'text-(length:--mono-tabs-tv-label-size) leading-(--mono-tabs-tv-label-line-height) font-mono-strong',
}

/** The label and a copy in the strong weight. The copy keeps the width of the tab when the weight changes. */
export const label = 'grid'
export const labelLayer = 'col-start-1 row-start-1'

/** The count: a pill after the label (tabs/count-shape). */
export const count = [
  'inline-flex shrink-0 items-center justify-center rounded-mono-full tabular-nums leading-none',
  'h-(--mono-tabs-count-height) min-w-(--mono-tabs-count-min-width) px-(--mono-tabs-count-padding-inline)',
  // tabs/count-shape: the selected fill, the secondary text color, and the strong weight. tabs/density: 12 px and 13 px.
  'bg-mono-selected text-mono-fg-2 text-mono-caption font-mono-strong',
].join(' ')

/** The indicator: the sign of the selected tab. */
export const indicator = [
  'pointer-events-none absolute left-0 w-(--active-tab-width) translate-x-(--active-tab-left)',
  // tabs/indicator: on the bottom line of the list. It covers the line, thus the line does not show below it.
  '-bottom-(--mono-tabs-indicator-overlap)',
  // tabs/selected-sign and tabs/indicator: the strong text color and a radius of 2 px. Forced colors keep the line.
  'rounded-(--mono-tabs-indicator-radius) bg-mono-fg-strong forced-colors:bg-[CanvasText]',
  // tabs/motion: the spring of the root moves the indicator and changes its width. Where no spring applies, 280 ms
  // with ease-out.
  'transition-[translate,width] duration-(--tabs-duration) ease-(--tabs-ease)',
  'not-supports-[transition-timing-function:linear(0,1)]:duration-(--mono-duration-slide)',
  'not-supports-[transition-timing-function:linear(0,1)]:ease-(--mono-easing-out)',
  // tabs/reduced-motion: the indicator goes to the selected tab with no movement.
  'motion-reduce:transition-none [[data-motion=reduced]_&]:transition-none',
].join(' ')

/** The height of the indicator: 2 px, and 4 px on a TV (tabs/selected-sign, tabs/tv). */
export const indicatorHeights: Record<Size, string> = {
  md: 'h-(--mono-tabs-indicator-height)',
  tv: 'h-(--mono-tabs-tv-indicator-height)',
}

/** The panels: one cell of a grid. The panel that goes out and the next panel share the cell during the cross-fade. */
export const panels = 'grid min-w-0'

/** A panel: the content of the selected tab. */
export const panel = [
  'col-start-1 row-start-1 min-w-0',
  // tabs/panel-motion and tabs/reduced-motion: no slide. The panel changes with a cross-fade of 150 ms.
  'transition-opacity duration-(--mono-duration-fast) ease-(--mono-easing-standard)',
  'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
].join(' ')
