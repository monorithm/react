// One tab of the Tabs (contract: ir/contracts/tabs.json): the label, the count, and the cause of the disabled state.
import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import { useId } from 'react'
import { cx } from '@monorithm/react/lib/cx'
import { count as countPill, label as labelGrid, labelLayer, type Size, tab, tabSizes, type TargetPlace, tabTargets } from './tabs.variants'

export interface TabsTabProps {
  value: string
  label: string
  /** The count in the number format of the locale, for example "24" or "٢٤". */
  count?: string
  disabled?: boolean
  disabledReason?: string
  size: Size
  /** The place of the tab in the list: the first tab, the last tab, or a tab in the middle (tabs/target). */
  place: TargetPlace
}

export function TabsTab({ value, label, count, disabled, disabledReason, size, place }: TabsTabProps) {
  const reasonId = useId()
  const reason = disabled && disabledReason ? reasonId : undefined
  return (
    <BaseTabs.Tab
      value={value}
      // tabs/disabled-focus: Base UI keeps a disabled tab in the arrow key order (aria-disabled). It does not select it.
      disabled={disabled}
      // tabs/count-name: the name starts with the label, and the count comes after the label, for example "Products 24".
      aria-label={count === undefined ? undefined : `${label} ${count}`}
      aria-describedby={reason}
      data-part="tab"
      className={cx(tab, tabSizes[size], tabTargets[place])}
    >
      <span data-part="label" className={labelGrid}>
        <span className={labelLayer}>{label}</span>
        <span aria-hidden="true" className={cx(labelLayer, 'invisible font-mono-strong')}>
          {label}
        </span>
      </span>
      {count === undefined ? null : (
        // tabs/count: the digits go from left to right in each script. tabs/direction: the count is after the label, at
        // its left in right-to-left.
        <span data-part="count" dir="ltr" className={countPill}>
          {count}
        </span>
      )}
      {reason ? (
        <span id={reason} hidden>
          {disabledReason}
        </span>
      ) : null}
    </BaseTabs.Tab>
  )
}
