// The look of the Alert and the banner (contract: ir/contracts/alert.json). The tokens of the contract and the geometry
// --mono-alert-* (components.css) give each value. The component picks one class of each table, thus two classes never
// set the same property. The motion sets local custom properties, and one set of classes reads them with a fallback.

export type AlertVariant = 'inline' | 'banner'
/** The tones of an inline alert. */
export type AlertTone = 'info' | 'success' | 'warning' | 'danger'
/** The tones of a banner: the four tones of an alert, and neutral. */
export type BannerTone = AlertTone | 'neutral'
/** The motion of the entrance: expand, fade, or none (alert/motion). */
export type AlertMotion = 'expand' | 'fade' | 'none'

/** The outer box: a grid of one row. The row goes from 0fr to 1fr when the alert expands. */
export const alertRoot = [
  // alert/in-flow and alert/no-cover: the alert is in the flow of the page. It has no fixed and no absolute position.
  'grid grid-rows-[1fr]',
  // alert/motion: the row (the expand) and the opacity (the fade). A kind of motion sets the local custom properties.
  // The fallbacks give no motion.
  '[transition-property:grid-template-rows,opacity]',
  '[transition-duration:var(--alert-expand-duration,0s),var(--alert-fade-duration,0s)]',
  '[transition-timing-function:var(--mono-easing-in-out),var(--mono-easing-standard)]',
  // The entrance starts from the first style of the alert (@starting-style). The exit goes to data-ending-style.
  'starting:grid-rows-[var(--alert-rows-hidden,1fr)] starting:opacity-[var(--alert-opacity-hidden,1)]',
  'data-[ending-style]:grid-rows-[var(--alert-rows-hidden,1fr)] data-[ending-style]:opacity-[var(--alert-opacity-hidden,1)]',
].join(' ')

/** The box in the row: it clips the alert while the row expands. */
export const alertClip = 'min-h-0 overflow-hidden'

// alert/reduced-motion: no expand. The alert fades in 150 ms (dur-fast) and fades out in 100 ms (dur-press), and the
// content moves to its new position immediately. The system option, or data-motion="reduced" on an ancestor.
const reduced = [
  'motion-reduce:[--alert-rows-hidden:1fr] motion-reduce:[--alert-opacity-hidden:0]',
  'motion-reduce:[--alert-fade-duration:var(--mono-duration-fast)]',
  'motion-reduce:data-[ending-style]:[--alert-fade-duration:var(--mono-duration-press)]',
  '[[data-motion=reduced]_&]:[--alert-rows-hidden:1fr] [[data-motion=reduced]_&]:[--alert-opacity-hidden:0]',
  '[[data-motion=reduced]_&]:[--alert-fade-duration:var(--mono-duration-fast)]',
  '[[data-motion=reduced]_&]:data-[ending-style]:[--alert-fade-duration:var(--mono-duration-press)]',
].join(' ')

/** The motion of each kind of entrance (alert/motion). */
export const alertMotions: Record<AlertMotion, string> = {
  // A banner and an inline warning alert expand in 200 ms (dur-base) with ease-in-out. A banner that closes goes back
  // in the same time.
  expand: `[--alert-rows-hidden:0fr] [--alert-expand-duration:var(--mono-duration-base)] ${reduced}`,
  // An inline danger alert fades in 150 ms (dur-fast) with the standard easing. It does not shake: no translate.
  fade: `[--alert-opacity-hidden:0] [--alert-fade-duration:var(--mono-duration-fast)] ${reduced}`,
  // An inline info alert and an inline success alert show with no motion.
  none: '',
}

/** The area of the alert: the soft fill of the tone, the icon, the text, the action, and the close button. */
export const alertContainer = 'flex min-w-0 gap-(--mono-alert-icon-gap)'

