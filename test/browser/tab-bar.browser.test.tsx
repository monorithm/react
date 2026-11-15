// @vitest-environment node
// The browser test of the Tab bar: the real CSS in a real Chrome. It measures the clauses that jsdom cannot compute: the
// sizes of the densities, the safe area, the colors of the themes, the count and the dot, the states, the direction,
// and the motion. Each test name starts with the id of a clause of ir/contracts/tab-bar.json.
import type { Browser, CDPSession, Page } from 'playwright-core'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TabBar } from '@monorithm/react/components/tab-bar/tab-bar'
import type { TabBarDestination, TabBarDestinations } from '@monorithm/react/components/tab-bar/tab-bar.destination'
import { contract as loadContract } from '@monorithm/react/test/contract'
import { box, cell, openPage, style } from './harness'

let browser: Browser
let page: Page
let cdp: CDPSession

/** The bottom safe area of a phone with a home indicator: 34 px (tab-bar/height). */
const homeIndicator = loadContract('tab-bar').geometry['safe-area.home-indicator']?.value ?? 0

const Glyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
)
const d = (value: string, label: string, extra: Partial<TabBarDestination> = {}): TabBarDestination =>
  ({ value, label, icon: <Glyph />, href: `#${value}`, ...extra }) as TabBarDestination
const five: TabBarDestinations = [
  d('home', 'Home'),
  d('orders', 'Orders', { count: 12 }),
  d('create', 'Create'),
  d('inbox', 'Inbox', { dot: 'New items' }),
  d('payouts', 'Payouts', { disabled: true, disabledReason: 'Verify your account first' }),
]
const html = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>)
const bar = (destinations: TabBarDestinations = five) => html(<TabBar label="Main" destinations={destinations} current="home" primary="create" />)

