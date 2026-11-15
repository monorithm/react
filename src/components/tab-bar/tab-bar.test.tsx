// The tests of the Tab bar. Each name starts with the id of a clause of ir/contracts/tab-bar.json. The browser test
// (test/browser/tab-bar.browser.test.tsx) measures the clauses that jsdom cannot compute.
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type AnchorHTMLAttributes, type MouseEvent, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { type Clause, contract as loadContract } from '@monorithm/react/test/contract'
import { MomentProvider } from '@monorithm/react/contexts/moment-context'
import { type MomentEvent } from '@monorithm/react/lib/moments'
import { TabBar, type TabBarProps } from './tab-bar'
import type { TabBarDestination, TabBarDestinations } from './tab-bar.destination'

const contract = loadContract('tab-bar')
const clause = (id: string) => contract.clauses.find((c) => c.id === id) as (Clause & { classes?: string[] }) | undefined

const Glyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M4 12h16" />
  </svg>
)
const home: TabBarDestination = { value: 'home', label: 'Home', icon: <Glyph />, href: '#home' }
const orders: TabBarDestination = { value: 'orders', label: 'Orders', icon: <Glyph />, href: '#orders', count: 12 }
const create: TabBarDestination = { value: 'create', label: 'Create', icon: <Glyph />, href: '#create' }
const inbox: TabBarDestination = { value: 'inbox', label: 'Inbox', icon: <Glyph />, href: '#inbox', dot: 'New items' }
const payouts: TabBarDestination = {
  value: 'payouts',
  label: 'Payouts',
  icon: <Glyph />,
  href: '#payouts',
  disabled: true,
  disabledReason: 'Verify your account first',
}
const five: TabBarDestinations = [home, orders, create, inbox, payouts]

const Bar = (props: Partial<TabBarProps>) => <TabBar label="Main" destinations={five} current="home" primary="create" {...props} />

/** A bar that the app controls: the selected destination becomes the current destination. */
function App({ onMoment, onReselect }: { onMoment?: (e: MomentEvent) => void; onReselect?: TabBarProps['onReselect'] }) {
  const [current, setCurrent] = useState('home')
  const bar = <Bar current={current} onSelect={setCurrent} onReselect={onReselect} />
  return onMoment ? <MomentProvider onMoment={onMoment}>{bar}</MomentProvider> : bar
}

