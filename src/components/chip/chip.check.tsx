// The check of a filter chip that is on (contract: ir/contracts/chip.json, chip/on-sign). It is at the start side of
// the label.
import { chipIcon } from './chip.variants'

/** The check: the icon size of the density and the color of the label. Assistive technology does not read it (chip/icon). */
export function ChipCheck() {
  return (
    <svg aria-hidden="true" data-part="check" viewBox="0 0 16 16" fill="none" className={chipIcon}>
      <path d="M3.5 8.5 6.5 11.5 12.5 4.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
