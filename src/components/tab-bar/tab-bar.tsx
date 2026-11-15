// The Tab bar of the language (contract: ir/contracts/tab-bar.json): the primary navigation of a phone. It is a navigation
// landmark with a link for each destination, and the current destination has aria-current="page". It is not the tabs
// role. Base UI has no part for a bar of links (its Navigation menu is a menu with popups). Base UI (useRender) gives
// the render prop for the link of the router.
// The tokens and the geometry of the contract give the look (tab-bar.variants.ts, components.css).
//
// The app puts the bar at the bottom edge of the screen, for example with className="fixed inset-x-0 bottom-0", only on
// the primary screens and only in the phone layout (tab-bar/primary-screens, tab-bar/layouts).
import type { MouseEvent } from 'react'
import { cx } from '@monorithm/react/lib/cx'
import { useMoment } from '@monorithm/react/hooks/use-moment'
import { TabBarItem, type TabBarDestinations, type TabBarRender } from './tab-bar.destination'
import { bar, row } from './tab-bar.variants'

export interface TabBarProps {
  /** The name of the landmark, for example "Main" (tab-bar/name). */
  label: string
  /** Three to five destinations, in the same sequence on each screen (tab-bar/count, tab-bar/sequence). */
  destinations: TabBarDestinations
  /** The value of the current destination. On a primary screen, one destination is the current destination (tab-bar/count). */
  current: string
  /**
   * Called when the user selects a destination that is not the current destination. The moment select comes first
   * (tab-bar/moment). With an href, the link then opens the destination. To stop this, call event.preventDefault().
   */
  onSelect?: (value: string, event: MouseEvent<HTMLAnchorElement>) => void
  /**
   * Called at a press on the current destination. The destination does not change: show its first level again, at the
   * top of its content (tab-bar/reselect). This press emits no moment.
   */
  onReselect?: (value: string, event: MouseEvent<HTMLAnchorElement>) => void
  /** The value of the one destination with more weight, for example "create" (tab-bar/primary-destination). */
  primary?: string
  /** The text of a count in the accessible name. The default gives "12 new", thus the name "Orders, 12 new" (tab-bar/count-name). */
  countLabel?: (count: number) => string
  /**
   * The link of the router, for each destination. An element, for example `<NextLink href="" />`, or a function, for
   * example `(props, d) => <Link {...props} to={paths[d.value]} />`. The default is an `<a>` with the href of the destination.
   */
  render?: TabBarRender
  id?: string
  className?: string
}

const newItems = (count: number) => `${count} new`

export function TabBar({ label, destinations, current, onSelect, onReselect, primary, countLabel = newItems, render, id, className }: TabBarProps) {
  const emit = useMoment('tab-bar')
  return (
    // tab-bar/role and tab-bar/name: a navigation landmark with its name.
    <nav id={id} data-mono="tab-bar" aria-label={label} className={cx(bar, className)}>
      <ul className={row}>
        {destinations.map((d) => (
          <TabBarItem
            key={d.value}
            destination={d}
            current={d.value === current}
            primary={d.value === primary}
            countLabel={countLabel}
            render={render}
            onSelect={(value, event) => {
              // tab-bar/moment: the moment comes at the start of the change, not at the end of the motion.
              emit('select')
              onSelect?.(value, event)
            }}
            onReselect={(value, event) => onReselect?.(value, event)}
          />
        ))}
      </ul>
    </nav>
  )
}