beforeAll(async () => {
  const body = [
    // The first cell has the first focusable element: the focus test presses Tab one time.
    cell('focus', 'data-density="pointer"', bar([d('home', 'Home'), d('orders', 'Orders'), d('create', 'Create')])),
    cell('pointer', 'data-density="pointer"', bar()),
    cell('touch', 'data-density="touch"', bar()),
    cell('light', 'data-theme="light" data-density="touch"', bar()),
    cell('rtl', 'data-density="touch" dir="rtl"', bar([d('home', 'Home'), d('orders', 'Orders', { count: 12, mirror: true }), d('inbox', 'Inbox', { dot: 'New items' })])),
    cell('wrap', 'data-density="touch"', bar([d('home', 'Home'), d('alerts', 'Notifications of the account'), d('create', 'Create'), d('more', 'More')])),
    cell('reduced', 'data-density="touch" data-motion="reduced"', bar()),
  ].join('')
  ;({ browser, page } = await openPage(body))
  cdp = await page.context().newCDPSession(page)
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

/** A destination by its position in the bar (1 is the first in the DOM). */
const nth = (cellId: string, n: number) => `#${cellId} li:nth-child(${n}) > [data-part="destination"]`
const part = (cellId: string, n: number, name: string) => `${nth(cellId, n)} [data-part="${name}"]`
const visibleLabel = (cellId: string, n: number) => `${part(cellId, n, 'label')} > span:not([aria-hidden])`
const center = (b: { x: number; width: number }) => b.x + b.width / 2

/** Scrolls the element into view, puts the pointer down at its center, and waits for the end of the transitions. */
async function pressAt(selector: string): Promise<{ x: number; y: number; width: number; height: number }> {
  await page.locator(selector).first().scrollIntoViewIfNeeded()
  const rest = await box(page, selector)
  await page.mouse.move(rest.x + rest.width / 2, rest.y + rest.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(250)
  return rest
}

describe('Tab bar in Chrome', () => {
  it('tab-bar/focus: Tab shows the ring on the destination: 2 px in the ring color, 2 px from the destination', async () => {
    await page.keyboard.press('Tab')
    const s = nth('focus', 1)
    expect(await page.evaluate(() => document.activeElement?.getAttribute('href'))).toBe('#home')
    expect(await style(page, s, 'outline-style')).toBe('solid')
    expect(await style(page, s, 'outline-width')).toBe('2px')
    expect(await style(page, s, 'outline-offset')).toBe('2px')
    expect(await style(page, s, 'outline-color')).toBe('rgb(92, 163, 255)')
  })

  it('tab-bar/keyboard: Tab moves the focus to each destination in the visual sequence', async () => {
    const xs = [(await box(page, nth('focus', 1))).x]
    for (const n of [2, 3]) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => document.activeElement?.closest('li') !== null)).toBe(true)
      xs.push((await box(page, nth('focus', n))).x)
    }
    expect(xs).toEqual([...xs].sort((a, b) => a - b))
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  })

  it('tab-bar/height and tab-bar/density: the bar is 56 px high in the pointer and the touch density', async () => {
    for (const id of ['pointer', 'touch']) expect((await box(page, `#${id} nav`)).height).toBe(56)
  })

  it('tab-bar/density: the icon of 24 px and the label of 11 px do not change with the density', async () => {
    for (const id of ['pointer', 'touch']) {
      const i = await box(page, part(id, 1, 'icon'))
      expect([i.width, i.height]).toEqual([24, 24])
      expect(await style(page, part(id, 1, 'label'), 'font-size')).toBe('11px')
    }
  })

  it('tab-bar/safe-area and tab-bar/height: the safe area of 34 px adds to the bar; the destinations stay above it', async () => {
    expect(homeIndicator).toBe(34)
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { bottom: homeIndicator } })
    try {
      const nav = await box(page, '#touch nav')
      const list = await box(page, '#touch ul')
      expect(nav.height).toBe(56 + homeIndicator)
      expect(list.height).toBe(56)
      expect(list.y).toBe(nav.y)
      expect(nav.y + nav.height - (list.y + list.height)).toBe(homeIndicator)
      // The fill of the bar continues behind the home indicator: the padding of the nav has its background.
      expect(await style(page, '#touch nav', 'padding-bottom')).toBe(`${homeIndicator}px`)
      expect(await style(page, '#touch nav', 'background-clip')).toBe('border-box')
      expect(await style(page, '#touch nav', 'background-color')).toBe('rgb(24, 24, 24)')
    } finally {
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: {} })
    }
    expect((await box(page, '#touch nav')).height).toBe(56)
  })

  it('tab-bar/bar: the background fill and a line of 1 px in the subtle line color at the top edge', async () => {
    expect(await style(page, '#touch nav', 'background-color')).toBe('rgb(24, 24, 24)')
    expect(await style(page, '#touch nav', 'box-shadow')).toMatch(/rgb\(37, 37, 37\) 0px 1px 0px 0px inset$/)
    expect(await style(page, '#light nav', 'background-color')).toBe('rgb(250, 250, 250)')
    expect(await style(page, '#light nav', 'box-shadow')).toMatch(/rgb\(235, 235, 235\) 0px 1px 0px 0px inset$/)
  })

  it('tab-bar/layout: the destinations have the same width and fill the bar; the icon is above the label, centered, 3 px', async () => {
    const nav = await box(page, '#touch nav')
    const widths: number[] = []
    for (let n = 1; n <= 5; n++) widths.push((await box(page, nth('touch', n))).width)
    // Chrome lays out in units of 1/64 px: each width is the fifth of the bar to the nearest unit.
    for (const w of widths) expect(Math.abs(w - nav.width / 5)).toBeLessThanOrEqual(1 / 64)
    expect(Math.abs(widths.reduce((a, b) => a + b, 0) - nav.width)).toBeLessThanOrEqual(1 / 64)
    const dest = await box(page, nth('touch', 1))
    const i = await box(page, part('touch', 1, 'icon'))
    const l = await box(page, part('touch', 1, 'label'))
    expect(Math.abs(center(i) - center(dest))).toBeLessThanOrEqual(1 / 64)
    expect(Math.abs(center(l) - center(dest))).toBeLessThanOrEqual(1 / 64)
    expect(l.y - (i.y + i.height)).toBeCloseTo(3, 3)
  })

  it('tab-bar/icon: the icon is 24 px with a stroke of 1.75 px, in the color of its label', async () => {
    const svg = `${part('touch', 1, 'glyph')} svg`
    const g = await box(page, svg)
    expect([g.width, g.height]).toEqual([24, 24])
    expect(await style(page, svg, 'stroke-width')).toBe('1.75px')
    expect(await style(page, svg, 'color')).toBe(await style(page, visibleLabel('touch', 1), 'color'))
    expect(await style(page, `${part('touch', 2, 'glyph')} svg`, 'color')).toBe(await style(page, visibleLabel('touch', 2), 'color'))
  })

  it('tab-bar/target: each destination has the full height of the bar and the minimum target of the density or more', async () => {
    for (const [id, min] of [
      ['pointer', 24],
      ['touch', 44],
    ] as const) {
      const nav = await box(page, `#${id} nav`)
      const dest = await box(page, nth(id, 2))
      expect(dest.height).toBe(nav.height)
      expect(dest.width).toBeGreaterThanOrEqual(min)
      expect(await style(page, nth(id, 2), 'min-height')).toBe(`${min}px`)
    }
  })

  it('tab-bar/color: a destination that is not current has the secondary text color, in each theme', async () => {
    expect(await style(page, nth('touch', 2), 'color')).toBe('rgb(176, 176, 176)')
    expect(await style(page, nth('light', 2), 'color')).toBe('rgb(82, 82, 82)')
    expect(await style(page, visibleLabel('touch', 2), 'font-weight')).toBe('400')
  })

  it('tab-bar/selected-sign: the current destination has the strong text color and the strong weight; the icon is not filled', async () => {
    expect(await style(page, nth('touch', 1), 'color')).toBe('rgb(245, 245, 245)')
    expect(await style(page, nth('light', 1), 'color')).toBe('rgb(10, 10, 10)')
    expect(await style(page, visibleLabel('touch', 1), 'font-weight')).toBe('500')
    expect(await style(page, `${part('touch', 1, 'glyph')} svg`, 'fill')).toBe('none')
    // The strong weight does not move the label: the strong layer keeps the width of the label.
    expect((await box(page, part('touch', 1, 'label'))).height).toBe((await box(page, part('touch', 2, 'label'))).height)
  })

  it('tab-bar/primary-destination: the icon is on the primary fill, in a shape of 38 by 28 px; the label stays', async () => {
    for (const [id, radius, glyph] of [
      ['pointer', '8px', 16],
      ['touch', '10px', 20],
    ] as const) {
      const m = await box(page, part(id, 3, 'primary-mark'))
      expect([m.width, m.height]).toEqual([38, 28])
      const i = await box(page, part(id, 3, 'icon'))
      expect(center(m)).toBeCloseTo(center(i), 3)
      expect(await style(page, part(id, 3, 'primary-mark'), 'background-color')).toBe('rgb(245, 245, 245)')
      expect(await style(page, part(id, 3, 'primary-mark'), 'border-top-left-radius')).toBe(radius)
      expect(await style(page, part(id, 3, 'glyph'), 'color')).toBe('rgb(20, 20, 20)')
      const g = await box(page, `${part(id, 3, 'glyph')} svg`)
      expect([g.width, g.height]).toEqual([glyph, glyph])
      // The label is on the line of the other labels.
      expect((await box(page, part(id, 3, 'label'))).y).toBe((await box(page, part(id, 2, 'label'))).y)
    }
    expect(await style(page, part('light', 3, 'primary-mark'), 'background-color')).toBe('rgb(20, 20, 20)')
    expect(await style(page, part('touch', 3, 'primary-mark'), 'position')).toBe('absolute')
    expect(await style(page, nth('touch', 3), 'position')).toBe('relative')
  })

  it('tab-bar/count-badge: the accent fill, the accent foreground text, a full radius, and a height of 17 px or more', async () => {
    const s = part('touch', 2, 'count')
    const c = await box(page, s)
    expect(c.height).toBe(17)
    expect(c.width).toBeGreaterThanOrEqual(17)
    expect(await style(page, s, 'background-color')).toBe('rgb(92, 163, 255)')
    expect(await style(page, s, 'color')).toBe('rgb(10, 10, 10)')
    expect(await style(page, s, 'border-top-left-radius')).toBe('999px')
    expect(await style(page, s, 'font-size')).toBe('11px')
    expect(await style(page, s, 'font-weight')).toBe('500')
    expect(await style(page, s, 'padding-inline-start')).toBe('4px')
    expect(await style(page, part('light', 2, 'count'), 'background-color')).toBe('rgb(31, 111, 224)')
    expect(await style(page, part('light', 2, 'count'), 'color')).toBe('rgb(255, 255, 255)')
  })

  it('tab-bar/count-position: 5 px from the top edge; the start edge 6 px from the center of the icon; a ring of 2 px', async () => {
    const dest = await box(page, nth('touch', 2))
    const i = await box(page, part('touch', 2, 'icon'))
    const c = await box(page, part('touch', 2, 'count'))
    expect(c.y - dest.y).toBe(5)
    expect(c.x - center(i)).toBeCloseTo(6, 3)
    // Tailwind puts its empty ring and inset shadows first. The ring of the count is the last shadow.
    expect(await style(page, part('touch', 2, 'count'), 'box-shadow')).toMatch(/, rgb\(24, 24, 24\) 0px 0px 0px 2px$/)
    expect(await style(page, part('light', 2, 'count'), 'box-shadow')).toMatch(/, rgb\(250, 250, 250\) 0px 0px 0px 2px$/)
  })

  it('tab-bar/dot: a dot of 8 px in the accent color at the top of the icon, on the end side, with a ring', async () => {
    const s = part('touch', 4, 'dot')
    const dot = await box(page, s)
    const i = await box(page, part('touch', 4, 'icon'))
    expect([dot.width, dot.height]).toEqual([8, 8])
    expect(dot.x).toBeGreaterThan(center(i))
    expect(dot.y).toBeLessThan(i.y + i.height / 2)
    expect(await style(page, s, 'background-color')).toBe('rgb(92, 163, 255)')
    expect(await style(page, s, 'border-top-left-radius')).toBe('999px')
    expect(await style(page, s, 'box-shadow')).toMatch(/, rgb\(24, 24, 24\) 0px 0px 0px 2px$/)
  })

  it('tab-bar/label-wrap: a long label wraps; the bar grows and never cuts the label', async () => {
    const l = await box(page, part('wrap', 2, 'label'))
    const one = await box(page, part('wrap', 1, 'label'))
    expect(l.height).toBeGreaterThan(one.height)
    const cut = await page
      .locator(part('wrap', 2, 'label'))
      .evaluate((el) => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight || getComputedStyle(el).textOverflow === 'ellipsis')
    expect(cut).toBe(false)
    const dest = await box(page, nth('wrap', 2))
    const nav = await box(page, '#wrap nav')
    expect(l.y + l.height).toBeLessThanOrEqual(dest.y + dest.height)
    expect(l.x).toBeGreaterThanOrEqual(dest.x)
    expect(l.x + l.width).toBeLessThanOrEqual(dest.x + dest.width + 0.01)
    expect(nav.height).toBeGreaterThan(56)
    // The destinations keep the same width.
    expect(dest.width).toBeCloseTo((await box(page, nth('wrap', 1))).width, 3)
  })

  it('tab-bar/hover: a device with hover shows the strong text color on the icon and the label', async () => {
    const s = nth('touch', 2)
    await page.locator(s).scrollIntoViewIfNeeded()
    await page.hover(s)
    await page.waitForTimeout(250)
    expect(await style(page, s, 'color')).toBe('rgb(245, 245, 245)')
    await page.mouse.move(0, 0)
    await page.waitForTimeout(250)
    expect(await style(page, s, 'color')).toBe('rgb(176, 176, 176)')
  })

  it('tab-bar/hover: a device with no hover shows no hover state', async () => {
    // A context with touch gives (hover: none), as on a phone. A second context is reliable on each runner: the touch
    // emulation of one page does not change its hover media query on each platform.
    const context = await browser.newContext({ hasTouch: true })
    const phone = await context.newPage()
    await phone.setContent(await page.content())
    expect(await phone.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(false)
    const s = nth('touch', 2)
    const b = await box(phone, s)
    await phone.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
    await phone.waitForTimeout(250)
    expect(await style(phone, s, 'color')).toBe('rgb(176, 176, 176)')
    await context.close()
  })

  it('tab-bar/press: at pointer down, the destination scales to 0.97 in 100 ms; at the release it goes back', async () => {
    const s = nth('touch', 2)
    expect(await style(page, s, 'transition-property')).toBe('color, scale')
    expect(await style(page, s, 'transition-duration')).toBe('0.15s, 0.1s')
    expect(await style(page, s, 'transition-timing-function')).toBe('cubic-bezier(0.25, 0.1, 0.25, 1)')
    // A click on the link opens its hash. Stop it, so that the page does not scroll.
    await page.locator(s).evaluate((el) => el.addEventListener('click', (e) => e.preventDefault()))
    const rest = await pressAt(s)
    expect((await box(page, s)).width / rest.width).toBeCloseTo(0.97, 3)
    await page.mouse.up()
    await page.waitForTimeout(250)
    expect((await box(page, s)).width).toBeCloseTo(rest.width, 3)
  })

  it('tab-bar/motion: the color and the weight change in 150 ms', async () => {
    expect(await style(page, visibleLabel('touch', 1), 'transition-property')).toBe('font-weight')
    expect(await style(page, visibleLabel('touch', 1), 'transition-duration')).toBe('0.15s')
    expect((await style(page, nth('touch', 1), 'transition-duration')).split(', ')[0]).toBe('0.15s')
  })

  it('tab-bar/reduced-motion: with reduced motion, the press has no scale; the change of color stays', async () => {
    const s = nth('reduced', 2)
    await page.locator(s).evaluate((el) => el.addEventListener('click', (e) => e.preventDefault()))
    let rest = await pressAt(s)
    expect((await box(page, s)).width).toBe(rest.width)
    await page.mouse.up()
    expect(await style(page, s, 'transition-property')).toBe('color, scale')
    // The reduced motion of the system has the same effect.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    try {
      const t = nth('touch', 2)
      rest = await pressAt(t)
      expect((await box(page, t)).width).toBe(rest.width)
      await page.mouse.up()
    } finally {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
    }
  })

  it('tab-bar/disabled: a disabled destination has the disabled opacity', async () => {
    expect(await style(page, nth('touch', 5), 'opacity')).toBe('0.4')
    expect(await style(page, nth('touch', 1), 'opacity')).toBe('1')
  })

  it('tab-bar/direction: in right-to-left, the first destination is at the right; the count is at the top left of the icon', async () => {
    const first = await box(page, nth('rtl', 1))
    const second = await box(page, nth('rtl', 2))
    const third = await box(page, nth('rtl', 3))
    expect(first.x).toBeGreaterThan(second.x)
    expect(second.x).toBeGreaterThan(third.x)
    const i = await box(page, part('rtl', 2, 'icon'))
    const c = await box(page, part('rtl', 2, 'count'))
    expect(center(i) - (c.x + c.width)).toBeCloseTo(6, 3)
    expect(c.y - second.y).toBe(5)
    const dot = await box(page, part('rtl', 3, 'dot'))
    expect(dot.x + dot.width).toBeLessThan(center(await box(page, part('rtl', 3, 'icon'))))
  })

  it('tab-bar/direction-icons: in right-to-left, an icon that points forward mirrors; an icon of an object keeps its form', async () => {
    expect(await style(page, part('rtl', 2, 'glyph'), 'scale')).toBe('-1 1')
    expect(await style(page, part('rtl', 1, 'glyph'), 'scale')).toBe('none')
  })

  it('tab-bar/direction-focus: in right-to-left, Tab moves the focus from the first destination at the right to its left', async () => {
    await page.locator(nth('rtl', 1)).focus()
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.getAttribute('href'))).toBe('#orders')
    const from = await box(page, nth('rtl', 1))
    const to = await box(page, nth('rtl', 2))
    expect(to.x + to.width).toBeLessThanOrEqual(from.x + 0.01)
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  })
})
