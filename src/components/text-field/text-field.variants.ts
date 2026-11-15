// The look of the Text field (contract: ir/contracts/text-field.json), and the shared look of a field: the box of the
// input, the label, the help, the warning, the error, the focus border, and the soft ring. The Select and the Code entry
// can use the shared look. A component sets these local custom properties from the geometry of its contract:
//   --field-border     the width of the border of the box
//   --field-gap        the gap between the label, the box, and the help or the error
//   --field-icon       the size of the icon of the error and of the warning
//   --field-icon-gap   the gap between that icon and its text
// The state classes of the box read data-invalid, data-disabled, and :focus-within. Thus the box can be the control (for
// example a textarea or a button), or a group around the control and its add-ons (text-field/focus-group). The states
// do not overlap: two classes never set the same property in the same state.

/** The field: the label row, the box, and the help, the warning, or the error, in one column. */
export const fieldGroup = 'flex min-w-0 flex-col gap-(--field-gap)'

/** The label: above the box at all times (text-field/label). The name has the strong weight. */
export const fieldLabel = 'text-mono-small text-mono-fg-2'
export const fieldLabelText = 'font-mono-strong'
/** The word optional: the regular weight of the label and the muted text color (text-field/optional). */
export const fieldOptional = 'text-mono-fg-muted'

/** The box: the border, the fill, the hover, the focus, the error, and the disabled state. */
export const fieldBox = [
  // text-field/border: 1 px in the field line color.
  'rounded-mono-md border-(length:--field-border) border-mono-field-line',
  // text-field/disabled: the background fill and the disabled opacity.
  'not-data-[disabled]:bg-mono-surface data-[disabled]:bg-mono-bg data-[disabled]:opacity-(--mono-opacity-disabled)',
  // text-field/hover: Tailwind puts hover: in @media (hover: hover). The focus, the error, and the disabled state keep their border.
  'not-data-[disabled]:not-data-[invalid]:not-focus-within:hover:border-mono-fg-muted',
  // text-field/focus: each focus, not only the keyboard focus, gives the ring color to the border.
  'not-data-[invalid]:focus-within:border-mono-ring',
  // text-field/error-sign and text-field/error-focus: the danger border, also when the box has the focus.
  'data-[invalid]:border-mono-danger',
  // text-field/focus and text-field/error-focus: the soft ring of 3 px around the border, in the accent tint or the
  // danger tint. At rest the ring is transparent. Thus only its color changes, and the box does not move.
  'shadow-[0_0_0_var(--mono-focus-field-ring-width)_var(--field-ring)] [--field-ring:transparent]',
  'not-data-[invalid]:focus-within:[--field-ring:var(--mono-color-role-accent-soft)]',
  'data-[invalid]:focus-within:[--field-ring:var(--mono-color-role-danger-soft)]',
  // text-field/motion: the border and the ring change color in dur-fast with the standard easing. Reduced motion keeps
  // the change of color (text-field/reduced-motion). The box never shakes and never scales.
  'transition-[border-color,box-shadow] duration-(--mono-duration-fast) ease-(--mono-easing-standard)',
].join(' ')

/** The help text: one line below the box (text-field/help). */
export const fieldHelp = 'text-mono-small text-mono-fg-muted'

/** The row of the error or the warning: the icon comes before the text. The text fades in with dur-fast (text-field/motion). */
const fieldMessage = [
  'flex items-start gap-(--field-icon-gap) text-mono-small',
  'transition-opacity duration-(--mono-duration-fast) ease-(--mono-easing-standard) starting:opacity-0',
].join(' ')

/** The error: the danger text color (text-field/error-sign). */
export const fieldError = `${fieldMessage} text-mono-danger-text`
/** The warning: the warning text color (text-field/warning-sign). */
export const fieldWarning = `${fieldMessage} text-mono-warning-text`
/** The icon of the error or the warning, on the center of the first line of the text. */
export const fieldMessageIcon = 'flex h-lh shrink-0 items-center [&>svg]:size-(--field-icon)'