/** The shape and the padding of each variant (alert/shape, alert/padding). */
export const alertShapes: Record<AlertVariant, string> = {
  // The radius of a card: radius-lg of the density.
  inline: 'rounded-mono-lg px-(--mono-alert-inline-padding-inline) py-(--mono-alert-inline-padding-block)',
  // alert/direction: the padding is on the logical sides. The start side has 16 px, the end side 12 px.
  banner:
    'rounded-(--mono-alert-banner-radius) py-(--mono-alert-banner-padding-block) ps-(--mono-alert-banner-padding-start) pe-(--mono-alert-banner-padding-end)',
}

/** The fill of each tone: the soft color of the tone. A neutral banner has the fill of a selected item (alert/fill). */
export const alertFills: Record<BannerTone, string> = {
  info: 'bg-mono-accent-soft',
  success: 'bg-mono-success-soft',
  warning: 'bg-mono-warning-soft',
  danger: 'bg-mono-danger-soft',
  neutral: 'bg-mono-selected',
}

/** The color of the icon: the text color of the tone (alert/icon-style). */
export const alertIconColors: Record<BannerTone, string> = {
  info: 'text-mono-accent-text',
  success: 'text-mono-success-text',
  warning: 'text-mono-warning-text',
  danger: 'text-mono-danger-text',
  neutral: 'text-mono-fg-2',
}

/** The icon, the title, and the text. alert/gaps: 12 px between the icon and the text. */
export const alertMessage = 'flex min-w-0 items-start gap-(--mono-alert-icon-gap)'

/**
 * The line of the icon: the height of one line of the title (1lh at the body size). Thus the icon aligns with the first
 * line of the title (alert/icon-style).
 */
export const alertIconLine = 'flex h-lh shrink-0 items-center text-mono-body'
/** The box of the icon: the icon size of the density (alert/icon-style, alert/density-values). */
export const alertIconBox = 'inline-flex size-(--mono-size-icon) items-center justify-center [&>svg]:size-full'

/** The title, the text, and the second line. alert/gaps: 2 px between the title and the text. */
export const alertBody = 'flex min-w-0 flex-col gap-(--mono-alert-title-gap)'
/** alert/density and alert/text-color: the body size, the strong weight, and the strong text color. */
export const alertTitle = 'text-mono-body font-mono-strong text-mono-fg-strong'
/** The text: the small size and the secondary color in an inline alert, the body size and the text color in a banner. */
export const alertTexts: Record<AlertVariant, string> = {
  inline: 'text-mono-small text-mono-fg-2',
  banner: 'text-mono-body text-mono-fg',
}
/** The second line of a banner: the small size and the secondary text color (alert/text-color). */
export const alertSecondLine = 'text-mono-small text-mono-fg-2'

/** The action and the close button at the end side. alert/gaps: 4 px between the action and the close button. */
export const alertActions = 'flex shrink-0 items-center gap-(--mono-alert-actions-gap)'
/** alert/phone: the column of the message and the action below it, 12 px apart. */
export const alertColumn = 'flex min-w-0 flex-1 flex-col gap-(--mono-alert-icon-gap)'
/** alert/phone: the action below the text. It aligns with the text: the icon and the gap come before it. */
export const alertActionBelow = 'flex ps-[calc(var(--mono-size-icon)+var(--mono-alert-icon-gap))]'

/** The box of the close button: a small ghost Icon button on the fill of the tone. */
export const alertClose = [
  'inline-flex shrink-0',
  // alert/hover: the icon has the secondary text color, and the strong text color at hover. Tailwind puts hover: in
  // @media (hover: hover), thus only a device with hover shows it. The ghost variant does not set --btn-label.
  '[--btn-label:var(--mono-color-role-fg-2)] hover:[--btn-label:var(--mono-color-role-fg-strong)]',
  // alert/hover: on the fill of the tone, the close button gets the hover fill on a fill. The pressed fill is the same.
  // The child selector is more specific than the class of the ghost variant, thus the order of the classes has no effect.
  '[&>button]:[--btn-fill-hover:var(--mono-color-role-hover-on-fill)] [&>button]:[--btn-fill-pressed:var(--mono-color-role-hover-on-fill)]',
].join(' ')
