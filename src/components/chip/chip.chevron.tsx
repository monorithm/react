// The chevron of a menu chip (contract: ir/contracts/chip.json, chip/menu-value). It is at the end side of the label.
import { chipIcon } from './chip.variants'

/**
 * The chevron: the icon size of the density and the color of the label. Assistive technology does not read it
 * (chip/icon). It points down in the two directions: it has no mirror in a right-to-left layout (chip/chevron-direction).
 */
export function ChipChevron() {
  return (
    <svg aria-hidden="true" data-part="chevron" viewBox="0 0 16 16" fill="none" className={chipIcon}>
      <path d="M4 6 8 10 12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
