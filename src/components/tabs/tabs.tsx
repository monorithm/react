// The Tabs of the language (contract: ir/contracts/tabs.json). Base UI (Tabs) gives the behavior and the accessibility:
// a tab list with its name, a tab for each view, the arrow keys, Home and End, and a tab panel for the selected tab. The
// tokens and the geometry of the contract give the look (tabs.variants.ts).
import { DirectionProvider, type TextDirection, useDirection } from '@base-ui/react/direction-provider'
import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import { type FocusEvent, type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cx } from '@monorithm/react/lib/cx'
import { useMoment } from '@monorithm/react/hooks/use-moment'
import { TabsPanel } from './tabs.panel'
import { revealTab } from './tabs.scroll'
import { TabsTab } from './tabs.tab'
import { indicator, indicatorHeights, list, panels, root, scroller, type Size } from './tabs.variants'

/** One view of the tabs. */
export interface TabItem {
  value: string
  /** The name of the view, for example "Products": a short label (tabs/name). The accessible name starts with it. */
  label: string
  /** The number of items in the view, for example 24. It shows after the label, in the number format of the locale (tabs/count). */
  count?: number
  /** The content of the view. Only the panel of the selected tab shows (tabs/panel). */
  panel: ReactNode
  disabled?: boolean
  /** The cause of the disabled state, for assistive technology (tabs/disabled). Also show it near the tab list. */
  disabledReason?: string
}

export interface TabsProps {
  /** The name of the tab list, for example "Storefront" (tabs/name). */
  label: string
  /** The views: two to six tabs (tabs/use). */
  tabs: readonly TabItem[]
  value?: string
  /** The selected tab at the start. The default is the first tab that is not disabled. */
  defaultValue?: string
  /** Called at the change of the selection, with the value of the selected tab. */
  onValueChange?: (value: string) => void
  /** md: the default. tv: the label and the indicator of a TV (tabs/tv, tabs/tv-label). */
  size?: Size
  /** The locale of the number format of a count, for example "ar-EG". The default is the locale of the runtime (tabs/count). */
  locale?: Intl.LocalesArgument
  id?: string
  className?: string
}

/** The direction of the layout of an element: the CSS direction, or the dir attribute of an ancestor. */
const directionOf = (element: HTMLElement): TextDirection =>
  getComputedStyle(element).direction === 'rtl' || element.closest('[dir]')?.getAttribute('dir')?.toLowerCase() === 'rtl' ? 'rtl' : 'ltr'

export function Tabs({ label, tabs, value, defaultValue, onValueChange, size = 'md', locale, id, className }: TabsProps) {
  const emit = useMoment('tabs')
  const ref = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  // tabs/panel: one tab is selected at all times. With no value, the first tab that is not disabled.
  const [inner, setInner] = useState(() => defaultValue ?? (tabs.find((t) => !t.disabled) ?? tabs[0])?.value)
  const current = value ?? inner
  // tabs/motion-keyboard: the last input. A key selects spring-quick for the indicator, a pointer spring-control.
  const [input, setInput] = useState<'pointer' | 'keyboard'>('pointer')
  // tabs/moment: Base UI asks for the change at the focus and again at the click. When the app keeps the value
  // (controlled tabs), the second request of one input is not a new change. Each new input clears the request.
  const requested = useRef<string | undefined>(undefined)
  const startInput = (kind: 'pointer' | 'keyboard') => {
    requested.current = undefined
    setInput(kind)
  }
  // tabs/count: the number format of the locale.
  const numbers = useMemo(() => new Intl.NumberFormat(locale), [locale])
  // tabs/direction-keys: Base UI reads the direction from its context. The tabs give it the direction of the layout.
  // Thus the left arrow key moves to the tab at the left, also in right-to-left.
  const contextDirection = useDirection()
  const [layoutDirection, setLayoutDirection] = useState<TextDirection | null>(null)
  const readDirection = () => {
    if (ref.current) setLayoutDirection(directionOf(ref.current))
  }
  useLayoutEffect(readDirection, [])
  // tabs/overflow-focus: at a change of the selection, the list scrolls until all of the selected tab shows.
  useLayoutEffect(() => {
    const selected = scrollRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
    if (scrollRef.current && selected) revealTab(scrollRef.current, selected)
  }, [current])
  return (
    <DirectionProvider direction={layoutDirection ?? contextDirection}>
      <BaseTabs.Root
        ref={ref}
        id={id}
        data-mono="tabs"
        data-size={size}
        data-input={input}
        value={current ?? null}
        // tabs/moment: the moment comes at the change of the selection, not at the end of the indicator motion. A press
        // on the selected tab and a disabled tab make no change, thus no moment.
        onValueChange={(next: unknown) => {
          if (next === current || next === requested.current) return
          requested.current = next as string
          emit('select')
          setInner(next as string)
          onValueChange?.(next as string)
        }}
        onFocusCapture={readDirection}
        className={cx(root, className)}
      >
        <div ref={scrollRef} data-part="scroller" className={scroller}>
          <BaseTabs.List
            // tabs/arrow-keys: the selection follows the focus.
            activateOnFocus
            aria-label={label}
            data-part="list"
            onKeyDownCapture={() => startInput('keyboard')}
            onPointerDownCapture={() => startInput('pointer')}
            // tabs/overflow-focus: a tab that gets the focus shows in full, with its focus ring.
            onFocus={(event: FocusEvent<HTMLDivElement>) => {
              const target = event.target as HTMLElement
              if (scrollRef.current && target.getAttribute('role') === 'tab') revealTab(scrollRef.current, target)
            }}
            className={list}
          >
            {tabs.map((t, i) => (
              <TabsTab
                key={t.value}
                value={t.value}
                label={t.label}
                count={t.count === undefined ? undefined : numbers.format(t.count)}
                disabled={t.disabled}
                disabledReason={t.disabledReason}
                size={size}
                place={i === tabs.length - 1 ? 'last' : i === 0 ? 'first' : 'center'}
              />
            ))}
            {/* tabs/indicator: Base UI measures the selected tab. A page from the server gets the position before React
                starts (renderBeforeHydration). */}
            <BaseTabs.Indicator renderBeforeHydration data-part="indicator" className={cx(indicator, indicatorHeights[size])} />
          </BaseTabs.List>
        </div>
        <div data-part="panels" className={panels}>
          {tabs.map((t) => (
            <TabsPanel key={t.value} value={t.value} selected={t.value === current}>
              {t.panel}
            </TabsPanel>
          ))}
        </div>
      </BaseTabs.Root>
    </DirectionProvider>
  )
}
