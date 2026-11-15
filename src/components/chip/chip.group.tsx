// A set of chips (contract: ir/contracts/chip.json): the gap between the chips and the Clear filters action.
import { type ReactNode, useState } from 'react'
import { Button } from '../button/button'
import { cx } from '@monorithm/react/lib/cx'
import { ChipGroupContext } from './chip.context'
import { chipSet } from './chip.variants'

/** The Clear filters action. With no clearLabel, the set shows no action. */
type ClearProps = { clearLabel?: undefined; onClear?: undefined } | { clearLabel: ReactNode; onClear?: () => void }

export type ChipGroupProps = {
  /** The name of the set for assistive technology, for example "Filters". */
  label: string
  /** The chips. */
  children: ReactNode
  id?: string
  className?: string
} & ClearProps

/**
 * A set of chips, with a gap of 8 px (chip/gap). The chips go from the start side to the end side: from right to left in a
 * right-to-left layout (chip/direction). The Clear filters action is at the end (chip/clear).
 */
export function ChipGroup({ label, children, clearLabel, onClear, id, className }: ChipGroupProps) {
  const [clears, setClears] = useState(0)
  return (
    <div role="group" aria-label={label} id={id} data-mono="chip" data-part="set" className={cx(chipSet, className)}>
      <ChipGroupContext.Provider value={clears}>{children}</ChipGroupContext.Provider>
      {clearLabel !== undefined ? (
        <Button
          variant="ghost"
          // chip/clear: each filter chip goes off. The app sets each chip that it controls to off, and each menu chip to
          // no value, in onClear. chip/menu-moment: the change emits no moment of a chip.
          onClick={() => {
            setClears((n) => n + 1)
            onClear?.()
          }}
        >
          {clearLabel}
        </Button>
      ) : null}
    </div>
  )
}