describe('Tab bar', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set([
      'tab-bar/role', 'tab-bar/name', 'tab-bar/current', 'tab-bar/count', 'tab-bar/sequence', 'tab-bar/label',
      'tab-bar/label-wrap', 'tab-bar/height', 'tab-bar/safe-area', 'tab-bar/bar', 'tab-bar/layout', 'tab-bar/icon',
      'tab-bar/target', 'tab-bar/density', 'tab-bar/color', 'tab-bar/selected-sign', 'tab-bar/primary-destination',
      'tab-bar/count-badge', 'tab-bar/count-position', 'tab-bar/count-name', 'tab-bar/dot', 'tab-bar/keyboard',
      'tab-bar/focus', 'tab-bar/not-obscured', 'tab-bar/hover', 'tab-bar/press', 'tab-bar/reselect', 'tab-bar/direction',
      'tab-bar/direction-icons', 'tab-bar/direction-focus', 'tab-bar/text-size', 'tab-bar/motion', 'tab-bar/reduced-motion',
      'tab-bar/moment', 'tab-bar/no-direct-feedback', 'tab-bar/disabled', 'tab-bar/disabled-cause', 'tab-bar/primary-screens',
      'tab-bar/toast', 'tab-bar/layouts', 'tab-bar/foldable', 'tab-bar/tv', 'tab-bar/car', 'tab-bar/watch', 'tab-bar/xr',
    ])
    expect(contract.clauses.map((c) => c.id).filter((id) => !tested.has(id))).toEqual([])
  })

  it('tab-bar/role: the accessibility tree shows a navigation landmark with a link for each destination; not the tabs role', () => {
    render(<Bar />)
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(nav.tagName).toBe('NAV')
    expect(within(nav).getAllByRole('link')).toHaveLength(5)
    expect(within(nav).getByRole('list').children).toHaveLength(5)
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.queryByRole('tab')).toBeNull()
  })

  it('tab-bar/role: axe finds no violation with a count, a dot, the primary destination, and a disabled destination', async () => {
    const { container } = render(<Bar />)
    expect(await violations(container)).toEqual([])
  })

  it('tab-bar/role: axe finds no violation with three destinations and no href (in-app links)', async () => {
    const plain = (d: TabBarDestination): TabBarDestination => ({ value: d.value, label: d.label, icon: d.icon })
    const { container } = render(<TabBar label="Main" destinations={[plain(home), plain(orders), plain(create)]} current="orders" />)
    expect(screen.getAllByRole('link')).toHaveLength(3)
    expect(await violations(container)).toEqual([])
  })

  it('tab-bar/role: the render prop gives the link of the router; each destination stays a link with its label', async () => {
    const navigate = vi.fn()
    const paths: Record<string, string> = { home: '/', orders: '/orders', create: '/create' }
    // A small stand-in for the link of a router: it opens the path, unless a handler prevented the default.
    const RouterLink = ({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
      <a
        {...rest}
        href={to}
        onClick={(e: MouseEvent<HTMLAnchorElement>) => {
          onClick?.(e)
          if (!e.defaultPrevented) {
            e.preventDefault()
            navigate(to)
          }
        }}
      />
    )
    const destinations: TabBarDestinations = [
      { value: 'home', label: 'Home', icon: <Glyph /> },
      { value: 'orders', label: 'Orders', icon: <Glyph /> },
      { value: 'create', label: 'Create', icon: <Glyph /> },
    ]
    const { container } = render(
      <TabBar label="Main" destinations={destinations} current="home" render={(props, d) => <RouterLink {...props} to={paths[d.value] ?? '/'} />} />,
    )
    const link = screen.getByRole('link', { name: 'Orders' })
    expect(link.getAttribute('href')).toBe('/orders')
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBe('page')
    const user = userEvent.setup()
    await user.click(link)
    expect(navigate).toHaveBeenCalledWith('/orders')
    // tab-bar/reselect: the press on the current destination does not open the router path again.
    await user.click(screen.getByRole('link', { name: 'Home' }))
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(await violations(container)).toEqual([])
  })

  it('tab-bar/role: an element as the render prop gets the href and the props of the destination', () => {
    const Wrapped = (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a data-router="" {...props} />
    render(<Bar render={<Wrapped />} />)
    const link = screen.getByRole('link', { name: 'Home' })
    expect(link.hasAttribute('data-router')).toBe(true)
    expect(link.getAttribute('href')).toBe('#home')
    expect(link.getAttribute('aria-current')).toBe('page')
  })

  it('tab-bar/name: the landmark has its name; the name of each destination starts with the label that the user sees', () => {
    render(<Bar />)
    expect(screen.getByRole('navigation').getAttribute('aria-label')).toBe('Main')
    for (const link of screen.getAllByRole('link')) {
      const seen = link.querySelector('[data-part="label"] > span:not([aria-hidden])')?.textContent ?? ''
      expect(seen).not.toBe('')
      expect(screen.getByRole('link', { name: new RegExp(`^${seen}`) })).toBe(link)
    }
  })

  it('tab-bar/current: only the current destination has aria-current="page" and data-current', () => {
    render(<Bar current="orders" />)
    const current = screen.getAllByRole('link').filter((l) => l.getAttribute('aria-current') === 'page')
    expect(current).toEqual([screen.getByRole('link', { name: /^Orders/ })])
    expect(current[0]?.hasAttribute('data-current')).toBe(true)
    expect(screen.getByRole('link', { name: 'Home' }).hasAttribute('data-current')).toBe(false)
  })

  it('tab-bar/count: the type takes three to five destinations; on a primary screen one destination is current', () => {
    // @ts-expect-error tab-bar/count: two destinations are not a tab bar.
    const two = <TabBar label="Main" destinations={[home, orders]} current="home" />
    // @ts-expect-error tab-bar/count: six destinations are too many.
    const six = <TabBar label="Main" destinations={[home, orders, create, inbox, payouts, home]} current="home" />
    expect([two, six]).toHaveLength(2)
    render(<Bar />)
    expect(screen.getAllByRole('link').filter((l) => l.getAttribute('aria-current') === 'page')).toHaveLength(1)
  })

  it('tab-bar/sequence: the destinations keep the sequence of the prop (the same sequence on each screen is a review rule)', () => {
    render(<Bar current="inbox" />)
    expect(screen.getAllByRole('link').map((l) => l.querySelector('[data-part="label"] > span')?.textContent)).toEqual([
      'Home', 'Orders', 'Create', 'Inbox', 'Payouts',
    ])
    expect(clause('tab-bar/sequence')?.level).toBe('SHOULD')
  })

  it('tab-bar/label: each destination shows its icon and its label; the labels also show when not current', () => {
    render(<Bar />)
    for (const link of screen.getAllByRole('link')) {
      expect(link.querySelector('[data-part="icon"] svg')).toBeTruthy()
      const label = link.querySelector('[data-part="label"]') as HTMLElement
      expect(label.textContent).not.toBe('')
      expect(label.className).not.toContain('sr-only')
      expect(label.hasAttribute('hidden')).toBe(false)
    }
  })

  it('tab-bar/label-wrap: the label wraps and is never cut (measured in Chrome)', () => {
    render(<Bar />)
    const label = screen.getByRole('link', { name: 'Home' }).querySelector('[data-part="label"]') as HTMLElement
    expect(label.className).toContain('wrap-anywhere')
    expect(label.className).not.toMatch(/truncate|line-clamp|whitespace-nowrap|overflow-hidden/)
  })

  it('tab-bar/height and tab-bar/safe-area: the bar is 56 px plus the bottom safe area (measured in Chrome)', () => {
    render(<Bar />)
    expect(screen.getByRole('navigation').className).toContain('pb-[env(safe-area-inset-bottom)]')
    expect(screen.getByRole('list').className).toContain('min-h-(--mono-size-tab-bar)')
  })

  it('tab-bar/bar: the background fill and a line of 1 px at the top edge (measured in Chrome)', () => {
    render(<Bar />)
    const nav = screen.getByRole('navigation')
    expect(nav.dataset.mono).toBe('tab-bar')
    expect(nav.className).toContain('bg-mono-bg')
    expect(nav.className).toContain('var(--mono-tab-bar-bar-line)')
  })

  it('tab-bar/layout: the destinations are cells of one grid of the same width (measured in Chrome)', () => {
    render(<Bar />)
    expect(screen.getByRole('list').className).toContain('auto-cols-[minmax(0,1fr)]')
  })

  it('tab-bar/icon: assistive technology does not read the icon; it has the nav icon size', () => {
    render(<Bar />)
    const icon = screen.getByRole('link', { name: 'Home' }).querySelector('[data-part="icon"]') as HTMLElement
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.className).toContain('size-(--mono-size-icon-nav)')
  })

  it('tab-bar/target and tab-bar/density: the destination has the minimum target of the density (measured in Chrome)', () => {
    render(<Bar />)
    const link = screen.getByRole('link', { name: 'Home' })
    expect(link.className).toContain('min-h-(--mono-size-target-min)')
    expect(link.className).toContain('min-w-(--mono-size-target-min)')
  })

  it('tab-bar/color and tab-bar/selected-sign: the current destination has the strong weight on its label', () => {
    render(<Bar current="orders" />)
    const layer = (name: RegExp) => screen.getByRole('link', { name }).querySelector('[data-part="label"] > span:not([aria-hidden])') as HTMLElement
    expect(layer(/^Orders/).className).toContain('font-mono-strong')
    expect(layer(/^Home/).className).not.toContain('font-mono-strong')
    // The icon is not filled: the component does not change the icon of the app.
    expect(screen.getByRole('link', { name: /^Orders/ }).querySelector('svg')?.getAttribute('fill')).toBe('none')
  })

  it('tab-bar/primary-destination: one destination has the primary mark behind its icon, and it keeps its label', () => {
    render(<Bar />)
    const create = screen.getByRole('link', { name: 'Create' })
    expect(create.hasAttribute('data-primary')).toBe(true)
    expect(create.querySelector('[data-part="primary-mark"]')).toBeTruthy()
    expect(create.querySelector('[data-part="label"]')?.textContent).toContain('Create')
    expect(document.querySelectorAll('[data-part="primary-mark"]')).toHaveLength(1)
    // It is a destination of the bar, not a floating button.
    expect(create.closest('li')?.parentElement).toBe(screen.getByRole('list'))
  })

  it('tab-bar/count-badge and tab-bar/count-position: the count shows the number, hidden from assistive technology', () => {
    render(<Bar />)
    const count = screen.getByRole('link', { name: /^Orders/ }).querySelector('[data-part="count"]') as HTMLElement
    expect(count.textContent).toBe('12')
    expect(count.getAttribute('aria-hidden')).toBe('true')
    expect(count.className).toContain('bg-mono-accent')
  })

  it('tab-bar/count-badge: a count of 0 shows no count', () => {
    render(<Bar destinations={[home, { ...orders, count: 0 }, create]} />)
    expect(document.querySelector('[data-part="count"]')).toBeNull()
    expect(screen.getByRole('link', { name: 'Orders' })).toBeTruthy()
  })

  it('tab-bar/count-name: a destination with a count has the label and the count in its name', () => {
    render(<Bar />)
    expect(screen.getByRole('link', { name: 'Orders, 12 new' })).toBeTruthy()
  })

  it('tab-bar/count-name: countLabel gives the text of the count in the language of the app', () => {
    render(<Bar countLabel={(n) => `${n} nouvelles`} />)
    expect(screen.getByRole('link', { name: 'Orders, 12 nouvelles' })).toBeTruthy()
  })

  it('tab-bar/dot: a dot shows when no count applies, and the name tells that new items wait', () => {
    render(<Bar />)
    const link = screen.getByRole('link', { name: 'Inbox, New items' })
    const dot = link.querySelector('[data-part="dot"]') as HTMLElement
    expect(dot.getAttribute('aria-hidden')).toBe('true')
    expect(dot.className).toContain('size-(--mono-tab-bar-dot-size)')
    expect(link.querySelector('[data-part="count"]')).toBeNull()
  })

  it('tab-bar/keyboard: Tab and Shift+Tab move the focus to each destination in sequence; Enter opens it', async () => {
    const onSelect = vi.fn()
    render(<Bar onSelect={onSelect} />)
    const links = screen.getAllByRole('link')
    const user = userEvent.setup()
    for (const link of links) {
      await user.tab()
      expect(document.activeElement).toBe(link)
    }
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(links[3])
    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith('inbox', expect.anything())
    expect(window.location.hash).toBe('#inbox')
  })

  it('tab-bar/keyboard: Enter also opens a destination with no href', async () => {
    const onSelect = vi.fn()
    const plain = (d: TabBarDestination): TabBarDestination => ({ value: d.value, label: d.label, icon: d.icon })
    render(<TabBar label="Main" destinations={[plain(home), plain(orders), plain(create)]} current="home" onSelect={onSelect} />)
    const user = userEvent.setup()
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Orders' }))
    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith('orders', expect.anything())
    // Space does not open a link.
    await user.keyboard(' ')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('tab-bar/focus: the focus ring is for keyboard focus only (measured in Chrome)', () => {
    render(<Bar />)
    expect(screen.getByRole('link', { name: 'Home' }).className).toContain('focus-visible:outline-solid')
  })

  it('tab-bar/not-obscured: the scroll of the focused item to a position above the bar is a rule for the screen (review)', () => {
    // The scroll container of the app sets a scroll-padding-bottom of the bar height plus the safe area.
    expect(clause('tab-bar/not-obscured')?.level).toBe('SHOULD')
  })

  it('tab-bar/hover and tab-bar/press: the hover color is only for a device with hover (measured in Chrome)', () => {
    render(<Bar />)
    const link = screen.getByRole('link', { name: 'Home' })
    expect(link.className).toContain('not-data-[disabled]:hover:text-mono-fg-strong')
    expect(link.className).toContain('not-data-[disabled]:active:scale-[var(--tab-bar-press)]')
  })

  it('tab-bar/reselect: a press on the current destination does not change it and calls onReselect', async () => {
    const onReselect = vi.fn()
    const onSelect = vi.fn()
    render(<Bar onSelect={onSelect} onReselect={onReselect} />)
    window.location.hash = ''
    await userEvent.setup().click(screen.getByRole('link', { name: 'Home' }))
    expect(onReselect).toHaveBeenCalledWith('home', expect.anything())
    expect(onSelect).not.toHaveBeenCalled()
    expect(window.location.hash).toBe('')
    expect(clause('tab-bar/reselect')?.level).toBe('SHOULD')
  })

  it('tab-bar/direction: the destinations keep the DOM sequence; the grid mirrors it in right-to-left (measured in Chrome)', () => {
    render(
      <div dir="rtl">
        <Bar />
      </div>,
    )
    expect(screen.getAllByRole('link')[0]).toBe(screen.getByRole('link', { name: 'Home' }))
    const count = document.querySelector('[data-part="count"]') as HTMLElement
    expect(count.className).toContain('inset-s-')
  })

  it('tab-bar/direction-icons: an icon that points forward or back mirrors in right-to-left; others keep their form', () => {
    render(<Bar destinations={[home, { ...orders, mirror: true }, create]} />)
    const glyph = (name: RegExp) => screen.getByRole('link', { name }).querySelector('[data-part="glyph"]') as HTMLElement
    expect(glyph(/^Orders/).className).toContain('rtl:-scale-x-100')
    expect(glyph(/^Home/).className).not.toContain('rtl:-scale-x-100')
  })

  it('tab-bar/direction-focus: Tab follows the DOM sequence, the visual sequence also in right-to-left (measured in Chrome)', async () => {
    render(
      <div dir="rtl">
        <Bar />
      </div>,
    )
    await userEvent.setup().tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Home' }))
  })

  it('tab-bar/text-size: the label has the tab label size; the system text size and the large content viewer are platform rules (review)', () => {
    render(<Bar />)
    const label = screen.getByRole('link', { name: 'Home' }).querySelector('[data-part="label"]') as HTMLElement
    expect(label.className).toContain('text-mono-tab-label')
    expect(clause('tab-bar/text-size')?.level).toBe('MUST')
  })

  it('tab-bar/motion: the color and the weight change in 150 ms; the cross-fade of the content is for the app (measured in Chrome)', () => {
    render(<Bar />)
    const link = screen.getByRole('link', { name: 'Home' })
    expect(link.className).toContain('var(--mono-duration-fast)')
    expect(link.querySelector('[data-part="label"] > span')?.className).toContain('duration-(--mono-duration-fast)')
  })

  it('tab-bar/reduced-motion: reduced motion sets the press scale to 1 (measured in Chrome)', () => {
    render(<Bar />)
    const link = screen.getByRole('link', { name: 'Home' })
    expect(link.className).toContain('motion-reduce:[--tab-bar-press:1]')
    expect(link.className).toContain('[[data-motion=reduced]_&]:[--tab-bar-press:1]')
  })

  it('tab-bar/moment: a change of the current destination emits select once, before onSelect', async () => {
    const calls: string[] = []
    render(
      <MomentProvider onMoment={(e) => calls.push(`${e.moment}:${e.source}`)}>
        <Bar onSelect={(v) => calls.push(`onSelect:${v}`)} />
      </MomentProvider>,
    )
    await userEvent.setup().click(screen.getByRole('link', { name: 'Orders, 12 new' }))
    expect(calls).toEqual(['select:tab-bar', 'onSelect:orders'])
  })

  it('tab-bar/moment: a press on the current destination and a disabled destination emit no moment', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    render(<App onMoment={onMoment} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: 'Home' }))
    await user.click(screen.getByRole('link', { name: 'Payouts' }))
    expect(onMoment).not.toHaveBeenCalled()
    await user.click(screen.getByRole('link', { name: 'Create' }))
    expect(onMoment.mock.calls).toEqual([[{ moment: 'select', variant: undefined, source: 'tab-bar' }]])
    // The selected destination is now current: a second press on it emits no moment.
    await user.click(screen.getByRole('link', { name: 'Create' }))
    expect(onMoment).toHaveBeenCalledTimes(1)
  })

  it('tab-bar/moment: a click that opens the link in a new tab does not change the destination and emits no moment', async () => {
    const onMoment = vi.fn()
    const onSelect = vi.fn()
    render(
      <MomentProvider onMoment={onMoment}>
        <Bar onSelect={onSelect} />
      </MomentProvider>,
    )
    const link = screen.getByRole('link', { name: 'Create' })
    const user = userEvent.setup()
    await user.keyboard('{Control>}')
    await user.click(link)
    await user.keyboard('{/Control}')
    expect(onMoment).not.toHaveBeenCalled()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('tab-bar/no-direct-feedback: a change of the destination calls no vibration API', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    render(<App />)
    await userEvent.setup().click(screen.getByRole('link', { name: 'Create' }))
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('tab-bar/disabled: a disabled destination opens no screen, stays in the focus order, and tells its cause', async () => {
    const onSelect = vi.fn()
    render(<Bar onSelect={onSelect} />)
    const link = screen.getByRole('link', { name: 'Payouts' })
    expect(link.getAttribute('aria-disabled')).toBe('true')
    expect(link.hasAttribute('href')).toBe(false)
    expect(link.hasAttribute('data-disabled')).toBe(true)
    expect(screen.getByRole('link', { description: 'Verify your account first' })).toBe(link)
    window.location.hash = ''
    const user = userEvent.setup()
    await user.click(link)
    link.focus()
    expect(document.activeElement).toBe(link)
    await user.keyboard('{Enter}')
    expect(onSelect).not.toHaveBeenCalled()
    expect(window.location.hash).toBe('')
    expect(link.className).toContain('data-[disabled]:opacity-(--mono-opacity-disabled)')
  })

  it('tab-bar/disabled: with the render prop, a disabled destination does not open the path of the router', async () => {
    const navigate = vi.fn()
    render(
      <Bar
        render={(props) => (
          <a
            {...props}
            href="/payouts"
            onClick={(e) => {
              props.onClick?.(e)
              if (!e.defaultPrevented) navigate()
            }}
          />
        )}
        destinations={[home, orders, payouts]}
      />,
    )
    await userEvent.setup().click(screen.getByRole('link', { name: 'Payouts' }))
    expect(navigate).not.toHaveBeenCalled()
  })

  it('tab-bar/disabled-cause: the cause near the bar is a rule for the screen (review)', () => {
    expect(clause('tab-bar/disabled-cause')?.level).toBe('SHOULD')
  })

  it('tab-bar/primary-screens and tab-bar/toast: rules for the screens of the app (review)', () => {
    // The app shows the bar only on the primary screens, and shows a toast above it on a phone.
    expect(clause('tab-bar/primary-screens')?.level).toBe('SHOULD')
    expect(clause('tab-bar/toast')).toMatchObject({ level: 'SHOULD', classes: ['phone'] })
  })

  it('tab-bar/layouts: the change to a rail or a sidebar is a rule for the layout of the app (review)', () => {
    // The language has no token for the width of a layout. The app shows the bar only in the phone layout.
    expect(clause('tab-bar/layouts')?.level).toBe('MUST')
  })

  it('tab-bar/foldable, tab-bar/tv, tab-bar/car, tab-bar/watch, tab-bar/xr: rules for the platform of the class (review)', () => {
    // A web page cannot know the class of the device. The package has the axes pointer and touch (data-density) only.
    expect(clause('tab-bar/foldable')).toMatchObject({ level: 'SHOULD', classes: ['foldable'] })
    expect(clause('tab-bar/tv')?.classes).toEqual(['tv'])
    expect(clause('tab-bar/car')?.classes).toEqual(['car'])
    expect(clause('tab-bar/watch')?.classes).toEqual(['watch'])
    expect(clause('tab-bar/xr')?.classes).toEqual(['xr'])
  })
})
