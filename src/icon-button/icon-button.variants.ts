// The look of the Icon button that the Button does not share (contract: ir/contracts/icon-button.json).
import type { Size } from '@monorithm/react/button/button.variants'

/** The width of each size: the height of the size, thus a square (icon-button/square). */
export const iconButtonWidths: Record<Size, string> = {
  sm: 'w-(--mono-size-control-sm)',
  md: 'w-(--mono-size-control-md)',
  lg: 'w-(--mono-size-control-lg)',
}
