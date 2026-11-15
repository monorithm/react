// The tests of the Tabs. Each name starts with the id of a clause of ir/contracts/tabs.json. The browser test
// (test/browser/tabs.browser.test.tsx) measures the clauses that jsdom cannot compute.
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { contract as loadContract } from '@monorithm/react/test/contract'
import { MomentProvider } from '@monorithm/react/contexts/moment-context'
import { type MomentEvent } from '@monorithm/react/lib/moments'
import { type TabItem, Tabs, type TabsProps } from './tabs'
import { revealTab } from './tabs.scroll'

const contract = loadContract('tabs')
const level = (id: string) => contract.clauses.find((c: { id: string }) => c.id === id)?.level

const storefront: readonly TabItem[] = [
  { value: 'products', label: 'Products', count: 24, panel: <p>The products of the shop</p> },
  { value: 'posts', label: 'Posts', count: 58, panel: <button type="button">New post</button> },
  { value: 'orders', label: 'Orders', disabled: true, disabledReason: 'Not available at this time', panel: <p>The orders</p> },
  { value: 'about', label: 'About', panel: <p>About the shop</p> },
]

const Storefront = (props: Partial<TabsProps>) => <Tabs label="Storefront" tabs={storefront} {...props} />

const tab = (name: string | RegExp) => screen.getByRole('tab', { name })
const selected = () => screen.getAllByRole('tab').map((t) => t.getAttribute('aria-selected'))
const panel = () => screen.getByRole('tabpanel')

/** The rectangle of an element, for the scroll tests: jsdom has no layout. */
const rect = (left: number, width: number) => ({ left, right: left + width, width, top: 0, bottom: 40, height: 40, x: left, y: 0, toJSON: () => ({}) })

