// The look that the Button and the Icon button share (contracts: ir/contracts/button.json, ir/contracts/icon-button.json).
// Each variant sets local custom properties: the fill, the border, and the label color at rest, at hover, and pressed.
// The base classes read them, with a fallback for each property that a variant does not set. Thus one set of state
// classes serves each variant, two classes never set the same property, and Tailwind sees each class as a literal.

export type Size = 'sm' | 'md' | 'lg'

/** The fill, the border, and the label color of each variant (button/variant, icon-button variants). */
export const buttonVariants = {
  primary:
    'font-mono-strong [--btn-fill:var(--mono-color-role-primary)] [--btn-fill-hover:var(--mono-color-role-primary-hover)] [--btn-label:var(--mono-color-role-primary-fg)]',
  secondary:
    '[--btn-fill:var(--mono-color-role-selected)] [--btn-fill-hover:var(--mono-color-role-pressed)] [--btn-fill-pressed:var(--mono-color-role-pressed)] [--btn-border:var(--mono-color-role-line)] [--btn-border-hover:var(--mono-color-role-line-strong)]',
  outline:
    '[--btn-fill-hover:var(--mono-color-role-selected)] [--btn-fill-pressed:var(--mono-color-role-pressed)] [--btn-border:var(--mono-color-role-line)] [--btn-border-hover:var(--mono-color-role-line-strong)]',
  ghost: '[--btn-fill-hover:var(--mono-color-role-hover)] [--btn-fill-pressed:var(--mono-color-role-pressed)]',
  destructive:
    'font-mono-strong [--btn-fill:var(--mono-color-role-danger-soft)] [--btn-fill-hover:var(--mono-color-role-danger-soft-strong)] [--btn-label:var(--mono-color-role-danger-text)]',
  // The link: no fill, the accent text, and an underline at hover. It has no --btn-press, thus no scale. Its opacity goes
  // to 0.8 when pressed.
  link: '[--btn-label:var(--mono-color-role-accent-text)] hover:underline underline-offset-3 not-data-[disabled]:active:opacity-(--mono-opacity-link-pressed)',
  // The round icon button: the raised fill and the second text color (icon-button/round).
  round:
    '[--btn-fill:var(--mono-color-role-raised)] [--btn-fill-hover:var(--mono-color-role-selected)] [--btn-fill-pressed:var(--mono-color-role-pressed)] [--btn-label:var(--mono-color-role-fg-2)]',
} as const

/** The height of each size, from the density (button/size, icon-button/square). */
export const buttonHeights: Record<Size, string> = {
  sm: 'h-(--mono-size-control-sm)',
  md: 'h-(--mono-size-control-md)',
  lg: 'h-(--mono-size-control-lg)',
}

/** The state classes of the two buttons. Each var() has a fallback: a variant sets only the properties that it changes. */
export const buttonBase = [
  // The component adds the display: inline-flex, or flex for a block button.
  'relative shrink-0 select-none items-center justify-center whitespace-nowrap outline-none',
  'cursor-pointer data-[disabled]:cursor-not-allowed',
  // The component sets --btn-border-width from the geometry of its contract.
  'border-(length:--btn-border-width) border-[color:var(--btn-border,transparent)] bg-[color:var(--btn-fill,transparent)]',
  'text-[color:var(--btn-label,var(--mono-color-role-fg))]',
  // button/hover: Tailwind puts hover: in @media (hover: hover). Thus a phone shows only the pressed state.
  'not-data-[disabled]:hover:border-[color:var(--btn-border-hover,var(--btn-border,transparent))]',
  'not-data-[disabled]:hover:bg-[color:var(--btn-fill-hover,var(--btn-fill,transparent))]',
  // button/press: the pressed fill and the press scale at pointer down. The component sets --btn-press.
  'not-data-[disabled]:active:bg-[color:var(--btn-fill-pressed,var(--btn-fill-hover,var(--btn-fill,transparent)))]',
  'not-data-[disabled]:active:scale-[var(--btn-press,1)]',
  // button/motion: reduced motion (the system option, or data-motion="reduced" on an ancestor) has no scale.
  'motion-reduce:[--btn-press:1] [[data-motion=reduced]_&]:[--btn-press:1]',
  // The color changes in dur-fast, the scale in dur-press.
  '[transition-property:background-color,border-color,color,opacity,scale] ease-(--mono-easing-standard)',
  '[transition-duration:var(--mono-duration-fast),var(--mono-duration-fast),var(--mono-duration-fast),var(--mono-duration-fast),var(--mono-duration-press)]',
  // button/focus: the focus ring of the language, for keyboard focus only.
  'focus-visible:outline-solid focus-visible:outline-(length:--mono-focus-ring-width) focus-visible:outline-mono-ring',
  'focus-visible:outline-offset-(--mono-focus-ring-offset)',
  // button/disabled
  'data-[disabled]:opacity-(--mono-opacity-disabled)',
  // button/target: the target is the minimum target of the density or more, on each axis, at the center of the button.
  "after:absolute after:top-1/2 after:left-1/2 after:size-full after:-translate-1/2 after:content-['']",
  'after:min-h-(--mono-size-target-min) after:min-w-(--mono-size-target-min)',
].join(' ')

/** The horizontal padding of each size (the geometry of the contract). */
export const buttonPaddings: Record<Size, string> = {
  sm: 'px-(--mono-button-sm-padding)',
  md: 'px-(--mono-button-md-padding)',
  lg: 'px-(--mono-button-lg-padding)',
}

/** One layer of the content: the icons and the label, or the spinner and the activity. */
export const buttonLayer = 'col-start-1 row-start-1 inline-flex items-center justify-center gap-(--mono-button-icon-gap)'
/** The box of an icon: the icon size of the density (button/icon). */
export const buttonIcon = 'inline-flex size-(--mono-size-icon) shrink-0 items-center justify-center [&>svg]:size-full'
