// The look of the Radio group (contract: ir/contracts/radio-group.json): each size comes from --mono-radio-group-*.

/** The ring: the control of an option. */
export const radioRing = [
  'relative inline-flex size-(--mono-radio-group-ring-size) shrink-0 items-center justify-center rounded-mono-full',
  // radio-group/selected-sign: the accent border and the accent dot.
  'border-(length:--mono-radio-group-ring-border) border-mono-field-line bg-mono-surface data-[checked]:border-mono-accent',
  'transition-[border-color] duration-(--mono-duration-fast) ease-(--mono-easing-standard)',
  // radio-group/disabled
  'data-[disabled]:opacity-(--mono-opacity-disabled)',
].join(' ')

/** The dot: the sign of the selected option. */
export const radioDot = [
  'size-(--mono-radio-group-dot-size) rounded-mono-full bg-mono-accent',
  // radio-group/motion: the dot grows with spring-control, or with spring-quick when the keyboard moves the selection.
  'scale-0 data-[checked]:scale-100',
  'transition-[scale] duration-(--mono-spring-control-duration) ease-(--mono-spring-control)',
  '[[data-input=keyboard]_&]:duration-(--mono-spring-quick-duration) [[data-input=keyboard]_&]:ease-(--mono-spring-quick)',
  'motion-reduce:transition-none [[data-motion=reduced]_&]:transition-none',
].join(' ')

/** An option card: the cards variant. */
export const radioCard = [
  'flex w-full min-h-(--mono-size-target-min) cursor-pointer items-start gap-(--mono-radio-group-card-gap) text-mono-body',
  'py-(--mono-radio-group-card-padding-block) px-(--mono-radio-group-card-padding-inline) rounded-mono-lg',
  'border border-mono-line bg-mono-surface',
  'transition-[background-color,border-color] duration-(--mono-duration-fast) ease-(--mono-easing-standard)',
  'not-has-[[data-disabled]]:hover:border-mono-line-strong has-[[data-disabled]]:cursor-not-allowed',
  // radio-group/selected-sign: a selected card has the accent border and the accent tint.
  'has-[[data-checked]]:border-mono-accent has-[[data-checked]]:bg-mono-accent-soft',
  // radio-group/focus: the focus ring shows on the full card.
  'has-[[role=radio]:focus-visible]:outline-solid has-[[role=radio]:focus-visible]:outline-(length:--mono-focus-ring-width)',
  'has-[[role=radio]:focus-visible]:outline-mono-ring has-[[role=radio]:focus-visible]:outline-offset-(--mono-focus-ring-offset)',
].join(' ')
