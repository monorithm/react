// The tests of the Card. Each name starts with the id of a clause of ir/contracts/card.json. The browser test
// (test/browser/card.browser.test.tsx) measures the clauses that jsdom cannot compute.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { type Clause, contract as loadContract } from '@monorithm/react/test/contract'
import { MomentProvider } from '@monorithm/react/contexts/moment-context'
import { type MomentEvent } from '@monorithm/react/lib/moments'
import { Button } from '../button/button'
import { IconButton } from '../icon-button/icon-button'
import { Card, type CardProps } from './card'
import { CardBody } from './card.body'
import { CardChart } from './card.chart'
import { CardFooter } from './card.footer'
import { CardHeader } from './card.header'
import { CardMedia } from './card.media'
import { CardStat } from './card.stat'

const contract = loadContract('card')
const clause = (id: string) => contract.clauses.find((c) => c.id === id) as (Clause & { classes?: string[] }) | undefined

const Dot = () => (
  <svg viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="2" />
  </svg>
)
const photo = <img alt="A blue scarf" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" />

interface OrderProps {
  href?: string
  onPress?: () => void
  disabled?: boolean
  disabledReason?: string
  loading?: boolean
  action?: ReactNode
  children?: ReactNode
}

/** A basic card with a header and a body. The props select a static, a link, or a button card. */
function Order({ action, children, ...props }: OrderProps) {
  return (
    <Card {...(props as CardProps)}>
      <CardHeader level={3} title="Order 12" action={action} />
      <CardBody>Two items for the shipment</CardBody>
      {children}
    </Card>
  )
}
const more = (onClick?: () => void) => <IconButton label="More options" icon={<Dot />} onClick={onClick} />
const card = (container: HTMLElement) => container.querySelector('[data-mono="card"]') as HTMLElement
/** The parts of the card in an element, not the parts of a nested component (for example the icon of an icon button). */
const parts = (el: Element) =>
  [...el.querySelectorAll('[data-part]')].filter((e) => e.closest('[data-mono]')?.getAttribute('data-mono') === 'card').map((e) => e.getAttribute('data-part'))

afterEach(() => {
  window.location.hash = ''
})

