// @vitest-environment node
// The browser test of the Tabs: the real CSS in a real Chrome. It measures the clauses that jsdom cannot compute: the
// accessibility tree, the sizes of the densities, the target, the line and the indicator, the count, the colors of the
// themes and the states, the scroll of a long list, the direction, the focus ring, and the motion. Each test name starts
// with the id of a clause of ir/contracts/tabs.json.
//
// The static page has no React. The script of Base UI (renderBeforeHydration) gives the indicator the position of the
// selected tab, as in a page from the server.
import type { Browser, Page } from 'playwright-core'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type TabItem, Tabs, type TabsProps } from '@monorithm/react/components/tabs/tabs'
import { revealTab } from '@monorithm/react/components/tabs/tabs.scroll'
import { box, cell, openPage, style } from './harness'

let browser: Browser
let page: Page

const html = (node: ReactNode) => renderToStaticMarkup(<>{node}</>)

const views: readonly TabItem[] = [
  { value: 'products', label: 'Products', count: 24, panel: <p>The products</p> },
  { value: 'posts', label: 'Posts', count: 58, panel: <p>The posts</p> },
  { value: 'orders', label: 'Orders', disabled: true, disabledReason: 'Not available at this time', panel: <p>The orders</p> },
]
const storefront = (props: Partial<TabsProps> = {}) => <Tabs label="Storefront" defaultValue="posts" tabs={views} {...props} />
const narrow = (
  <Tabs
    label="Sizes"
    tabs={['S', 'M', 'L'].map((s) => ({ value: s, label: s, panel: <p>Size {s}</p> }))}
  />
)
const long = (props: Partial<TabsProps> = {}) => (
  <Tabs
    label="Collections"
    tabs={Array.from({ length: 8 }, (_, i) => ({ value: `c${i}`, label: `Collection ${i + 1}`, panel: <p>Collection {i + 1}</p> }))}
    {...props}
  />
)

