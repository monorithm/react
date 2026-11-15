// The look of the Chip (contract: ir/contracts/chip.json). The base of the buttons (../button/button.variants) gives the
// press, the target, the focus ring, the transitions, and the disabled state. Each state of the chip sets the local
// custom properties of that base: the fill, the border, and the label color. Thus two classes never set the same
// property. Each size comes from the tokens of the density and from --mono-chip-* (components.css).
import { buttonBase, buttonIcon } from '../button/button.variants'

/** The container: the target, the fill, and the border. It has the full radius. */
export const chipBase = [
  // chip/target, chip/press, chip/focus, chip/disabled: the base of the buttons.
  buttonBase,
  // chip/density: the height and the label size of the density. The component adds no other height or text size.
  'inline-flex h-(--mono-size-control-md) text-mono-small',
  // chip/shape: the full radius, a border of 1 px, and 12 px of padding at the start side and at the end side.
  'rounded-mono-full px-(--mono-chip-container-padding-inline) [--btn-border-width:var(--mono-chip-border)]',
  // chip/icon: 6 px between the check or the chevron and the label.
  'gap-(--mono-chip-icon-gap)',
  // chip/press: at pointer down, the chip scales to the press scale in dur-press.
  '[--btn-press:var(--mono-scale-press)]',
  // chip/motion: with reduced motion, the colors change with no transition. The base sets the press scale to 1.
  'motion-reduce:transition-none [[data-motion=reduced]_&]:transition-none',
].join(' ')

/** The colors of each state. The component picks one class in TypeScript. */
export const chipStates = {
  off: [
    // chip/off-sign: no fill, a border in the line color, and the label in the secondary text color.
    '[--btn-border:var(--mono-color-role-line)] [--btn-label:var(--mono-color-role-fg-2)]',
    // chip/hover: the hover fill and the label in the body text color. Tailwind puts hover: in @media (hover: hover).
    '[--btn-fill-hover:var(--mono-color-role-hover)] not-data-[disabled]:hover:[--btn-label:var(--mono-color-role-fg)]',
    // chip/press: the chip has no pressed fill. At pointer down the fill stays: no fill on a phone, the hover fill on a
    // device with hover.
    '[--btn-fill-pressed:transparent] not-data-[disabled]:hover:[--btn-fill-pressed:var(--mono-color-role-hover)]',
  ].join(' '),
  // chip/on-sign: the accent tint fill, the label in the accent text color, and the strong weight. chip/on-border: the
  // border has no color, but its width stays. chip/hover: the colors stay at hover and at pointer down.
  on: 'font-mono-strong [--btn-fill:var(--mono-color-role-accent-soft)] [--btn-label:var(--mono-color-role-accent-text)]',
} as const

/** The check and the chevron: the icon size of the density and the color of the label (chip/icon). */
export const chipIcon = buttonIcon

/** A set of chips: a gap of 8 px. The chips go from the start side to the end side (chip/gap, chip/direction). */
export const chipSet = 'flex flex-wrap items-center gap-(--mono-chip-set-gap)'