describe('Tabs', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set([
      'tabs/role', 'tabs/name', 'tabs/use', 'tabs/panel', 'tabs/keyboard', 'tabs/arrow-keys', 'tabs/home-end',
      'tabs/panel-focus', 'tabs/target', 'tabs/focus', 'tabs/selected-sign', 'tabs/indicator', 'tabs/list', 'tabs/label',
      'tabs/density', 'tabs/count', 'tabs/count-shape', 'tabs/count-name', 'tabs/overflow', 'tabs/overflow-focus',
      'tabs/hover', 'tabs/direction', 'tabs/direction-keys', 'tabs/motion', 'tabs/motion-keyboard', 'tabs/reduced-motion',
      'tabs/panel-motion', 'tabs/swipe', 'tabs/swipe-direction', 'tabs/moment', 'tabs/no-direct-feedback', 'tabs/disabled',
      'tabs/disabled-focus', 'tabs/disabled-cause', 'tabs/tv', 'tabs/tv-label', 'tabs/car', 'tabs/watch', 'tabs/foldable',
      'tabs/xr',
    ])
    expect(contract.clauses.map((c: { id: string }) => c.id).filter((id: string) => !tested.has(id))).toEqual([])
  })

  it('tabs/role and tabs/name: a tab list with its name, a tab for each view, and a tab panel with the name of its tab', () => {
    render(<Storefront defaultValue="posts" />)
    const tablist = screen.getByRole('tablist', { name: 'Storefront' })
    expect(tablist.closest('[data-mono]')?.getAttribute('data-mono')).toBe('tabs')
    const names = ['Products 24', 'Posts 58', 'Orders', 'About']
    expect(screen.getAllByRole('tab')).toEqual(names.map((name) => tab(name)))
    expect(selected()).toEqual(['false', 'true', 'false', 'false'])
    // The position, for example 2 of 4, comes from the order of the tabs in the tab list (measured in Chrome).
    expect(screen.getAllByRole('tab').every((t) => t.parentElement === tablist)).toBe(true)
    expect(screen.getByRole('tabpanel', { name: 'Posts 58' })).toBe(panel())
    expect(panel().getAttribute('aria-labelledby')).toBe(tab('Posts 58').id)
    expect(tab('Posts 58').getAttribute('aria-controls')).toBe(panel().id)
  })

  it('tabs/name: the label is the name of a tab with no count; the copy in the strong weight adds nothing to the name', () => {
    render(<Storefront />)
    expect(tab('About').getAttribute('aria-label')).toBeNull()
    expect(screen.queryByRole('tab', { name: 'About About' })).toBeNull()
  })

  it('tabs/role: axe finds no violation with counts, a disabled tab, each size, right-to-left, and a long list', async () => {
    const long = Array.from({ length: 9 }, (_, i) => ({ value: `v${i}`, label: `Collection ${i + 1}`, panel: <p>Collection {i + 1}</p> }))
    const { container } = render(
      <div>
        <Storefront />
        <Storefront label="Storefront, posts" defaultValue="posts" />
        <Storefront label="Storefront, TV" size="tv" />
        <div dir="rtl">
          <Storefront label="Storefront, right-to-left" locale="ar-EG" />
        </div>
        <Tabs label="Collections" tabs={long} />
      </div>,
    )
    expect(await violations(container)).toEqual([])
  })

  it('tabs/use and tabs/disabled-cause: rules for the screen, not for one component (review)', () => {
    // A component cannot know the number of views of the page, or the text near the tab list. The review of a screen
    // examines them: two to six views, and the cause of a disabled tab on the screen.
    expect(level('tabs/use')).toBe('SHOULD')
    expect(level('tabs/disabled-cause')).toBe('SHOULD')
  })

  it('tabs/panel: one tab is selected at all times, by default the first tab that is not disabled; one panel shows', () => {
    render(<Storefront />)
    expect(selected()).toEqual(['true', 'false', 'false', 'false'])
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    expect(panel().textContent).toBe('The products of the shop')
    expect(screen.queryByText('About the shop')).toBeNull()
  })

  it('tabs/panel: with the first tab disabled, the first tab that is not disabled is selected', () => {
    render(
      <Tabs
        label="Orders"
        tabs={[
          { value: 'all', label: 'All', disabled: true, panel: <p>All</p> },
          { value: 'open', label: 'Open', panel: <p>Open orders</p> },
        ]}
      />,
    )
    expect(selected()).toEqual(['false', 'true'])
    expect(panel().textContent).toBe('Open orders')
  })

  it('tabs/panel: at a change, the panel of the other tab goes out of the accessibility tree', async () => {
    render(<Storefront />)
    await userEvent.setup().click(tab('About'))
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    expect(panel().textContent).toBe('About the shop')
    await waitFor(() => expect(screen.queryByText('The products of the shop')).toBeNull())
  })

  it('tabs/keyboard and tabs/panel-focus: the list is one tab stop; Tab goes to the selected tab, then into the panel', async () => {
    render(
      <div>
        <button type="button">Before</button>
        <Storefront defaultValue="posts" />
        <button type="button">After</button>
      </div>,
    )
    const user = userEvent.setup()
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(tab('Posts 58'))
    // tabs/panel-focus: the panel has a button. Tab goes to the button, not to the panel.
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'New post' }))
    expect(panel().hasAttribute('tabindex')).toBe(false)
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }))
    await user.tab({ shift: true })
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(tab('Posts 58'))
  })

  it('tabs/panel-focus: a panel with no item that can get the focus gets the focus', async () => {
    render(
      <div>
        <Storefront />
        <button type="button">After</button>
      </div>,
    )
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(tab('Products 24'))
    expect(panel().getAttribute('tabindex')).toBe('0')
    await user.tab()
    expect(document.activeElement).toBe(panel())
    expect(panel().className).toContain('focus-visible:outline-solid')
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }))
  })

  it('tabs/panel-focus: the panel changes its tab stop when its content changes', async () => {
    const { rerender } = render(<Tabs label="Shop" tabs={[{ value: 'a', label: 'A', panel: <p>Text</p> }, { value: 'b', label: 'B', panel: null }]} />)
    expect(panel().getAttribute('tabindex')).toBe('0')
    // The panel watches its content: a MutationObserver reads it again after the change.
    await act(async () => {
      rerender(<Tabs label="Shop" tabs={[{ value: 'a', label: 'A', panel: <a href="#shop">Shop</a> }, { value: 'b', label: 'B', panel: null }]} />)
    })
    expect(panel().hasAttribute('tabindex')).toBe(false)
    // A focusable item in a hidden part of the panel does not count.
    await act(async () => {
      rerender(<Tabs label="Shop" tabs={[{ value: 'a', label: 'A', panel: <div hidden><a href="#shop">Shop</a></div> }, { value: 'b', label: 'B', panel: null }]} />)
    })
    expect(panel().getAttribute('tabindex')).toBe('0')
  })

  it('tabs/arrow-keys: the arrow keys move the focus; the selection follows the focus, and the panel of the tab shows', async () => {
    render(<Storefront />)
    const user = userEvent.setup()
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(tab('Posts 58'))
    expect(selected()).toEqual(['false', 'true', 'false', 'false'])
    expect(panel().textContent).toBe('New post')
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(tab('Products 24'))
    expect(selected()).toEqual(['true', 'false', 'false', 'false'])
    expect(panel().textContent).toBe('The products of the shop')
  })

  it('tabs/home-end: Home moves the focus and the selection to the first tab, End to the last tab', async () => {
    render(<Storefront defaultValue="posts" />)
    const user = userEvent.setup()
    await user.tab()
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(tab('About'))
    expect(selected()).toEqual(['false', 'false', 'false', 'true'])
    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(tab('Products 24'))
    expect(selected()).toEqual(['true', 'false', 'false', 'false'])
  })

  it('tabs/direction-keys: in right-to-left, the left arrow key moves to the next tab; Home does not mirror', async () => {
    render(
      <div dir="rtl">
        <Storefront />
      </div>,
    )
    const user = userEvent.setup()
    await user.tab()
    // In right-to-left, the first tab is at the right: the tab at its left is the second tab.
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(tab('Posts 58'))
    expect(selected()[1]).toBe('true')
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(tab('Products 24'))
    expect(selected()[0]).toBe('true')
    await user.keyboard('{End}')
    expect(selected()[3]).toBe('true')
    await user.keyboard('{Home}')
    expect(selected()[0]).toBe('true')
  })

  it('tabs/tv: left and right on the remote move the focus and the selection; tv takes the TV label and indicator', async () => {
    const { container } = render(<Storefront size="tv" />)
    const user = userEvent.setup()
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(tab('Posts 58'))
    expect(selected()[1]).toBe('true')
    expect(container.querySelector('[data-mono="tabs"]')?.getAttribute('data-size')).toBe('tv')
    expect(container.querySelector('[data-part="indicator"]')?.className).toContain('h-(--mono-tabs-tv-indicator-height)')
  })

  it('tabs/tv-label: on a TV each label has the TV size and the weight 500 (measured in Chrome)', () => {
    render(<Storefront size="tv" />)
    expect(level('tabs/tv-label')).toBe('SHOULD')
    expect(tab('About').className).toContain('text-(length:--mono-tabs-tv-label-size)')
    expect(tab('About').className).toContain('leading-(--mono-tabs-tv-label-line-height)')
  })

  it('tabs/target: a press on a tab selects it; the target extends into the gap (measured in Chrome)', async () => {
    render(<Storefront />)
    await userEvent.setup().click(screen.getByText('About', { selector: 'span:not([aria-hidden])' }))
    expect(selected()[3]).toBe('true')
    expect(tab('Posts 58').className).toContain('after:inset-x-[min(0px,calc((100%-var(--mono-size-target-min))/2))]')
    // The first tab extends its target only to its end side, the last tab only to its start side.
    expect(tab('Products 24').className).toContain('after:start-0')
    expect(tab('About').className).toContain('after:end-0')
    expect(tab('About').className).toContain('min-w-[calc(var(--mono-size-target-min)-var(--mono-space-6)/2)]')
  })

  it('tabs/focus: the focus ring is for keyboard focus only (measured in Chrome)', () => {
    render(<Storefront />)
    expect(tab('About').className).toContain('focus-visible:outline-solid')
    expect(tab('About').className).toContain('focus-visible:outline-offset-(--mono-focus-ring-offset)')
  })

  it('tabs/selected-sign and tabs/indicator: one indicator in the list, not a line on each tab (measured in Chrome)', () => {
    const { container } = render(<Storefront />)
    const indicators = container.querySelectorAll('[data-part="indicator"]')
    expect(indicators).toHaveLength(1)
    expect(indicators[0]?.parentElement).toBe(screen.getByRole('tablist'))
    expect(indicators[0]?.getAttribute('role')).toBe('presentation')
    expect(tab('Products 24').className).toContain('data-[active]:font-mono-strong')
  })

  it('tabs/indicator: with a value that is not a tab, no tab is selected and the list shows no indicator', () => {
    const { container } = render(<Storefront value="none" />)
    expect(selected()).toEqual(['false', 'false', 'false', 'false'])
    expect(container.querySelector('[data-part="indicator"]:not([hidden])')).toBeNull()
  })

  it('tabs/list, tabs/label, and tabs/density: the sizes come from the geometry and the density (measured in Chrome)', () => {
    render(<Storefront />)
    expect(screen.getByRole('tablist').className).toContain('border-b-(length:--mono-tabs-list-line)')
    expect(screen.getByRole('tablist').className).toContain('gap-(--mono-space-6)')
    expect(tab('About').className).toContain('h-(--mono-size-control-lg)')
    expect(tab('About').className).toContain('whitespace-nowrap')
    expect(tab('About').className).toContain('text-mono-body')
  })

  it('tabs/count: the count uses the number format of the locale; its digits go from left to right', () => {
    const counts = (props: Partial<TabsProps>) => (
      <Tabs label="Shop" tabs={[{ value: 'a', label: 'Products', count: 1200, panel: null }, { value: 'b', label: 'Posts', count: 24, panel: null }]} {...props} />
    )
    const { container, rerender } = render(counts({ locale: 'en-US' }))
    const values = () => [...container.querySelectorAll('[data-part="count"]')].map((c) => c.textContent)
    expect(values()).toEqual(['1,200', '24'])
    rerender(counts({ locale: 'ar-EG' }))
    expect(values()).toEqual(['١٬٢٠٠', '٢٤'])
    expect([...container.querySelectorAll('[data-part="count"]')].every((c) => c.getAttribute('dir') === 'ltr')).toBe(true)
    rerender(counts({ locale: 'de-DE' }))
    expect(values()).toEqual(['1.200', '24'])
  })

  it('tabs/count-shape: the count is a pill with the selected fill (measured in Chrome)', () => {
    const { container } = render(<Storefront />)
    const count = container.querySelector('[data-part="count"]')
    expect(count?.className).toContain('h-(--mono-tabs-count-height)')
    expect(count?.className).toContain('bg-mono-selected')
    // The count comes after the label.
    expect([...tab('Products 24').children].map((c) => c.getAttribute('data-part'))).toEqual(['label', 'count'])
  })

  it('tabs/count-name: the name starts with the label and ends with the count; the spoken label selects the tab', async () => {
    render(<Storefront locale="en-US" />)
    expect(tab('Products 24')).toBeTruthy()
    // Voice control matches the start of the name: "Click Posts".
    const posts = screen.getByRole('tab', { name: /^Posts\b/ })
    await userEvent.setup().click(posts)
    expect(posts.getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel', { name: 'Posts 58' })).toBeTruthy()
  })

  it('tabs/overflow: the list stays on one line and scrolls on the horizontal axis (measured in Chrome)', () => {
    const { container } = render(<Storefront />)
    expect(container.querySelector('[data-part="scroller"]')?.className).toContain('overflow-x-auto')
    expect(screen.getByRole('tablist').className).toContain('flex-nowrap')
    expect(tab('About').className).toContain('shrink-0')
  })

  it('tabs/overflow-focus: the scroll shows all of a tab past the end edge or past the start edge, and its ring', () => {
    const scroller = document.createElement('div')
    const item = document.createElement('button')
    // jsdom does not compute the scroll padding: the test gives the space of the focus ring.
    const computed = vi.spyOn(window, 'getComputedStyle').mockReturnValue({ scrollPaddingLeft: '4px', scrollPaddingRight: '4px' } as CSSStyleDeclaration)
    let left = 0
    Object.defineProperty(scroller, 'scrollLeft', { get: () => left, set: (v: number) => (left = v), configurable: true })
    Object.defineProperty(scroller, 'clientWidth', { value: 200 })
    scroller.getBoundingClientRect = () => rect(0, 200) as DOMRect
    item.getBoundingClientRect = () => rect(180 - left, 60) as DOMRect
    revealTab(scroller, item)
    expect(left).toBe(44)
    revealTab(scroller, item)
    expect(left).toBe(44)
    item.getBoundingClientRect = () => rect(-30 - left + 44, 60) as DOMRect
    revealTab(scroller, item)
    expect(left).toBe(10)
    computed.mockRestore()
  })

  it('tabs/overflow-focus: at a change of the selection, the list scrolls to the selected tab', () => {
    const { container, rerender } = render(<Storefront value="products" />)
    const scroller = container.querySelector<HTMLElement>('[data-part="scroller"]')!
    let left = 0
    Object.defineProperty(scroller, 'scrollLeft', { get: () => left, set: (v: number) => (left = v), configurable: true })
    Object.defineProperty(scroller, 'clientWidth', { value: 200, configurable: true })
    scroller.getBoundingClientRect = () => rect(0, 200) as DOMRect
    tab('About').getBoundingClientRect = () => rect(300 - left, 50) as DOMRect
    rerender(<Storefront value="about" />)
    expect(left).toBeGreaterThanOrEqual(150)
  })

  it('tabs/hover: the hover class is only for a device with hover (measured in Chrome)', () => {
    render(<Storefront />)
    expect(tab('About').className).toContain('not-data-[active]:not-data-[disabled]:hover:text-mono-fg')
  })

  it('tabs/direction: the indicator uses the physical offset of Base UI, thus it moves to the left in right-to-left (measured in Chrome)', () => {
    const { container } = render(<Storefront />)
    const indicator = container.querySelector('[data-part="indicator"]')?.className ?? ''
    expect(indicator).toContain('left-0')
    expect(indicator).toContain('translate-x-(--active-tab-left)')
  })

  it('tabs/motion and tabs/motion-keyboard: a key selects spring-quick, a pointer spring-control', async () => {
    const { container } = render(<Storefront />)
    const root = container.querySelector<HTMLElement>('[data-mono="tabs"]')!
    const user = userEvent.setup()
    expect(root.dataset.input).toBe('pointer')
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(root.dataset.input).toBe('keyboard')
    await user.click(tab('About'))
    expect(root.dataset.input).toBe('pointer')
    await user.keyboard('{Home}')
    expect(root.dataset.input).toBe('keyboard')
    expect(root.className).toContain('data-[input=keyboard]:[--tabs-ease:var(--mono-spring-quick)]')
    const indicator = container.querySelector('[data-part="indicator"]')?.className ?? ''
    expect(indicator).toContain('ease-(--tabs-ease)')
    expect(indicator).toContain('not-supports-[transition-timing-function:linear(0,1)]:ease-(--mono-easing-out)')
  })

  it('tabs/reduced-motion and tabs/panel-motion: the indicator has no transition; the panel keeps its cross-fade (measured in Chrome)', () => {
    const { container } = render(<Storefront />)
    expect(container.querySelector('[data-part="indicator"]')?.className).toContain('motion-reduce:transition-none')
    expect(panel().className).toContain('transition-opacity')
    expect(panel().className).not.toContain('motion-reduce:')
    expect(panel().className).not.toContain('translate')
  })

  it('tabs/swipe and tabs/swipe-direction: the tabs give no swipe of the panels, thus tabs/panel-motion applies', () => {
    // The clauses apply only when the user can swipe the panels. This component has no swipe: a swipe on a panel does
    // not change the selection, and the panel changes with the cross-fade only.
    expect(level('tabs/swipe')).toBe('MUST')
    expect(level('tabs/swipe-direction')).toBe('MUST')
    render(<Storefront />)
    const before = selected()
    const area = panel()
    for (const [type, x] of [['pointerdown', 200], ['pointermove', 100], ['pointerup', 20]] as const) {
      area.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, pointerType: 'touch' }))
    }
    expect(selected()).toEqual(before)
  })

  it('tabs/moment: a change emits select one time; the selected tab and a disabled tab emit no moment', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    render(
      <MomentProvider onMoment={onMoment}>
        <Storefront />
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.click(tab('Posts 58'))
    expect(onMoment.mock.calls).toEqual([[{ moment: 'select', variant: undefined, source: 'tabs' }]])
    await user.click(tab('Posts 58'))
    await user.click(tab('Orders'))
    expect(onMoment).toHaveBeenCalledTimes(1)
    // A key emits the moment too. The focus on the disabled tab emits no moment.
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(tab('Orders'))
    expect(onMoment).toHaveBeenCalledTimes(1)
    await user.keyboard('{ArrowRight}')
    expect(selected()[3]).toBe('true')
    expect(onMoment).toHaveBeenCalledTimes(2)
  })

  it('tabs/moment: in controlled tabs, the moment and the callback come at the change', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    const onValueChange = vi.fn()
    render(
      <MomentProvider onMoment={onMoment}>
        <Storefront value="products" onValueChange={onValueChange} />
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.click(tab('About'))
    expect(onValueChange.mock.calls).toEqual([['about']])
    expect(onMoment).toHaveBeenCalledTimes(1)
    // The app did not change the value: the selection stays. A new press asks again.
    expect(selected()[0]).toBe('true')
    await user.click(tab('About'))
    expect(onValueChange.mock.calls).toEqual([['about'], ['about']])
    expect(onMoment).toHaveBeenCalledTimes(2)
  })

  it('tabs/no-direct-feedback: a change calls no vibration API', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    render(<Storefront />)
    await userEvent.setup().click(tab('About'))
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('tabs/disabled: the user cannot select a disabled tab, and its description tells why', async () => {
    const onValueChange = vi.fn()
    render(<Storefront onValueChange={onValueChange} />)
    const orders = screen.getByRole('tab', { name: 'Orders', description: 'Not available at this time' })
    expect(orders.getAttribute('aria-disabled')).toBe('true')
    expect(orders.className).toContain('data-[disabled]:opacity-(--mono-opacity-disabled)')
    await userEvent.setup().click(orders)
    expect(orders.getAttribute('aria-selected')).toBe('false')
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('tabs/disabled-focus: an arrow key moves the focus to a disabled tab; the selection and the panel do not change', async () => {
    render(<Storefront defaultValue="posts" />)
    const user = userEvent.setup()
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Orders', description: 'Not available at this time' }))
    expect(selected()).toEqual(['false', 'true', 'false', 'false'])
    expect(panel().textContent).toBe('New post')
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(selected()).toEqual(['false', 'true', 'false', 'false'])
  })

  it('tabs/foldable: a resize keeps the selected tab and the scroll position (measured in Chrome)', async () => {
    const { container, rerender } = render(<Storefront />)
    await userEvent.setup().click(tab('About'))
    const scroller = container.querySelector<HTMLElement>('[data-part="scroller"]')!
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    rerender(<Storefront className="w-full" />)
    expect(selected()[3]).toBe('true')
    expect(container.querySelector('[data-part="scroller"]')).toBe(scroller)
  })

  it('tabs/car, tabs/watch, and tabs/xr: rules for the platform of the class, not for the web (review)', () => {
    // A web page cannot know the class of the device. On a car display, the app uses the tab bar template of the
    // platform. On a watch, the app shows a list of the views. In an XR headset, the system gives the hit region, the
    // hover effect, and the pinch.
    expect(level('tabs/car')).toBe('MUST')
    expect(level('tabs/watch')).toBe('MUST')
    expect(level('tabs/xr')).toBe('MUST')
  })
})