describe('Card', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set([
      'card/role', 'card/link-or-button', 'card/name', 'card/static', 'card/heading-level', 'card/keyboard', 'card/one-target',
      'card/nested-control', 'card/nested-target', 'card/surface', 'card/no-shadow', 'card/density', 'card/padding',
      'card/inner-radius', 'card/sections', 'card/gap', 'card/header', 'card/title', 'card/hover', 'card/press', 'card/focus',
      'card/state-sign', 'card/disabled', 'card/loading', 'card/direction', 'card/motion', 'card/moment', 'card/nested-moment',
      'card/no-direct-feedback', 'card/stat', 'card/stat-value', 'card/stat-change', 'card/chart', 'card/content',
      'card/content-counter', 'card/availability', 'card/large-text', 'card/tv-focus', 'card/tv-press', 'card/tv-title',
      'card/car', 'card/watch', 'card/xr',
    ])
    expect(contract.clauses.map((c: { id: string }) => c.id).filter((id: string) => !tested.has(id))).toEqual([])
  })

  it('card/role: the accessibility tree shows a link card as one link and a button card as one button, named by the title', () => {
    render(
      <>
        <Order href="/orders/12" />
        <Card variant="stat" onPress={() => {}}>
          <CardStat level={3} label="Total sales" value="1,240.00" />
        </Card>
      </>,
    )
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Order 12' }).tagName).toBe('A')
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Total sales' }).tagName).toBe('BUTTON')
  })

  it('card/role: a card that is not a link or a button is not a control', () => {
    const { container } = render(<Order />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(card(container).getAttribute('role')).toBeNull()
    expect(card(container).tagName).toBe('DIV')
  })

  it('card/role: axe finds no violation in each variant and state', async () => {
    const { container } = render(
      <main>
        <h2>Overview</h2>
        <Order action={more()} />
        <Order href="/orders/12" action={more()}>
          <CardFooter>
            <Button>Mark as shipped</Button>
          </CardFooter>
        </Order>
        <Card onPress={() => {}} size="lg">
          <CardHeader level={3} title="Add a product" />
        </Card>
        <Card variant="stat" href="/sales">
          <CardStat level={3} label="Total sales" value="1,240.00" change="+8%" period="compared to the last 30 days" />
        </Card>
        <Card variant="chart">
          <CardHeader level={3} title="Revenue" info={<IconButton size="sm" label="About the revenue" icon={<Dot />} />} legend="This year" />
          <CardChart alternative="January 120, February 140">
            <svg role="img" aria-label="Revenue by month" viewBox="0 0 10 10" />
          </CardChart>
        </Card>
        <Card variant="content" href="/products/1">
          <CardMedia counter="Photo 1 of 4" badge="In stock">
            {photo}
          </CardMedia>
          <CardHeader level={3} title="Kente scarf" />
          <CardBody>Northside Crafts · 120.00</CardBody>
        </Card>
        <Order href="/orders/7" disabled disabledReason="The order is archived" />
        <Order onPress={() => {}} disabled disabledReason="The order is archived" />
        <Order href="/orders/9" loading />
      </main>,
    )
    expect(await violations(container)).toEqual([])
  })

  it('card/link-or-button: href gives a link that opens the page; onPress gives a button of the type button', () => {
    render(
      <>
        <Order href="/orders/12" />
        <Order onPress={() => {}} />
      </>,
    )
    expect(screen.getByRole('link').getAttribute('href')).toBe('/orders/12')
    expect(screen.getByRole('button').getAttribute('type')).toBe('button')
    // @ts-expect-error card/link-or-button: a card is a link or a button, not the two.
    const both = <Card href="/orders/12" onPress={() => {}}>Order</Card>
    expect(both).toBeTruthy()
  })

  it('card/name: the name is the title only, with no other text of the card', () => {
    render(
      <>
        <Order href="/orders/12" action={more()} />
        <Card variant="stat" href="/sales">
          <CardStat level={3} label="Total sales" value="1,240.00" change="+8%" period="compared to the last 30 days" />
        </Card>
      </>,
    )
    const links = screen.getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Order 12', 'Total sales'])
    expect(screen.getByRole('link', { name: 'Order 12' })).toBe(links[0])
    expect(screen.getByRole('link', { name: 'Total sales' })).toBe(links[1])
  })

  it('card/static: no focus stop, no hover state, no pressed state, and the title is a heading', async () => {
    const { container } = render(
      <>
        <Order />
        <button type="button">After</button>
      </>,
    )
    await userEvent.setup().tab()
    expect(document.activeElement?.textContent).toBe('After')
    expect(screen.getByRole('heading', { level: 3, name: 'Order 12' })).toBeTruthy()
    const c = card(container)
    expect(c.dataset.interactive).toBeUndefined()
    expect(c.className).not.toContain(':hover')
    expect(c.className).not.toContain(':active')
    expect(c.className).not.toContain('focus-visible')
    expect(container.querySelector('[data-part="target"]')).toBeNull()
    // @ts-expect-error card/static: a static card has no disabled state.
    const disabled = <Card disabled>Order</Card>
    expect(disabled).toBeTruthy()
  })

  it('card/heading-level: the screen sets the level of the title; the prop is necessary (a rule for the screen)', () => {
    render(
      <>
        <Card>
          <CardHeader level={2} title="Sales" />
        </Card>
        <Card href="/orders">
          <CardHeader level={4} title="Orders" />
        </Card>
        <Card variant="stat">
          <CardStat level={5} label="Total sales" value="1,240.00" />
        </Card>
      </>,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Sales' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 4, name: 'Orders' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 5, name: 'Total sales' })).toBeTruthy()
    // @ts-expect-error card/heading-level: the component does not select the level.
    const none = <CardHeader title="Sales" />
    // @ts-expect-error card/heading-level: the card title is in a section, thus its level is 2 or more.
    const one = <CardHeader level={1} title="Sales" />
    expect([none, one]).toHaveLength(2)
    expect(clause('card/heading-level')?.level).toBe('SHOULD')
  })

  it('card/keyboard: Tab moves the focus to a link card, and Enter opens it', async () => {
    render(<Order href="#order-12" />)
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Order 12' }))
    await user.keyboard('{Enter}')
    expect(window.location.hash).toBe('#order-12')
  })

  it('card/keyboard: Tab moves the focus to a button card; Enter and Space press it', async () => {
    const onPress = vi.fn()
    render(<Order onPress={onPress} />)
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Order 12' }))
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onPress).toHaveBeenCalledTimes(2)
  })

  it('card/one-target: the card has one target, and its ::after covers the full card (measured in Chrome)', async () => {
    const onPress = vi.fn()
    const { container } = render(<Order onPress={onPress} />)
    const targets = container.querySelectorAll('[data-part="target"]')
    expect(targets).toHaveLength(1)
    expect(targets[0]?.className).toContain('after:absolute after:inset-0')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Order 12' }))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('card/nested-control: a control in the card has its name and its focus stop after the card; a press on it does not press the card', async () => {
    const onPress = vi.fn()
    const onMore = vi.fn()
    render(<Order onPress={onPress} action={more(onMore)} />)
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Order 12' }))
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'More options' }))
    await user.click(screen.getByRole('button', { name: 'More options' }))
    await user.keyboard('{Enter}')
    expect(onMore).toHaveBeenCalledTimes(2)
    expect(onPress).not.toHaveBeenCalled()
    // The control is not inside the link or the button of the card.
    expect(screen.getByRole('button', { name: 'Order 12' }).contains(screen.getByRole('button', { name: 'More options' }))).toBe(false)
  })

  it('card/nested-target: a control in the card keeps the minimum target of the density, above the card (measured in Chrome)', () => {
    const { container } = render(<Order href="/orders/12" action={more()} />)
    expect(screen.getByRole('button', { name: 'More options' }).className).toContain('after:min-h-(--mono-size-target-min)')
    expect(card(container).className).toContain(':not([data-part=target]))]:z-1')
  })

  it('card/surface: the surface fill and the ring of the geometry, on the ::after (measured in Chrome)', () => {
    const { container } = render(<Order />)
    const c = card(container)
    expect(c.className).toContain('bg-mono-surface')
    expect(c.className).toContain('after:border-(length:--mono-card-ring)')
    expect(c.className).toContain('after:inset-0')
  })

  it('card/no-shadow: no class of a card sets a shadow (measured in Chrome)', () => {
    const { container } = render(
      <>
        <Order />
        <Order href="/orders/12" />
        <Order href="/orders/9" loading />
      </>,
    )
    for (const el of container.querySelectorAll('[data-mono="card"], [data-mono="card"] [data-part]')) {
      expect(el.className).not.toMatch(/(^|[\s:])shadow-/)
    }
  })

  it('card/density: the radius is the large radius of the density (measured in Chrome)', () => {
    const { container } = render(<Order />)
    expect(card(container).className).toContain('rounded-mono-lg')
  })

  it('card/padding: md has the padding space-4, the default; lg has space-5', () => {
    const { container } = render(
      <>
        <Order />
        <Card size="lg">
          <CardBody>Large</CardBody>
        </Card>
      </>,
    )
    const [md, lg] = [...container.querySelectorAll('[data-mono="card"]')] as HTMLElement[]
    expect(md?.dataset.size).toBe('md')
    expect(md?.className).toContain('[--card-padding:var(--mono-space-4)]')
    expect(lg?.className).toContain('[--card-padding:var(--mono-space-5)]')
    expect(lg?.className).toContain('p-(--card-padding)')
  })

  it('card/inner-radius: the photo has the card radius at the top edge; a part has the inner radius (measured in Chrome)', () => {
    const { container } = render(
      <>
        <Card variant="content">
          <CardMedia counter="Photo 1 of 4" badge="In stock">
            {photo}
          </CardMedia>
          <CardHeader level={3} title="Kente scarf" />
        </Card>
        <Card variant="chart">
          <CardHeader level={3} title="Revenue" />
          <CardChart alternative="January 120">
            <div />
          </CardChart>
        </Card>
      </>,
    )
    expect(container.querySelector('[data-part="media"]')?.className).toContain('rounded-t-mono-lg')
    expect(container.querySelector('[data-part="chart"]')?.className).toContain('rounded-(--card-inner-radius)')
  })

  it('card/sections: the gap between two sections is space-6 (measured in Chrome)', () => {
    const { container } = render(<Order />)
    expect(card(container).className).toContain('gap-(--mono-space-6)')
  })

  it('card/gap: the gap between two cards is a rule for the layout of the screen (review)', () => {
    // The card does not see the cards next to it. The screen puts space-4 (16 px) between two cards.
    expect(clause('card/gap')?.level).toBe('SHOULD')
  })

  it('card/header: the title comes first and the actions last, with the gaps of the geometry (measured in Chrome)', () => {
    const { container } = render(<Order action={more()} />)
    const header = container.querySelector('[data-part="header"]') as HTMLElement
    expect(header.className).toContain('gap-(--mono-card-header-gap)')
    expect(header.querySelector('[data-part="actions"]')?.className).toContain('gap-(--mono-card-actions-gap)')
    expect(parts(header)).toEqual(['title', 'actions'])
  })

  it('card/title: title-3, the strong weight, and the strong text color (measured in Chrome)', () => {
    render(<Order />)
    const title = screen.getByRole('heading', { name: 'Order 12' })
    for (const c of ['text-mono-title-3', 'font-mono-strong', 'text-mono-fg-strong']) expect(title.className).toContain(c)
  })

  it('card/hover: the hover classes are only for a device with hover, and only for the target (measured in Chrome)', () => {
    const { container } = render(<Order href="/orders/12" />)
    expect(card(container).className).toContain('not-data-[disabled]:hover:has-[[data-part=target]:hover]:')
  })

  it('card/press: the press scale comes from the token, at pointer down on the target (measured in Chrome)', () => {
    const { container } = render(<Order href="/orders/12" />)
    expect(card(container).className).toContain('[--card-press:var(--mono-scale-press)]')
    expect(card(container).className).toContain('has-[[data-part=target]:active]:scale-[var(--card-press,1)]')
  })

  it('card/focus: the focus ring is for keyboard focus on the target, and shows on the full card (measured in Chrome)', () => {
    const { container } = render(<Order href="/orders/12" />)
    expect(card(container).className).toContain('has-[[data-part=target]:focus-visible]:outline-solid')
    expect(screen.getByRole('link').className).toContain('outline-none')
  })

  it('card/state-sign: the focus ring, the press scale, and a text for the disabled state are the signs', () => {
    const { container } = render(<Order href="/orders/7" disabled disabledReason="The order is archived" />)
    expect(screen.getByRole('link', { name: 'Order 12', description: 'The order is archived' })).toBeTruthy()
    expect(card(container).className).toContain('focus-visible]:outline-solid')
    expect(card(container).className).toContain(':scale-[var(--card-press,1)]')
  })

  it('card/disabled: a disabled link card stays in the focus order, does not open, and tells the cause', async () => {
    const onMoment = vi.fn()
    const { container } = render(
      <MomentProvider onMoment={onMoment}>
        <Order href="#order-7" disabled disabledReason="The order is archived" />
      </MomentProvider>,
    )
    const link = screen.getByRole('link', { name: 'Order 12' })
    expect(link.getAttribute('aria-disabled')).toBe('true')
    expect(link.hasAttribute('href')).toBe(false)
    expect(screen.getByRole('link', { description: 'The order is archived' })).toBe(link)
    expect(card(container).dataset.disabled).toBe('true')
    expect(card(container).className).toContain('data-[disabled]:opacity-(--mono-opacity-disabled)')
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(link)
    await user.keyboard('{Enter}')
    await user.click(link)
    expect(window.location.hash).toBe('')
    expect(onMoment).not.toHaveBeenCalled()
  })

  it('card/disabled: a disabled button card stays in the focus order, does not act, and tells the cause', async () => {
    const onPress = vi.fn()
    render(<Order onPress={onPress} disabled disabledReason="The order is archived" />)
    const button = screen.getByRole('button', { name: 'Order 12' })
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.hasAttribute('disabled')).toBe(false)
    expect(screen.getByRole('button', { description: 'The order is archived' })).toBe(button)
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(button)
    await user.click(button)
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onPress).not.toHaveBeenCalled()
  })

  it('card/loading: the card is busy, and each part is a shape of the skeleton with the layout of the part (sizes in Chrome)', () => {
    const { container } = render(
      <Card href="/orders/9" loading>
        <CardHeader level={3} title="Order 9" action={more()} />
        <CardBody>Three items</CardBody>
        <CardFooter>Total 120.00</CardFooter>
      </Card>,
    )
    const c = card(container)
    expect(c.getAttribute('aria-busy')).toBe('true')
    expect(c.dataset.loading).toBe('true')
    for (const part of ['title', 'actions', 'body', 'footer']) {
      const cls = container.querySelector(`[data-part="${part}"]`)?.className ?? ''
      for (const s of ['invisible', 'before:visible', 'before:bg-mono-selected', 'after:animate-[mono-card-shimmer']) expect(cls).toContain(s)
    }
    // React puts the keyframes of the shimmer in the head of the document.
    expect(document.head.querySelector('style[data-href="mono-card-shimmer"]')?.textContent).toContain('@keyframes mono-card-shimmer')
  })

  it('card/direction: the parts use the start side and the end side, not left and right (measured in Chrome)', () => {
    const { container } = render(
      <Card variant="content">
        <CardMedia counter="Photo 1 of 4" badge="In stock">
          {photo}
        </CardMedia>
        <CardHeader level={3} title="Kente scarf" action={more()} />
      </Card>,
    )
    expect(container.querySelector('[data-part="counter"]')?.className).toContain('start-(--mono-card-media-inset)')
    expect(container.querySelector('[data-part="badge"]')?.className).toContain('end-(--mono-card-media-inset)')
    expect(container.querySelector('[data-part="actions"]')?.parentElement?.className).toContain('ms-auto')
    // The classes of the card (not of the icon button in it) have no physical side.
    const own = [card(container), ...card(container).querySelectorAll('*')].filter((e) => e.closest('[data-mono]') === card(container))
    for (const e of own) expect(e.getAttribute('class') ?? '').not.toMatch(/(^|[\s:-])(left|right|ml|mr|pl|pr|text-left|text-right)-/)
  })

  it('card/motion: reduced motion sets the press scale to 1 and stops the shimmer (measured in Chrome)', () => {
    const { container } = render(
      <Card href="/orders/9" loading>
        <CardHeader level={3} title="Order 9" />
      </Card>,
    )
    expect(card(container).className).toContain('motion-reduce:[--card-press:1]')
    expect(card(container).className).toContain('[[data-motion=reduced]_&]:[--card-press:1]')
    expect(container.querySelector('[data-part="title"]')?.className).toContain('motion-reduce:after:animate-none')
  })

  it('card/moment: a press on a link card or a button card emits press once; a disabled or a static card emits no moment', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    render(
      <MomentProvider onMoment={onMoment}>
        <Card href="#order-1">
          <CardHeader level={3} title="Link" />
        </Card>
        <Card onPress={() => {}}>
          <CardHeader level={3} title="Action" />
        </Card>
        <Card onPress={() => {}} disabled>
          <CardHeader level={3} title="Disabled" />
        </Card>
        <Card>
          <CardHeader level={3} title="Static" />
        </Card>
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: 'Link' }))
    await user.click(screen.getByRole('button', { name: 'Action' }))
    await user.click(screen.getByRole('button', { name: 'Disabled' }))
    await user.click(screen.getByRole('heading', { name: 'Static' }))
    const press = { moment: 'press', variant: undefined, source: 'card' }
    expect(onMoment.mock.calls).toEqual([[press], [press]])
  })

  it('card/moment: the moment comes at the release on the card, not at pointer down; Enter and Space emit it', async () => {
    const onMoment = vi.fn()
    render(
      <MomentProvider onMoment={onMoment}>
        <Card href="#order-1">
          <CardHeader level={3} title="Link" />
        </Card>
        <Card onPress={() => {}}>
          <CardHeader level={3} title="Action" />
        </Card>
      </MomentProvider>,
    )
    const user = userEvent.setup()
    const link = screen.getByRole('link')
    await user.pointer({ keys: '[MouseLeft>]', target: link })
    expect(onMoment).not.toHaveBeenCalled()
    await user.pointer({ keys: '[/MouseLeft]', target: link })
    expect(onMoment).toHaveBeenCalledTimes(1)
    link.focus()
    await user.keyboard('{Enter}')
    screen.getByRole('button').focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onMoment).toHaveBeenCalledTimes(4)
  })

  it('card/nested-moment: a press on a control in the card emits the moment of the control only', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    render(
      <MomentProvider onMoment={onMoment}>
        <Order onPress={() => {}} action={more()}>
          <CardFooter>
            <Button>Mark as shipped</Button>
          </CardFooter>
        </Order>
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'More options' }))
    await user.click(screen.getByRole('button', { name: 'Mark as shipped' }))
    expect(onMoment.mock.calls.map(([e]) => e.source)).toEqual(['icon-button', 'button'])
  })

  it('card/no-direct-feedback: a press calls no vibration API', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    render(<Order onPress={() => {}} />)
    await userEvent.setup().click(screen.getByRole('button'))
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('card/stat: the label is the title, above the value, in the small size and the secondary text color', () => {
    const { container } = render(
      <Card variant="stat">
        <CardStat level={3} label="Total sales" value="1,240.00" />
      </Card>,
    )
    expect(card(container).dataset.variant).toBe('stat')
    expect(parts(container.querySelector('[data-part="stat"]') as HTMLElement)).toEqual(['title', 'value'])
    const label = screen.getByRole('heading', { level: 3, name: 'Total sales' })
    expect(label.className).toContain('text-mono-small')
    expect(label.className).toContain('text-mono-fg-2')
  })

  it('card/stat-value: the value has title-2, tabular figures, and the strong weight (measured in Chrome)', () => {
    const { container } = render(
      <Card variant="stat">
        <CardStat level={3} label="Total sales" value="1,240.00" />
      </Card>,
    )
    const value = container.querySelector('[data-part="value"]') as HTMLElement
    expect(value.textContent).toBe('1,240.00')
    for (const c of ['text-mono-title-2', 'tabular-nums', 'font-mono-strong', 'text-mono-fg-strong']) expect(value.className).toContain(c)
  })

  it('card/stat-change: a change shows only with its period', () => {
    const { container } = render(
      <Card variant="stat">
        <CardStat level={3} label="Total sales" value="1,240.00" change="+8%" period="compared to the last 30 days" />
      </Card>,
    )
    expect(container.querySelector('[data-part="change"]')?.textContent).toBe('+8% compared to the last 30 days')
    expect(container.querySelector('[data-part="period"]')?.className).toContain('text-mono-fg-muted')
    // @ts-expect-error card/stat-change: a change with no period.
    const alone = <CardStat level={3} label="Total sales" value="1,240.00" change="+8%" />
    expect(alone).toBeTruthy()
  })

  it('card/chart: the header has the chart title, the info icon, and the legend; the chart has a text alternative', () => {
    const { container } = render(
      <Card variant="chart">
        <CardHeader level={3} title="Revenue" info={<IconButton size="sm" label="About the revenue" icon={<Dot />} />} legend="This year" />
        <CardChart alternative="January 120, February 140">
          <svg aria-hidden="true" viewBox="0 0 10 10" />
        </CardChart>
      </Card>,
    )
    expect(card(container).dataset.variant).toBe('chart')
    const header = container.querySelector('[data-part="header"]') as HTMLElement
    expect(parts(header)).toEqual(['title', 'info', 'legend'])
    expect(screen.getByRole('button', { name: 'About the revenue' })).toBeTruthy()
    const alternative = container.querySelector('[data-part="alternative"]') as HTMLElement
    expect(alternative.textContent).toBe('January 120, February 140')
    expect(alternative.className).toBe('sr-only')
    // @ts-expect-error card/chart: the chart has a text alternative.
    const none = <CardChart>{null}</CardChart>
    expect(none).toBeTruthy()
  })

  it('card/content: a content card shows the photo, the title, the owner, and the value (the content is from the screen)', () => {
    const { container } = render(
      <Card variant="content" href="/products/1">
        <CardMedia counter="Photo 1 of 4" badge="In stock">
          {photo}
        </CardMedia>
        <CardHeader level={3} title="Kente scarf" />
        <CardBody>Northside Crafts · 120.00</CardBody>
      </Card>,
    )
    expect(card(container).dataset.variant).toBe('content')
    expect(screen.getByRole('img', { name: 'A blue scarf' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Kente scarf' })).toBeTruthy()
    expect(container.querySelector('[data-part="body"]')?.textContent).toBe('Northside Crafts · 120.00')
    expect([...card(container).children].map((e) => e.getAttribute('data-part'))).toEqual(['media', 'header', 'body'])
  })

  it('card/content-counter: the photo has a counter and a stock badge, as text; the two props are necessary', () => {
    render(
      <Card variant="content">
        <CardMedia counter="Photo 1 of 4" badge="Sold out">
          {photo}
        </CardMedia>
        <CardHeader level={3} title="Kente scarf" />
      </Card>,
    )
    expect(screen.getByText('Photo 1 of 4').dataset.part).toBe('counter')
    expect(screen.getByText('Sold out').dataset.part).toBe('badge')
    // @ts-expect-error card/content-counter: a photo with no counter and no badge.
    const none = <CardMedia>{photo}</CardMedia>
    expect(none).toBeTruthy()
  })

  it('card/availability: the stock of an item is data of the app, not of the card (review)', () => {
    // The card shows the badge text that the app gives. The app gives the true stock of the item.
    expect(clause('card/availability')?.level).toBe('NEVER')
  })

  it('card/large-text: the columns of the stat cards are a rule for the layout of the screen (review)', () => {
    expect(clause('card/large-text')?.level).toBe('SHOULD')
  })

  it('card/tv-focus, card/tv-press, card/tv-title, card/car, card/watch, card/xr: device classes that this package does not target (review)', () => {
    // The package has the axes pointer and touch (data-density). It has no TV, car, watch, or XR class at this time.
    expect(clause('card/tv-focus')?.classes).toEqual(['tv'])
    expect(clause('card/tv-press')?.classes).toEqual(['tv'])
    expect(clause('card/tv-title')?.classes).toEqual(['tv'])
    expect(clause('card/car')?.classes).toEqual(['car'])
    expect(clause('card/watch')?.classes).toEqual(['watch'])
    expect(clause('card/xr')?.classes).toEqual(['xr'])
  })
})