// The Text field. The local custom properties of the shared look come from the geometry of the contract. --tf-pad is the
// inline padding of the input. --tf-gap is the gap between an add-on and the value: the contract gives no gap for an
// add-on, thus the field uses the gap of the error icon.
export const textFieldVars = [
  '[--field-border:var(--mono-text-field-input-border)] [--field-gap:var(--mono-text-field-label-gap)]',
  '[--field-icon:var(--mono-text-field-error-icon)] [--field-icon-gap:var(--mono-text-field-error-icon-gap)]',
  '[--tf-pad:var(--mono-text-field-input-padding-inline)] [--tf-gap:var(--mono-text-field-add-on-gap)]',
].join(' ')

/** The label row: the label at the start side, the counter at the end side (text-field/counter). */
export const textFieldLabelRow = 'flex items-baseline justify-between gap-(--field-gap)'
/** The counter of a multi-line field. */
export const textFieldCounter = 'shrink-0 text-mono-small text-mono-fg-muted tabular-nums'

/** The group of a single-line field: the box around the add-ons and the input (text-field/focus-group). */
export const textFieldGroup = [
  'flex h-(--mono-size-control-md) min-w-0 items-stretch overflow-hidden',
  'not-data-[disabled]:cursor-text data-[disabled]:cursor-not-allowed',
].join(' ')

/** The input of a single-line field. The text is 14 px for pointer and 16 px for touch (text-field/density, text-field/no-zoom). */
export const textFieldInput = [
  'min-w-0 flex-1 bg-transparent text-mono-body text-mono-fg outline-none placeholder:text-mono-fg-muted',
  'disabled:cursor-not-allowed',
].join(' ')

/** The inline padding of the input: the padding of the contract at an edge, the add-on gap after an icon or before a hint. */
export const textFieldInputStart = { edge: 'ps-(--tf-pad)', addOn: 'ps-(--tf-gap)' } as const
export const textFieldInputEnd = { edge: 'pe-(--tf-pad)', addOn: 'pe-(--tf-gap)' } as const

/**
 * The value of digits, numbers, and codes keeps the left-to-right order. In a right-to-left layout it is at the right
 * edge (text-field/direction-end).
 */
export const textFieldLtr = 'rtl:text-right'

/** A multi-line input: 96 px high or more, and the user can make it higher (text-field/multi-line). */
export const textFieldArea = [
  'block w-full min-h-(--mono-text-field-multi-line-min-height) resize-y disabled:resize-none',
  'py-(--mono-text-field-multi-line-padding-block) px-(--mono-text-field-input-padding-inline)',
  'text-mono-body leading-(--mono-text-field-multi-line-line-height) text-mono-fg outline-none placeholder:text-mono-fg-muted',
  'disabled:cursor-not-allowed',
].join(' ')

/** The leading icon: the icon size of the density, in the muted text color (text-field/search). */
export const textFieldIcon = 'flex shrink-0 items-center ps-(--tf-pad) text-mono-fg-muted [&>svg]:size-(--mono-size-icon) [&>svg]:shrink-0'

/** A prefix or a suffix, for example a currency symbol. A line of 1 px separates it from the value (text-field/prefix). */
const textFieldAffix = 'flex shrink-0 items-center px-(--tf-pad) whitespace-nowrap text-mono-body text-mono-fg-muted border-mono-line'
export const textFieldPrefix = `${textFieldAffix} border-e-(length:--mono-text-field-prefix-separator)`
export const textFieldSuffix = `${textFieldAffix} border-s-(length:--mono-text-field-prefix-separator)`

/**
 * The keyboard hint: 20 px high, with a radius of 5 px (text-field/hint). It shows only with a fine pointer: a laptop or
 * a desktop. The contract gives no padding and no inset for the hint: the padding is the radius, the minimum width is the
 * height, and the inset from the end edge is the add-on gap.
 */
export const textFieldHint = [
  'hidden pointer-fine:flex shrink-0 items-center justify-center self-center me-(--tf-gap)',
  'h-(--mono-text-field-hint-height) min-w-(--mono-text-field-hint-height) px-(--mono-text-field-hint-radius) rounded-(--mono-text-field-hint-radius)',
  'border-(length:--mono-text-field-input-border) border-mono-line-strong bg-mono-selected text-mono-small text-mono-fg-2',
].join(' ')
