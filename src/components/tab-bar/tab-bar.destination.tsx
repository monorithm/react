// A destination of the Tab bar (contract: ir/contracts/tab-bar.json): a link with its icon, its label, and an optional
// count or dot. Base UI (useRender) gives the render prop: the app can give the link component of its router.
import { useRender } from '@base-ui/react/use-render'
import { type AnchorHTMLAttributes, type KeyboardEvent, type MouseEvent, type ReactElement, type ReactNode, type Ref, useId } from 'react'
import { cx, describedBy } from '@monorithm/react/lib/cx'
import { FOCUS } from '@monorithm/react/lib/row'
import { count as countClass, destination, dot as dotClass, glyph, glyphSizes, icon as iconClass, label as labelClass, labelLayer, mirrored, primaryMark } from './tab-bar.variants'

interface DestinationBase {
  /** The id of the destination, for example "orders". The current destination of the bar has this value. */
  value: string
  /** The name that the user sees, for example "Orders". It is also the start of the accessible name (tab-bar/name). */
  label: string
  /** The icon of the app, for example an SVG with a 24 viewBox. Assistive technology does not read it (tab-bar/icon). */
  icon: ReactNode
  /** The URL of the destination. With no href, give the link of the router with the render prop of the bar. */
  href?: string
  /** The icon points forward or back. In right-to-left, it mirrors. An icon of a real object keeps its form (tab-bar/direction-icons). */
  mirror?: boolean
  /** A disabled destination opens no screen (tab-bar/disabled). */
  disabled?: boolean
  /** The cause of the disabled state, for assistive technology (tab-bar/disabled). Also show the cause near the bar. */
  disabledReason?: string
}

/** One destination of the bar. It has a count, a dot, or none of them. */
export type TabBarDestination = DestinationBase &
  (
    | {
        /** The number of new items, for example 12. It goes into the accessible name: "Orders, 12 new" (tab-bar/count-name). */
        count?: number
        dot?: undefined
      }
    | {
        count?: undefined
        /**
         * The sign of new items when no count applies. The text goes into the accessible name, for example "New items"
         * gives the name "Inbox, New items" (tab-bar/dot).
         */
        dot: string
      }
  )

/** Three to five destinations (tab-bar/count). */
export type TabBarDestinations =
  | readonly [TabBarDestination, TabBarDestination, TabBarDestination]
  | readonly [TabBarDestination, TabBarDestination, TabBarDestination, TabBarDestination]
  | readonly [TabBarDestination, TabBarDestination, TabBarDestination, TabBarDestination, TabBarDestination]

/** The props of the link of a destination. Spread them on the link of the router. */
export type TabBarLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { ref?: Ref<HTMLAnchorElement> }

/** The state of a destination, for the render prop. */
export type TabBarLinkState = {
  value: string
  href: string | undefined
  current: boolean
  disabled: boolean
  primary: boolean
}

/**
 * The link of the router. An element gets the props of the destination, for example `<NextLink href="" />`. A function
 * gets the props and the state, for example `(props, d) => <Link {...props} to={paths[d.value]} />`.
 */
export type TabBarRender = ReactElement | ((props: TabBarLinkProps, state: TabBarLinkState) => ReactElement)

export interface TabBarItemProps {
  destination: TabBarDestination
  current: boolean
  primary: boolean
  countLabel: (count: number) => string
  render: TabBarRender | undefined
  onSelect: (value: string, event: MouseEvent<HTMLAnchorElement>) => void
  onReselect: (value: string, event: MouseEvent<HTMLAnchorElement>) => void
}

/** A click that opens the link in a different window or tab. It does not change the current destination of this screen. */
const opensElsewhere = (event: MouseEvent<HTMLAnchorElement>) =>
  event.currentTarget.hasAttribute('href') && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)

export function TabBarItem({ destination: d, current, primary, countLabel, render, onSelect, onReselect }: TabBarItemProps) {
  const reasonId = useId()
  const disabled = d.disabled === true
  const reason = disabled && d.disabledReason ? reasonId : undefined
  const count = d.count !== undefined && d.count > 0 ? d.count : undefined
  // tab-bar/count-name and tab-bar/dot: the name starts with the label, then it tells that new items wait.
  const badge = count !== undefined ? countLabel(count) : d.dot
  // tab-bar/disabled: a disabled destination has no href, thus it opens no screen, also with a middle click. It stays a
  // link in the focus order, so that assistive technology can tell its cause.
  const href = disabled ? undefined : d.href
  // tab-bar/role: with no href, the destination is a link with the link role. With the render prop, the router gives it.
  const roleLink = href === undefined && (render === undefined || disabled)
  const state: TabBarLinkState = { value: d.value, href, current, disabled, primary }
  const element = useRender<TabBarLinkState, HTMLAnchorElement>({
    defaultTagName: 'a',
    render: render as useRender.RenderProp<TabBarLinkState> | undefined,
    state,
    // The state gives data-current, data-disabled, and data-primary. The value and the href are not data attributes.
    stateAttributesMapping: { value: () => null, href: () => null },
    props: {
      href,
      role: roleLink ? 'link' : undefined,
      tabIndex: roleLink ? 0 : undefined,
      'data-part': 'destination',
      // tab-bar/current: the current destination tells assistive technology that it is the current page.
      'aria-current': current ? 'page' : undefined,
      'aria-disabled': disabled || undefined,
      'aria-label': badge ? `${d.label}, ${badge}` : undefined,
      'aria-describedby': describedBy(reason),
      // tab-bar/focus: the focus ring of the language, for keyboard focus only.
      className: cx(destination, FOCUS),
      onClick(event: MouseEvent<HTMLAnchorElement>) {
        // tab-bar/disabled and tab-bar/moment: a disabled destination opens no screen and emits no moment.
        if (disabled) {
          event.preventDefault()
          return
        }
        if (opensElsewhere(event)) return
        // tab-bar/reselect: a press on the current destination does not change the destination.
        if (current) {
          event.preventDefault()
          onReselect(d.value, event)
          return
        }
        onSelect(d.value, event)
      },
      onKeyDown(event: KeyboardEvent<HTMLAnchorElement>) {
        // tab-bar/keyboard: Enter opens the focused destination. A link with an href does this itself.
        if (event.key === 'Enter' && !event.currentTarget.hasAttribute('href')) {
          event.preventDefault()
          event.currentTarget.click()
        }
      },
      children: (
        <>
          <span aria-hidden="true" data-part="icon" className={iconClass}>
            {primary ? <span data-part="primary-mark" className={primaryMark} /> : null}
            <span data-part="glyph" className={cx(glyph, primary ? glyphSizes.primary : glyphSizes.default, d.mirror && mirrored)}>
              {d.icon}
            </span>
          </span>
          {/* tab-bar/label: the label always shows. tab-bar/motion: the strong layer keeps the width, thus the change of
              the weight does not move the label. */}
          <span data-part="label" className={labelClass}>
            <span className={cx(labelLayer, current && 'font-mono-strong')}>{d.label}</span>
            <span aria-hidden="true" className={cx(labelLayer, 'invisible font-mono-strong')}>
              {d.label}
            </span>
          </span>
          {count !== undefined ? (
            <span aria-hidden="true" data-part="count" className={countClass}>
              {count}
            </span>
          ) : d.dot ? (
            <span aria-hidden="true" data-part="dot" className={dotClass} />
          ) : null}
          {reason ? (
            <span id={reason} hidden>
              {d.disabledReason}
            </span>
          ) : null}
        </>
      ),
    },
  })
  return <li className="flex min-w-0">{element}</li>
}
