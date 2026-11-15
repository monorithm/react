// The row of a choice: the Checkbox and the options of the Radio group. The full row is the target, and the control is
// centered on the first line of the label.

/** The target: the full row, 44 px high or more in the touch density (checkbox/target, radio-group/target). */
export const ROW = 'flex w-full min-h-(--mono-size-target-min) cursor-pointer items-center has-[[data-disabled]]:cursor-not-allowed'
/** The control and the text. The control is centered on the first line of the label (the height of one line, 1lh). */
export const ROW_INNER = 'flex min-w-0 items-start text-mono-body'
export const LINE = 'flex h-lh shrink-0 items-center'
export const TEXT = 'flex min-w-0 flex-col gap-0.5'
export const LABEL = 'text-mono-fg'
export const DESCRIPTION = 'text-mono-small text-mono-fg-muted'
/** The focus ring of the language: 2 px in the ring color, 2 px from the control. */
export const FOCUS =
  'outline-none focus-visible:outline-solid focus-visible:outline-(length:--mono-focus-ring-width) focus-visible:outline-mono-ring focus-visible:outline-offset-(--mono-focus-ring-offset)'
