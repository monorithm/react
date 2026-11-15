// The look of the Code entry (contract: ir/contracts/code-entry.json). A box has the look of a text field: the fill, the
// field line, the focus border, and the soft ring of a field. Each size comes from --mono-code-entry-* (components.css).
// The border color and the soft ring have one class for each state, and the states do not overlap (not-focus,
// not-aria-invalid). Thus two classes never set the same property in the same state.

/**
 * The group: the label, the boxes, the line of the error text, and the timer. In a right-to-left layout, they align to
 * the right edge (code-entry/direction). The contract gives no gap: this is the gap of a text field (text-field/spacing).
 */
export const codeEntryRoot = 'flex flex-col items-start gap-(--mono-code-entry-label-gap)'

/** The name of the group, above the boxes: the label of a text field. */
export const codeEntryLabel = 'text-mono-small font-mono-strong text-mono-fg-2'

/** The row of the boxes. The component gives it dir="ltr" (code-entry/direction). */
export const codeEntryBoxes = 'flex max-w-full gap-(--mono-code-entry-box-gap)'

/** A box: a text field for one digit, and the target. */
export const codeEntryBox = [
  // code-entry/density and code-entry/fit: the width and the height of the density. On a narrow screen, the box gets
  // narrower, and it stays at the minimum target or more (code-entry/target).
  'box-border shrink p-0 w-(--mono-code-entry-box-width) min-w-(--mono-size-target-min) h-(--mono-code-entry-box-height)',
  // code-entry/shape: the surface fill, a border of 1 px in the field line color, and the medium radius.
  'rounded-mono-md bg-mono-surface border-(length:--mono-code-entry-box-border) border-mono-field-line outline-none',
  // code-entry/digit: at the center, with tabular figures, the strong weight, and the size title-2.
  'text-center text-mono-title-2 font-mono-strong tabular-nums text-mono-fg',
  // code-entry/hover: Tailwind puts hover: in @media (hover: hover). Thus only a device with hover shows it.
  'enabled:not-focus:not-aria-invalid:hover:border-mono-fg-muted',
  // code-entry/focus: the focus of a field for each input method. Thus focus:, not focus-visible:.
  'not-aria-invalid:focus:border-mono-ring',
  'not-aria-invalid:focus:[box-shadow:0_0_0_var(--mono-focus-field-ring-width)_var(--mono-color-role-accent-soft)]',
  // code-entry/error-sign: the danger border on each box, and the danger soft ring on the box with the focus.
  'aria-invalid:border-mono-danger',
  'aria-invalid:focus:[box-shadow:0_0_0_var(--mono-focus-field-ring-width)_var(--mono-color-role-danger-soft)]',
  // code-entry/motion: the border and the soft ring change in dur-fast. Reduced motion (the system option, or
  // data-motion="reduced" on an ancestor) has no transition. The change of color stays.
  'transition-[border-color,box-shadow] duration-(--mono-duration-fast) ease-(--mono-easing-standard)',
  'motion-reduce:transition-none [[data-motion=reduced]_&]:transition-none',
  // code-entry/disabled
  'disabled:cursor-not-allowed disabled:opacity-(--mono-opacity-disabled)',
].join(' ')

/** The line below the boxes. It keeps the height of one line, thus the error text moves nothing (code-entry/motion). */
export const codeEntryMessage = 'grid min-h-lh text-mono-small'

/** The error text, in the danger text color (code-entry/error-text). It fades in with dur-fast (code-entry/motion). */
export const codeEntryError = [
  'col-start-1 row-start-1 text-mono-danger-text',
  'opacity-0 data-[shown]:opacity-100 transition-opacity duration-(--mono-duration-fast) ease-(--mono-easing-standard)',
  'motion-reduce:transition-none [[data-motion=reduced]_&]:transition-none',
].join(' ')

/** The cause of the disabled state, in the line of the error text (code-entry/disabled). */
export const codeEntryReason = 'col-start-1 row-start-1 text-mono-fg-muted'

/** The timer: the muted text with tabular figures (code-entry/timer). It follows the direction of the layout. */
export const codeEntryTimer = 'text-mono-small text-mono-fg-muted tabular-nums'
