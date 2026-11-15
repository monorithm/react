// The look of the Checkbox (contract: ir/contracts/checkbox.json): each size comes from --mono-checkbox-*.
import { FOCUS } from '@monorithm/react/lib/row'

/** The box: the control. */
export const checkboxBox = [
  'relative inline-flex size-(--mono-checkbox-box-size) shrink-0 items-center justify-center rounded-(--mono-checkbox-box-radius)',
  // checkbox/on-sign: off has the surface fill and the field line; on and mixed have the accent fill.
  'border-(length:--mono-checkbox-box-border) border-mono-field-line bg-mono-surface',
  'data-[checked]:border-mono-accent data-[checked]:bg-mono-accent data-[indeterminate]:border-mono-accent data-[indeterminate]:bg-mono-accent',
  'transition-[background-color,border-color] duration-(--mono-duration-fast) ease-(--mono-easing-standard)',
  FOCUS,
  // checkbox/disabled
  'data-[disabled]:opacity-(--mono-opacity-disabled)',
].join(' ')

/** The mark: a check for on, a dash for mixed. */
export const checkboxMark = [
  'flex size-full items-center justify-center text-mono-accent-fg',
  // checkbox/motion: the mark grows with spring-control. With reduced motion, it shows with no scale.
  'scale-0 data-[checked]:scale-100 data-[indeterminate]:scale-100',
  'transition-[scale] duration-(--mono-spring-control-duration) ease-(--mono-spring-control)',
  'motion-reduce:transition-none [[data-motion=reduced]_&]:transition-none',
].join(' ')
