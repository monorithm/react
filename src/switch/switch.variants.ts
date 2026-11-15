// The look of the Switch (contract: ir/contracts/switch.json): each size comes from --mono-switch-* (components.css).

/** The row: the target. */
export const switchRow = [
  'group/switch flex w-full cursor-pointer items-center justify-between gap-3',
  // switch/target: the full row is the target, 44 px high or more in the touch density.
  'min-h-(--mono-size-target-min)',
  'has-[[data-disabled]]:cursor-not-allowed',
].join(' ')

/** The track: the control. */
export const switchTrack = [
  'relative inline-flex shrink-0 rounded-mono-full outline-none',
  'w-(--mono-switch-track-width) h-(--mono-switch-track-height)',
  // Off: the pressed fill with a ring in line-strong. On: the accent fill (switch/on-sign).
  'bg-mono-pressed shadow-[inset_0_0_0_1px_var(--mono-color-role-line-strong)]',
  'data-[checked]:bg-mono-accent data-[checked]:shadow-none',
  'transition-[background-color,box-shadow] duration-(--mono-spring-control-duration) ease-(--mono-spring-control)',
  // switch/focus: the focus ring of the language.
  'focus-visible:outline-solid focus-visible:outline-(length:--mono-focus-ring-width) focus-visible:outline-mono-ring',
  'focus-visible:outline-offset-(--mono-focus-ring-offset)',
  // switch/disabled
  'data-[disabled]:opacity-(--mono-opacity-disabled)',
  // switch/motion: reduced motion (the system option, or data-motion="reduced" on an ancestor) has no movement.
  'motion-reduce:transition-none [[data-motion=reduced]_&]:transition-none',
].join(' ')

/** The knob. */
export const switchKnob = [
  'absolute top-(--mono-switch-knob-inset) start-(--mono-switch-knob-inset)',
  'size-(--mono-switch-knob-size) rounded-mono-full bg-mono-switch-knob-off shadow-mono-knob',
  'data-[checked]:bg-mono-switch-knob-on',
  // switch/on-sign and switch/direction: on moves the knob to the end side. In right-to-left, the end side is the left.
  'data-[checked]:translate-x-(--mono-switch-knob-travel) rtl:data-[checked]:-translate-x-(--mono-switch-knob-travel)',
  'transition-[translate,background-color] duration-(--mono-spring-control-duration) ease-(--mono-spring-control)',
  'motion-reduce:transition-none [[data-motion=reduced]_&]:transition-none',
].join(' ')