beforeAll(async () => {
  const body = [
    cell('focus', 'data-density="pointer"', html(storefront())),
    ...(['pointer', 'touch'] as const).map((d) => cell(d, `data-density="${d}"`, html(storefront()))),
    cell('light', 'data-density="pointer" data-theme="light"', html(storefront())),
    cell('rtl', 'data-density="pointer" dir="rtl"', html(storefront({ locale: 'ar-EG' }))),
    ...(['pointer', 'touch'] as const).map((d) => cell(`narrow-${d}`, `data-density="${d}"`, html(narrow))),
    cell('long', 'data-density="pointer"', html(long())),
    cell('long-rtl', 'data-density="pointer" dir="rtl"', html(long())),
    cell('tv', 'data-density="pointer"', html(storefront({ size: 'tv' }))),
    cell('move', 'data-density="pointer"', html(storefront())),
    cell('reduced', 'data-density="pointer" data-motion="reduced"', html(storefront())),
    // tabs/foldable: a width that follows the window, as the posture of a foldable changes it.
    `<div id="fold" data-density="pointer" style="width:50vw;padding:8px">${html(long({ defaultValue: 'c3' }))}</div>`,
  ].join('')
  ;({ browser, page } = await openPage(body))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

const list = (c: string) => `#${c} [role="tablist"]`
const scroller = (c: string) => `#${c} [data-part="scroller"]`
const tab = (c: string, name: string) => `#${c} [role="tab"]:has-text("${name}")`
const tabAt = (c: string, i: number) => `#${c} [role="tab"] >> nth=${i}`
const label = (c: string, name: string) => `${tab(c, name)} [data-part="label"]`
const count = (c: string, name: string) => `${tab(c, name)} [data-part="count"]`
const indicator = (c: string) => `#${c} [data-part="indicator"]`
const panel = (c: string) => `#${c} [role="tabpanel"]`

/** Moves the indicator to a tab, as Base UI does at a change. The static page has no React events. */
const moveTo = (c: string, i: number) =>
  page.evaluate(
    ([sel, n]) => {
      const l = document.querySelector(sel as string) as HTMLElement
      const t = l.querySelectorAll('[role="tab"]')[n as number] as HTMLElement
      const ind = l.querySelector('[data-part="indicator"]') as HTMLElement
      ind.style.setProperty('--active-tab-left', `${t.getBoundingClientRect().left - l.getBoundingClientRect().left - l.clientLeft}px`)
      ind.style.setProperty('--active-tab-width', `${t.getBoundingClientRect().width}px`)
    },
    [list(c), i] as const,
  )

/** Runs the scroll function of the component in Chrome (tabs.scroll.ts has no import and no closure). */
const reveal = (c: string, i: number) =>
  page.evaluate(
    ([source, s, t, n]) => {
      const run = new Function(`return (${source as string})`)() as (scroller: Element | null, tab: Element | null) => void
      run(document.querySelector(s as string), document.querySelectorAll(t as string)[n as number] ?? null)
    },
    [revealTab.toString(), scroller(c), `#${c} [role="tab"]`, i] as const,
  )

describe('Tabs in Chrome', () => {
  it('tabs/role and tabs/name: a tab list with its name; each tab has its name and its state, in the order of the list', async () => {
    // The order of the tabs in the tab list gives the position of each tab, for example 2 of 3. The panel gets the name
    // of its tab when React starts (aria-labelledby): the jsdom test examines it.
    expect(await page.locator('#pointer').ariaSnapshot()).toBe(
      [
        '- tablist "Storefront":',
        '  - tab "Products 24"',
        '  - tab "Posts 58" [selected]',
        '  - tab "Orders" [disabled]',
        '- tabpanel:',
        '  - paragraph: The posts',
      ].join('\n'),
    )
  })

  it('tabs/density: a tab is 40 px high for pointer and 52 px for touch; the label 14 px and 16 px; a count 12 px and 13 px', async () => {
    expect((await box(page, tab('pointer', 'Posts'))).height).toBe(40)
    expect((await box(page, tab('touch', 'Posts'))).height).toBe(52)
    expect(await style(page, tab('pointer', 'Posts'), 'font-size')).toBe('14px')
    expect(await style(page, tab('touch', 'Posts'), 'font-size')).toBe('16px')
    expect(await style(page, count('pointer', 'Posts'), 'font-size')).toBe('12px')
    expect(await style(page, count('touch', 'Posts'), 'font-size')).toBe('13px')
  })

  it('tabs/list: a line of 1 px in the line color for the full width of the list; a gap of 24 px; 2 px at each side of a tab', async () => {
    for (const d of ['pointer', 'touch']) {
      expect(await style(page, list(d), 'border-bottom-width')).toBe('1px')
      expect(await style(page, list(d), 'border-bottom-style')).toBe('solid')
      expect(await style(page, list(d), 'border-bottom-color')).toBe('rgb(46, 46, 46)')
      expect((await box(page, list(d))).width).toBe(320 - 2 * 8)
      const first = await box(page, tabAt(d, 0))
      const second = await box(page, tabAt(d, 1))
      expect(second.x - (first.x + first.width)).toBeCloseTo(24, 0)
      expect(await style(page, tabAt(d, 0), 'padding-left')).toBe('2px')
      expect(await style(page, tabAt(d, 0), 'padding-right')).toBe('2px')
      // Each tab has the full height of the list, above the line.
      const l = await box(page, list(d))
      expect([first.y, first.y + first.height]).toEqual([l.y, l.y + l.height - 1])
    }
  })

  it('tabs/label: a tab that is not selected has the muted text color and the normal weight; each label is on one line', async () => {
    expect(await style(page, tab('pointer', 'Products'), 'color')).toBe('rgb(158, 158, 158)')
    expect(await style(page, tab('pointer', 'Products'), 'font-weight')).toBe('400')
    for (const c of ['pointer', 'touch', 'long']) {
      const lineHeight = parseFloat(await style(page, tabAt(c, 0), 'line-height'))
      for (let i = 0; i < 3; i++) {
        const t = await box(page, tabAt(c, i))
        const l = await box(page, `${tabAt(c, i)} >> [data-part="label"]`)
        expect(l.height).toBe(lineHeight)
        // No part of the label is cut: the label is in the box of its tab, and the text is not wider than the label.
        expect(l.x).toBeGreaterThanOrEqual(t.x)
        expect(l.x + l.width).toBeLessThanOrEqual(t.x + t.width)
        expect(await page.locator(`${tabAt(c, i)} >> [data-part="label"]`).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
      }
    }
  })

  it('tabs/selected-sign: the selected tab has the strong text color, the strong weight, and the indicator of 2 px', async () => {
    expect(await style(page, tab('pointer', 'Posts'), 'color')).toBe('rgb(245, 245, 245)')
    expect(await style(page, tab('pointer', 'Posts'), 'font-weight')).toBe('500')
    expect(await style(page, indicator('pointer'), 'background-color')).toBe('rgb(245, 245, 245)')
    expect((await box(page, indicator('pointer'))).height).toBe(2)
    expect((await box(page, indicator('touch'))).height).toBe(2)
  })

  it('tabs/selected-sign: the change of weight does not change the width of a tab', async () => {
    const widths = await Promise.all([0, 1].map(async (i) => (await box(page, tabAt('pointer', i))).width))
    await page.evaluate(() => {
      const tabs = document.querySelectorAll('#pointer [role="tab"]')
      tabs[1]?.removeAttribute('data-active')
      tabs[0]?.setAttribute('data-active', '')
    })
    const after = await Promise.all([0, 1].map(async (i) => (await box(page, tabAt('pointer', i))).width))
    expect(after).toEqual(widths)
    await page.evaluate(() => {
      const tabs = document.querySelectorAll('#pointer [role="tab"]')
      tabs[0]?.removeAttribute('data-active')
      tabs[1]?.setAttribute('data-active', '')
    })
  })

  it('tabs/indicator: the indicator has the full width of the selected tab with its count, a radius of 2 px, and covers the line', async () => {
    for (const d of ['pointer', 'touch']) {
      const i = await box(page, indicator(d))
      const t = await box(page, tab(d, 'Posts'))
      const c = await box(page, count(d, 'Posts'))
      const l = await box(page, list(d))
      expect(i.x).toBeCloseTo(t.x, 0)
      expect(i.width).toBeCloseTo(t.width, 0)
      expect(c.x + c.width).toBeLessThanOrEqual(i.x + i.width)
      // The indicator is at the bottom edge of the tab, and its bottom edge is the bottom edge of the line.
      expect([i.y, i.y + i.height]).toEqual([t.y + t.height - 1, l.y + l.height])
      expect(await style(page, indicator(d), 'border-top-left-radius')).toBe('2px')
      expect(await style(page, indicator(d), 'border-bottom-right-radius')).toBe('2px')
    }
  })

  it('tabs/count-shape: a pill 18 px high, 20 px wide or more, 6 px at each side; the selected fill, fg-2, the strong weight', async () => {
    for (const d of ['pointer', 'touch']) {
      const c = await box(page, count(d, 'Posts'))
      expect(c.height).toBe(18)
      expect(c.width).toBeGreaterThanOrEqual(20)
      expect(await style(page, count(d, 'Posts'), 'padding-left')).toBe('6px')
      expect(await style(page, count(d, 'Posts'), 'padding-right')).toBe('6px')
      expect(await style(page, count(d, 'Posts'), 'border-top-left-radius')).toBe('999px')
      expect(await style(page, count(d, 'Posts'), 'background-color')).toBe('rgb(37, 37, 37)')
      expect(await style(page, count(d, 'Posts'), 'color')).toBe('rgb(176, 176, 176)')
      expect(await style(page, count(d, 'Posts'), 'font-weight')).toBe('500')
      // The gap from the label to the count is 6 px. The count is at the center of the tab on the vertical axis.
      const l = await box(page, label(d, 'Posts'))
      expect(c.x - (l.x + l.width)).toBeCloseTo(6, 0)
      const t = await box(page, tab(d, 'Posts'))
      expect(c.y + c.height / 2).toBeCloseTo(t.y + t.height / 2, 0)
    }
  })

  it('tabs/label and tabs/count-shape: the light theme has its own text colors, line, and count fill', async () => {
    expect(await style(page, tab('light', 'Products'), 'color')).toBe('rgb(107, 107, 107)')
    expect(await style(page, tab('light', 'Posts'), 'color')).toBe('rgb(10, 10, 10)')
    expect(await style(page, indicator('light'), 'background-color')).toBe('rgb(10, 10, 10)')
    expect(await style(page, list('light'), 'border-bottom-color')).toBe('rgb(224, 224, 224)')
    expect(await style(page, count('light', 'Posts'), 'background-color')).toBe('rgb(235, 235, 235)')
    expect(await style(page, count('light', 'Posts'), 'color')).toBe('rgb(82, 82, 82)')
  })

  it('tabs/disabled: a disabled tab has the opacity 0.4', async () => {
    expect(await style(page, tab('pointer', 'Orders'), 'opacity')).toBe('0.4')
    expect(await style(page, tab('pointer', 'Products'), 'opacity')).toBe('1')
  })

  it('tabs/hover: at hover, the label of a tab that is not selected has the body text color', async () => {
    const t = tab('pointer', 'Products')
    await page.locator(t).scrollIntoViewIfNeeded()
    await page.hover(t)
    await page.waitForTimeout(250)
    expect(await style(page, t, 'color')).toBe('rgb(224, 224, 224)')
    await page.hover(tab('pointer', 'Posts'))
    await page.waitForTimeout(250)
    expect(await style(page, tab('pointer', 'Posts'), 'color')).toBe('rgb(245, 245, 245)')
    await page.hover(tab('pointer', 'Orders'))
    await page.waitForTimeout(250)
    expect(await style(page, tab('pointer', 'Orders'), 'color')).toBe('rgb(158, 158, 158)')
    await page.mouse.move(0, 0)
  })

  it('tabs/focus: Tab shows the ring on the selected tab: 2 px in the ring color, 2 px from the tab', async () => {
    // The static page has no React effects: the test gives the selected tab the tab index that Base UI gives it.
    await page.evaluate(() => document.querySelector('#focus [role="tab"][data-active]')?.setAttribute('tabindex', '0'))
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Posts 58')
    expect(await style(page, tab('focus', 'Posts'), 'outline-style')).toBe('solid')
    expect(await style(page, tab('focus', 'Posts'), 'outline-width')).toBe('2px')
    expect(await style(page, tab('focus', 'Posts'), 'outline-offset')).toBe('2px')
    expect(await style(page, tab('focus', 'Posts'), 'outline-color')).toBe('rgb(92, 163, 255)')
  })

  it('tabs/focus: the scroll area of the list does not cut the ring of the first tab or of the last tab', async () => {
    for (const c of ['pointer', 'touch', 'rtl']) {
      const s = await box(page, scroller(c))
      for (const i of [0, 2]) {
        const t = await box(page, tabAt(c, i))
        expect(t.x - 4).toBeGreaterThanOrEqual(s.x)
        expect(t.x + t.width + 4).toBeLessThanOrEqual(s.x + s.width)
        expect(t.y - 4).toBeGreaterThanOrEqual(s.y)
        expect(t.y + t.height + 4).toBeLessThanOrEqual(s.y + s.height)
      }
    }
  })

  it('tabs/focus: a pointer press shows no ring', async () => {
    await page.locator(tab('touch', 'Products')).scrollIntoViewIfNeeded()
    await page.click(tab('touch', 'Products'))
    expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Products 24')
    expect(await style(page, tab('touch', 'Products'), 'outline-style')).toBe('none')
  })

  it('tabs/target: each tab has the full height; a narrow tab extends its target into the gap to the minimum target', async () => {
    for (const [d, min] of [['pointer', 24], ['touch', 44]] as const) {
      await page.locator(`#narrow-${d}`).scrollIntoViewIfNeeded()
      const l = await box(page, list(`narrow-${d}`))
      for (let i = 0; i < 3; i++) {
        const t = await box(page, tabAt(`narrow-${d}`, i))
        expect(t.height).toBeGreaterThanOrEqual(min)
        // The target of the first tab starts at the tab and goes to its end side. The last tab goes to its start side.
        const start = i === 0 ? t.x : i === 2 ? t.x + t.width - Math.max(min, t.width) : t.x + t.width / 2 - Math.max(min, t.width) / 2
        const hits = await page.evaluate(
          ([points, name]) => (points as readonly (readonly [number, number])[]).map(([x, y]) => document.elementFromPoint(x, y)?.closest('[role="tab"]')?.textContent?.startsWith(name as string) ?? false),
          [
            [
              [start + 0.5, t.y + t.height / 2],
              [start + Math.max(min, t.width) - 0.5, t.y + t.height / 2],
              [t.x + t.width / 2, t.y + 0.5],
              [t.x + t.width / 2, t.y + t.height - 0.5],
            ],
            ['S', 'M', 'L'][i],
          ] as const,
        )
        expect(hits).toEqual([true, true, true, true])
      }
      // The targets do not make the list wider than its tabs: the list does not scroll.
      const s = await page.locator(scroller(`narrow-${d}`)).evaluate((el) => [el.scrollWidth, el.clientWidth])
      expect(s[0]).toBe(s[1])
      expect(l.width).toBe(320 - 2 * 8)
    }
  })

  it('tabs/overflow: a list that is too wide scrolls on the horizontal axis; the tabs stay on one line at their width', async () => {
    const s = scroller('long')
    expect(await style(page, s, 'overflow-x')).toBe('auto')
    const [scrollWidth, clientWidth] = await page.locator(s).evaluate((el) => [el.scrollWidth, el.clientWidth])
    expect(scrollWidth).toBeGreaterThan(clientWidth)
    const first = await box(page, tabAt('long', 0))
    for (let i = 0; i < 8; i++) {
      const t = await box(page, tabAt('long', i))
      expect(t.y).toBe(first.y)
      // The tab does not become smaller: it is its label and its padding wide.
      const l = await box(page, `${tabAt('long', i)} >> [data-part="label"]`)
      expect(t.width).toBeCloseTo(l.width + 4, 0)
    }
    // The line goes below all of the tabs.
    const last = await box(page, tabAt('long', 7))
    const lineEnd = await page.locator(list('long')).evaluate((el) => el.getBoundingClientRect().left + el.scrollWidth)
    expect(lineEnd).toBeGreaterThanOrEqual(last.x + last.width)
  })

  it('tabs/direction: in right-to-left, the scroll of a long list starts at the right edge', async () => {
    const s = await box(page, scroller('long-rtl'))
    const first = await box(page, tabAt('long-rtl', 0))
    expect(s.x + s.width - (first.x + first.width)).toBeCloseTo(4, 0)
    expect(await page.locator(scroller('long-rtl')).evaluate((el) => el.scrollLeft)).toBe(0)
    expect(await page.locator(scroller('long-rtl')).evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
  })

  it('tabs/overflow-focus: the focus on a tab past the edge scrolls the list until all of the tab and its ring show', async () => {
    await page.locator('#long').scrollIntoViewIfNeeded()
    await page.locator(tabAt('long', 6)).focus()
    const s = await box(page, scroller('long'))
    const t = await box(page, tabAt('long', 6))
    expect(t.x - 4).toBeGreaterThanOrEqual(s.x - 0.5)
    expect(t.x + t.width + 4).toBeLessThanOrEqual(s.x + s.width + 0.5)
    await page.locator(scroller('long')).evaluate((el) => (el.scrollLeft = 0))
  })

  it('tabs/overflow-focus: at a change of the selection, the scroll of the component shows all of the tab, at each side', async () => {
    for (const c of ['long', 'long-rtl']) {
      for (const i of [7, 0, 5, 1]) {
        await reveal(c, i)
        const s = await box(page, scroller(c))
        const t = await box(page, tabAt(c, i))
        expect(t.x).toBeGreaterThanOrEqual(s.x)
        expect(t.x + t.width).toBeLessThanOrEqual(s.x + s.width)
        // The ring shows too. Chrome rounds the end of the scroll range down to a full pixel: thus at the end of a
        // list with a width that is not a full pixel, less than 1 px of the outer edge of the ring can stay behind it.
        expect(t.x - 4).toBeGreaterThan(s.x - 1)
        expect(t.x + t.width + 4).toBeLessThan(s.x + s.width + 1)
      }
      // A tab that shows makes no scroll. The page does not scroll.
      const before = await page.locator(scroller(c)).evaluate((el) => el.scrollLeft)
      const pageY = await page.evaluate(() => window.scrollY)
      await reveal(c, 1)
      expect(await page.locator(scroller(c)).evaluate((el) => el.scrollLeft)).toBe(before)
      expect(await page.evaluate(() => window.scrollY)).toBe(pageY)
      await page.locator(scroller(c)).evaluate((el) => (el.scrollLeft = 0))
    }
  })

  it('tabs/direction: in right-to-left, the first tab is at the right; the count is at the left of its label', async () => {
    const first = await box(page, tabAt('rtl', 0))
    const second = await box(page, tabAt('rtl', 1))
    const l = await box(page, list('rtl'))
    expect(first.x).toBeGreaterThan(second.x)
    expect(l.x + l.width - (first.x + first.width)).toBeCloseTo(4, 0)
    const c = await box(page, count('rtl', 'Posts'))
    const lb = await box(page, label('rtl', 'Posts'))
    expect(lb.x - (c.x + c.width)).toBeCloseTo(6, 0)
    // The digits of the locale go from left to right.
    expect(await page.locator(count('rtl', 'Posts')).textContent()).toBe('٥٨')
    expect(await style(page, count('rtl', 'Posts'), 'direction')).toBe('ltr')
    // The indicator is on the selected tab. For the next tab, it moves to the left.
    const i = await box(page, indicator('rtl'))
    expect(i.x).toBeCloseTo(second.x, 0)
    expect(i.width).toBeCloseTo(second.width, 0)
    await moveTo('rtl', 2)
    await page.waitForTimeout(400)
    const third = await box(page, tabAt('rtl', 2))
    const moved = await box(page, indicator('rtl'))
    expect(moved.x).toBeLessThan(i.x)
    expect(moved.x).toBeCloseTo(third.x, 0)
  })

  it('tabs/motion: the indicator moves and changes its width with spring-control in 248 ms; the label color in 150 ms', async () => {
    expect(await style(page, indicator('move'), 'transition-property')).toBe('translate, width')
    expect(await style(page, indicator('move'), 'transition-duration')).toBe('0.248s')
    expect(await style(page, indicator('move'), 'transition-timing-function')).toMatch(/^linear\(0 0%, .*, 1 100%\)$/)
    expect(await style(page, tabAt('move', 0), 'transition-property')).toBe('color')
    expect(await style(page, tabAt('move', 0), 'transition-duration')).toBe('0.15s')
    await moveTo('move', 0)
    expect(await page.locator(indicator('move')).evaluate((el) => el.getAnimations().length)).toBe(2)
    await page.waitForTimeout(400)
    const i = await box(page, indicator('move'))
    const t = await box(page, tabAt('move', 0))
    expect(i.x).toBeCloseTo(t.x, 0)
    expect(i.width).toBeCloseTo(t.width, 0)
  })

  it('tabs/motion: where no spring applies, the indicator moves in 280 ms with ease-out', async () => {
    // Chrome has the linear() function. The test reads the rule for a browser with no linear() function.
    const rules = await page.evaluate(() =>
      [...document.styleSheets]
        .flatMap((sheet) => [...sheet.cssRules].flatMap((r) => (r instanceof CSSLayerBlockRule ? [...r.cssRules] : [r])))
        .filter((r): r is CSSSupportsRule => r instanceof CSSSupportsRule && r.conditionText.includes('not') && r.conditionText.includes('linear'))
        .map((r) => r.cssText),
    )
    expect(rules.join('\n')).toContain('transition-duration: var(--mono-duration-slide)')
    expect(rules.join('\n')).toContain('transition-timing-function: var(--mono-easing-out)')
  })

  it('tabs/motion-keyboard: after a key or a remote, the indicator moves with spring-quick in 186 ms', async () => {
    // The static page has no React events: the test sets the attribute that a key sets (the jsdom test covers the key).
    await page.evaluate(() => document.querySelector('#move [data-mono="tabs"]')?.setAttribute('data-input', 'keyboard'))
    expect(await style(page, indicator('move'), 'transition-duration')).toBe('0.186s')
    expect(await style(page, indicator('move'), 'transition-timing-function')).toMatch(/^linear\(0 0%, .*, 1 100%\)$/)
    await page.evaluate(() => document.querySelector('#move [data-mono="tabs"]')?.setAttribute('data-input', 'pointer'))
  })

  it('tabs/reduced-motion: the indicator goes to the tab with no movement and no scale; the colors and the cross-fade stay', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await style(page, indicator('move'), 'transition-property')).toBe('none')
    expect(await style(page, indicator('move'), 'scale')).toBe('none')
    expect(await style(page, tabAt('move', 0), 'transition-duration')).toBe('0.15s')
    expect(await style(page, panel('move'), 'transition-property')).toBe('opacity')
    expect(await style(page, panel('move'), 'transition-duration')).toBe('0.15s')
    await moveTo('move', 1)
    expect(await page.locator(indicator('move')).evaluate((el) => el.getAnimations().length)).toBe(0)
    const i = await box(page, indicator('move'))
    const t = await box(page, tabAt('move', 1))
    expect(i.x).toBeCloseTo(t.x, 0)
    expect(i.width).toBeCloseTo(t.width, 0)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    // data-motion="reduced" on an ancestor stops the motion as the system option does.
    expect(await style(page, indicator('reduced'), 'transition-property')).toBe('none')
    expect(await style(page, tabAt('reduced', 0), 'transition-property')).toBe('color')
  })

  it('tabs/panel-motion: the panel does not slide; it changes with a cross-fade of 150 ms', async () => {
    expect(await style(page, panel('move'), 'transition-property')).toBe('opacity')
    expect(await style(page, panel('move'), 'transition-duration')).toBe('0.15s')
    expect(await style(page, panel('move'), 'translate')).toBe('none')
    expect(await style(page, panel('move'), 'transform')).toBe('none')
    // Base UI sets data-starting-style on the next panel and data-ending-style on the panel that goes out.
    await page.evaluate(() => document.querySelector('#move [role="tabpanel"]')?.setAttribute('data-ending-style', ''))
    expect(await page.locator(panel('move')).evaluate((el) => el.getAnimations().length)).toBe(1)
    await page.waitForTimeout(250)
    expect(await style(page, panel('move'), 'opacity')).toBe('0')
    await page.evaluate(() => document.querySelector('#move [role="tabpanel"]')?.removeAttribute('data-ending-style'))
  })

  it('tabs/tv: on a TV the indicator is 4 px high; tabs/tv-label: the label is 24 px, with a line height of 32 px, weight 500', async () => {
    const i = await box(page, indicator('tv'))
    const t = await box(page, tab('tv', 'Posts'))
    const l = await box(page, list('tv'))
    expect(i.height).toBe(4)
    expect(i.y + i.height).toBe(l.y + l.height)
    expect(i.x).toBeCloseTo(t.x, 0)
    expect(i.width).toBeCloseTo(t.width, 0)
    for (const name of ['Products', 'Posts']) {
      expect(await style(page, tab('tv', name), 'font-size')).toBe('24px')
      expect(await style(page, tab('tv', name), 'line-height')).toBe('32px')
      expect(await style(page, tab('tv', name), 'font-weight')).toBe('500')
    }
  })

  it('tabs/foldable: a change of the width keeps the selected tab and the scroll position', async () => {
    const s = scroller('fold')
    await page.locator(s).evaluate((el) => (el.scrollLeft = 60))
    const size = page.viewportSize() ?? { width: 1280, height: 720 }
    await page.setViewportSize({ width: 1000, height: size.height })
    expect(await page.locator(s).evaluate((el) => el.scrollLeft)).toBe(60)
    expect(await page.locator(tabAt('fold', 3)).getAttribute('aria-selected')).toBe('true')
    await page.setViewportSize(size)
    expect(await page.locator(s).evaluate((el) => el.scrollLeft)).toBe(60)
  })
})
