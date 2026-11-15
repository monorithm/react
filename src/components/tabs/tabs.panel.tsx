// One panel of the Tabs (contract: ir/contracts/tabs.json): the content of one view.
import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import { type ReactNode, useCallback, useState } from 'react'
import { cx } from '@monorithm/react/lib/cx'
import { FOCUS } from '@monorithm/react/lib/row'
import { panel } from './tabs.variants'

/** The items that the Tab key can focus. */
const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex^="-"])',
].join(',')

/** The attributes that can change the items that the Tab key can focus. */
const WATCHED = ['disabled', 'tabindex', 'href', 'hidden', 'inert', 'contenteditable', 'controls', 'type']

/**
 * True when the panel has an item that can get the focus. An item in a hidden or inert part of the panel does not count.
 * The inert state of the panel itself does not count: it is only the cross-fade of a panel that goes out.
 */
const hasFocusable = (element: HTMLElement): boolean =>
  [...element.querySelectorAll<HTMLElement>(FOCUSABLE)].some((item) => {
    const off = item.closest('[hidden], [inert]')
    return off === null || off === element || !element.contains(off)
  })

export interface TabsPanelProps {
  value: string
  /** True when the tab of the panel is selected. */
  selected: boolean
  children: ReactNode
}

export function TabsPanel({ value, selected, children }: TabsPanelProps) {
  // tabs/panel-focus: from the tab list, the Tab key goes to the first item of the panel that can get the focus. With no
  // such item, the panel is a tab stop and gets the focus.
  const [stop, setStop] = useState(true)
  const ref = useCallback((element: HTMLDivElement | null) => {
    if (!element) return
    const read = () => setStop(!hasFocusable(element))
    read()
    // A change of an attribute of the panel itself (its tab index, its inert state) does not change its items.
    const observer = new MutationObserver((records) => {
      if (records.some((r) => r.type === 'childList' || r.target !== element)) read()
    })
    observer.observe(element, { subtree: true, childList: true, attributes: true, attributeFilter: WATCHED })
    return () => observer.disconnect()
  }, [])
  return (
    <BaseTabs.Panel
      ref={ref}
      value={value}
      tabIndex={stop ? 0 : undefined}
      // tabs/panel: the panel that goes out during the cross-fade is not in the accessibility tree (Base UI makes it inert).
      aria-hidden={selected ? undefined : true}
      data-part="panel"
      className={cx(panel, FOCUS)}
    >
      {children}
    </BaseTabs.Panel>
  )
}
