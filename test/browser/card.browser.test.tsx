// @vitest-environment node
// The browser test of the Card: the real CSS in a real Chrome. It measures the clauses that jsdom cannot compute: the
// surface and the ring in each theme, the radius of each density, the padding, the gaps, the target of the full card,
// the nested controls, the focus ring, the hover, the press, the skeleton, the direction, and the motion. Each test
// name starts with the id of a clause of ir/contracts/card.json.
import type { Browser, BrowserContext, Page } from 'playwright-core'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Card } from '@monorithm/react/components/card/card'
import { CardBody } from '@monorithm/react/components/card/card.body'
import { CardChart } from '@monorithm/react/components/card/card.chart'
import { CardFooter } from '@monorithm/react/components/card/card.footer'
import { CardHeader } from '@monorithm/react/components/card/card.header'
import { CardMedia } from '@monorithm/react/components/card/card.media'
import { CardStat } from '@monorithm/react/components/card/card.stat'
import { Button } from '@monorithm/react/components/button/button'
import { IconButton } from '@monorithm/react/components/icon-button/icon-button'
import { box, cell, openPage, style } from './harness'

let browser: Browser
let page: Page
/** A context with touch and no hover: the media of a phone. */
let phoneContext: BrowserContext
let phone: Page

const html = (node: ReactNode) => renderToStaticMarkup(<>{node}</>)
const Dot = () => (
  <svg viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="2" />
  </svg>
)
/** A photo of 300 × 150 px: an empty GIF with the size attributes. */
const photo = <img alt="A blue scarf" width={300} height={150} src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" />

const basic = (
  <Card className="basic">
    <CardHeader
      level={3}
      title="Orders"
      action={
        <>
          <IconButton className="edit" label="Edit" icon={<Dot />} />
          <IconButton className="share" label="Share" icon={<Dot />} />
        </>
      }
    />
    <CardBody>Twelve orders wait for the shipment.</CardBody>
    <CardFooter>
      <Button className="all">View all</Button>
    </CardFooter>
  </Card>
)
const stat = (
  <Card variant="stat" className="stat">
    <CardStat level={3} label="Total sales" value="1,240.00" change="+8%" period="compared to the last 30 days" />
  </Card>
)
const content = (
  <Card variant="content" href="#product-opened" className="content">
    <CardMedia counter="Photo 1 of 4" badge="In stock">
      {photo}
    </CardMedia>
    <CardHeader level={3} title="Kente scarf" action={<IconButton className="save" label="Save" icon={<Dot />} />} />
    <CardBody>Northside Crafts · 120.00</CardBody>
  </Card>
)
/** An interactive card with a nested control. The center of the card is on the body, not on a control. */
const link = (name: string, extra?: ReactNode) => (
  <Card href={`#${name}-opened`} className="link">
    <CardHeader level={3} title={`Order ${name}`} action={<IconButton className="more" label="More options" icon={<Dot />} />} />
    <CardBody>Two items for the shipment to the store, with the receipt.</CardBody>
    {extra}
  </Card>
)
const chart = (
  <Card variant="chart" className="chart">
    <CardHeader
      level={3}
      title="Revenue"
      info={<IconButton className="info" size="sm" label="About the revenue" icon={<Dot />} />}
      legend={<span className="legend">This year</span>}
    />
    <CardChart alternative="January 120, February 140">
      <div className="plot" style={{ height: 80 }} />
    </CardChart>
  </Card>
)

beforeAll(async () => {
  const body = [
    // The first cell has the first focusable element: the focus test presses Tab one time.
    cell('focus', 'data-density="pointer"', html(link('first'))),
    ...(['pointer', 'touch'] as const).map((d) => cell(`density-${d}`, `data-density="${d}"`, html(<>{basic}{stat}{content}</>))),
    ...(['dark', 'light'] as const).map((t) => cell(`theme-${t}`, `data-theme="${t}" data-density="pointer"`, html(<>{basic}{link(t)}</>))),
    cell(
      'large',
      'data-density="pointer"',
      html(
        <Card size="lg">
          <CardBody>Large</CardBody>
        </Card>,
      ),
    ),
    ...(['ltr', 'rtl'] as const).map((dir) => cell(`dir-${dir}`, `data-density="pointer" dir="${dir}"`, html(<>{content}{basic}</>))),
    cell(
      'disabled',
      'data-density="pointer"',
      html(
        <Card href="#disabled-opened" disabled disabledReason="The order is archived">
          <CardHeader level={3} title="Order 7" />
          <CardBody>Archived</CardBody>
        </Card>,
      ),
    ),
    cell(
      'loading',
      'data-density="pointer"',
      html(
        <>
          {[false, true].map((loading) => (
            <Card key={String(loading)} href="#loading-opened" loading={loading} className={loading ? 'busy' : 'loaded'}>
              <CardHeader level={3} title="Order 9" action={<IconButton label="More" icon={<Dot />} />} />
              <CardBody>Three items</CardBody>
            </Card>
          ))}
        </>,
      ),
    ),
    cell('chart', 'data-density="pointer"', html(chart)),
    // card/inner-radius: a card radius of 24 px gives an inner radius of 24 - 16 = 8 px.
    cell('inner', 'data-density="pointer" style="--mono-radius-lg:24px"', html(chart)),
    cell(
      'target-touch',
      'data-density="touch"',
      html(
        <Card href="#touch-opened">
          <CardHeader level={3} title="Order 3" action={<IconButton className="small" size="sm" label="Share" icon={<Dot />} />} />
          <CardBody>One item</CardBody>
        </Card>,
      ),
    ),
    cell(
      'reduced',
      'data-density="pointer" data-motion="reduced"',
      html(
        <>
          {link('reduced')}
          <Card loading className="busy">
            <CardHeader level={3} title="Order 10" />
          </Card>
        </>,
      ),
    ),
  ].join('')
  ;({ browser, page } = await openPage(body))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  phoneContext = await browser.newContext({ hasTouch: true })
  phone = await phoneContext.newPage()
  await phone.setContent(await page.content())
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

/** Scrolls the element into view, puts the pointer down at its center, and waits for the end of the transitions. */
async function pressAt(p: Page, selector: string): Promise<{ x: number; y: number; width: number; height: number }> {
  await p.locator(selector).first().scrollIntoViewIfNeeded()
  const rest = await box(p, selector)
  await p.mouse.move(rest.x + rest.width / 2, rest.y + rest.height / 2)
  await p.mouse.down()
  await p.waitForTimeout(250)
  return rest
}

/** Moves the pointer away and releases it: no click, thus no link opens. */
async function release(p: Page) {
  await p.mouse.move(0, 0)
  await p.mouse.up()
  await p.waitForTimeout(250)
}

/** The element at a point: its closest link or button, by its label or its text. */
const hitAt = (p: Page, x: number, y: number) =>
  p.evaluate(([px, py]) => {
    const el = document.elementFromPoint(px as number, py as number)?.closest('a, button')
    return el ? (el.getAttribute('aria-label') ?? el.textContent) : null
  }, [x, y])

/** Scrolls the element into view and gives its box in the viewport. */
async function shown(p: Page, selector: string) {
  await p.locator(selector).first().scrollIntoViewIfNeeded()
  return box(p, selector)
}

/** Moves the pointer to the center of the element. A hover by Playwright waits for the element, and the ::after of the
 * target covers the parts of an interactive card. */
async function pointAt(p: Page, selector: string) {
  const b = await shown(p, selector)
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await p.waitForTimeout(250)
}

const ring = (p: Page, selector: string) => style(p, selector, 'border-top-color', '::after')

describe('Card in Chrome', () => {
  // The first test: a press in a later test moves the focus.
  it('card/focus: Tab shows the ring on the full card: 2 px in the ring color, 2 px from the edge, with the card radius', async () => {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.textContent)).toBe('Order first')
    const s = '#focus [data-mono="card"]'
    expect(await style(page, s, 'outline-style')).toBe('solid')
    expect(await style(page, s, 'outline-width')).toBe('2px')
    expect(await style(page, s, 'outline-offset')).toBe('2px')
    expect(await style(page, s, 'outline-color')).toBe('rgb(92, 163, 255)')
    expect(await style(page, s, 'border-top-left-radius')).toBe('12px')
    expect(await style(page, '#focus [data-part="target"]', 'outline-style')).toBe('none')
  })

  it('card/nested-control: the next Tab goes to the control in the card, after the focus stop of the card', async () => {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('More options')
    // The ring of the card shows only for the focus of the card.
    expect(await style(page, '#focus [data-mono="card"]', 'outline-style')).toBe('none')
  })

  it('card/surface: the surface fill and a ring of 1 px in the line color, in the two themes', async () => {
    for (const [t, fill, line] of [
      ['dark', 'rgb(20, 20, 20)', 'rgb(46, 46, 46)'],
      ['light', 'rgb(255, 255, 255)', 'rgb(224, 224, 224)'],
    ] as const) {
      for (const s of [`#theme-${t} .basic`, `#theme-${t} .link`]) {
        expect(await style(page, s, 'background-color')).toBe(fill)
        expect(await style(page, s, 'border-top-width', '::after')).toBe('1px')
        expect(await style(page, s, 'border-top-style', '::after')).toBe('solid')
        expect(await ring(page, s)).toBe(line)
      }
    }
  })

  it('card/surface: the ring is on the inner side of the edge and does not change the size of the card', async () => {
    const c = await box(page, '#theme-dark .basic')
    const r = await page.locator('#theme-dark .basic').evaluate((el) => {
      const a = getComputedStyle(el, '::after')
      return [a.position, a.top, a.left, a.right, a.bottom, getComputedStyle(el).borderTopWidth]
    })
    expect(r).toEqual(['absolute', '0px', '0px', '0px', '0px', '0px'])
    const h = await box(page, '#theme-dark .basic [data-part="header"]')
    expect([h.x - c.x, h.y - c.y, c.width - h.width]).toEqual([16, 16, 32])
    expect(c.width).toBe(320 - 16)
  })

  it('card/no-shadow: a card has no shadow, at rest, at hover, and at the press', async () => {
    for (const s of ['#theme-dark .basic', '#theme-light .basic', '#density-pointer .stat', '#density-pointer .content', '#chart .chart']) {
      expect(await style(page, s, 'box-shadow')).toBe('none')
    }
    const s = '#theme-dark .link'
    await pointAt(page, `${s} [data-part="body"]`)
    expect(await style(page, s, 'box-shadow')).toBe('none')
    await pressAt(page, s)
    expect(await style(page, s, 'box-shadow')).toBe('none')
    await release(page)
  })

  it('card/density: the radius is 12 px for pointer and 14 px for touch; the padding and the gaps do not change', async () => {
    for (const [d, radius] of [
      ['pointer', '12px'],
      ['touch', '14px'],
    ] as const) {
      const s = `#density-${d} .basic`
      expect(await style(page, s, 'border-top-left-radius')).toBe(radius)
      expect(await style(page, s, 'border-bottom-right-radius')).toBe(radius)
      expect(await style(page, s, 'border-top-left-radius', '::after')).toBe(radius)
      for (const side of ['top', 'right', 'bottom', 'left']) expect(await style(page, s, `padding-${side}`)).toBe('16px')
      expect(await style(page, s, 'row-gap')).toBe('24px')
      expect(await style(page, `${s} [data-part="header"]`, 'column-gap')).toBe('12px')
      expect(await style(page, `${s} [data-part="actions"]`, 'column-gap')).toBe('8px')
    }
  })

  it('card/padding: 16 px on each side; a large card has 20 px', async () => {
    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(await style(page, '#theme-dark .link', `padding-${side}`)).toBe('16px')
      expect(await style(page, '#large [data-mono="card"]', `padding-${side}`)).toBe('20px')
    }
    const c = await box(page, '#large [data-mono="card"]')
    const b = await box(page, '#large [data-part="body"]')
    expect([b.x - c.x, b.y - c.y]).toEqual([20, 20])
  })

  it('card/inner-radius: the photo at the top edge has the card radius at the top corners', async () => {
    for (const [d, radius] of [
      ['pointer', '12px'],
      ['touch', '14px'],
    ] as const) {
      const s = `#density-${d} .content [data-part="media"]`
      expect(await style(page, s, 'border-top-left-radius')).toBe(radius)
      expect(await style(page, s, 'border-top-right-radius')).toBe(radius)
      expect(await style(page, s, 'border-bottom-left-radius')).toBe('0px')
      const c = await box(page, `#density-${d} .content`)
      const m = await box(page, s)
      expect([m.x, m.y, m.width]).toEqual([c.x, c.y, c.width])
    }
  })

  it('card/inner-radius: a part has the card radius minus the padding, and not less than 0', async () => {
    // 24 - 16 = 8 px. With the radius of the language (12 - 16), the inner radius is 0.
    expect(await style(page, '#inner [data-part="chart"]', 'border-top-left-radius')).toBe('8px')
    expect(await style(page, '#chart [data-part="chart"]', 'border-top-left-radius')).toBe('0px')
  })

  it('card/sections: the gap between two sections is 24 px', async () => {
    const h = await box(page, '#density-pointer .basic [data-part="header"]')
    const b = await box(page, '#density-pointer .basic [data-part="body"]')
    const f = await box(page, '#density-pointer .basic [data-part="footer"]')
    expect(b.y - (h.y + h.height)).toBe(24)
    expect(f.y - (b.y + b.height)).toBe(24)
    const m = await box(page, '#density-pointer .content [data-part="media"]')
    const t = await box(page, '#density-pointer .content [data-part="header"]')
    expect(t.y - (m.y + m.height)).toBe(24)
  })

  it('card/header: the title at the start side, the actions at the end side, on one line, with the gaps', async () => {
    const c = await box(page, '#dir-ltr .basic')
    const t = await box(page, '#dir-ltr .basic [data-part="title"]')
    const e = await box(page, '#dir-ltr .basic .edit')
    const s = await box(page, '#dir-ltr .basic .share')
    expect(t.x - c.x).toBe(16)
    expect(c.x + c.width - (s.x + s.width)).toBe(16)
    expect(e.x - (t.x + t.width)).toBeGreaterThanOrEqual(12)
    expect(s.x - (e.x + e.width)).toBe(8)
    expect(Math.abs(t.y + t.height / 2 - (e.y + e.height / 2))).toBeLessThan(1)
  })

  it('card/title: title-3 in the strong text color, with the strong weight: 16 px for pointer, 17 px for touch', async () => {
    for (const [d, size] of [
      ['pointer', '16px'],
      ['touch', '17px'],
    ] as const) {
      const s = `#density-${d} .basic [data-part="title"]`
      expect(await style(page, s, 'font-size')).toBe(size)
      expect(await style(page, s, 'font-weight')).toBe('500')
      expect(await style(page, s, 'color')).toBe('rgb(245, 245, 245)')
    }
    expect(await style(page, '#theme-light .basic [data-part="title"]', 'color')).toBe('rgb(10, 10, 10)')
    // The link of an interactive card has the look of the title.
    const target = '#theme-dark .link [data-part="target"]'
    expect(await style(page, target, 'font-size')).toBe('16px')
    expect(await style(page, target, 'color')).toBe('rgb(245, 245, 245)')
    expect(await style(page, target, 'text-decoration-line')).toBe('none')
  })

  it('card/one-target: a point on the body, on the photo, or on the empty area presses the target of the card', async () => {
    const m = await shown(page, '#density-pointer .content [data-part="media"]')
    expect(await hitAt(page, m.x + m.width / 2, m.y + m.height / 2)).toBe('Kente scarf')
    const c = await shown(page, '#theme-dark .link')
    const b = await box(page, '#theme-dark .link [data-part="body"]')
    expect(await hitAt(page, b.x + b.width / 2, b.y + b.height / 2)).toBe('Order dark')
    expect(await hitAt(page, c.x + 4, c.y + c.height - 4)).toBe('Order dark')
    // A click on the body opens the page of the link.
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
    expect(await page.evaluate(() => location.hash)).toBe('#dark-opened')
  })

  it('card/nested-control: a control in the card is a separate target; a press on it does not open the page', async () => {
    await page.evaluate(() => {
      location.hash = ''
    })
    const m = await shown(page, '#theme-light .link .more')
    expect(await hitAt(page, m.x + m.width / 2, m.y + m.height / 2)).toBe('More options')
    await page.mouse.click(m.x + m.width / 2, m.y + m.height / 2)
    expect(await page.evaluate(() => location.hash)).toBe('')
    const f = await shown(page, '#density-pointer .basic .all')
    expect(await hitAt(page, f.x + f.width / 2, f.y + f.height / 2)).toBe('View all')
  })

  it('card/nested-target: a control in the card has the minimum target of the density; a point past its edge presses it', async () => {
    expect(await style(page, '#target-touch .small', 'height', '::after')).toBe('44px')
    expect(await style(page, '#target-touch .small', 'width', '::after')).toBe('44px')
    // For pointer, the box of the icon button (32 px) is more than the minimum target (24 px).
    const e = await box(page, '#density-pointer .basic .edit')
    expect([e.width, e.height]).toEqual([32, 32])
    const s = await shown(page, '#target-touch .small')
    expect(s.height).toBe(36)
    expect(await hitAt(page, s.x + s.width / 2, s.y - 3)).toBe('Share')
  })

  it('card/hover: at hover, the ring of an interactive card changes to the strong line color in 150 ms', async () => {
    const s = '#theme-dark .link'
    expect(await style(page, s, 'transition-duration', '::after')).toBe('0.15s')
    expect(await style(page, s, 'transition-property', '::after')).toBe('border-color')
    await pointAt(page, `${s} [data-part="body"]`)
    expect(await ring(page, s)).toBe('rgb(72, 72, 72)')
    // The hover of a nested control is not the hover of the card.
    await pointAt(page, `${s} .more`)
    expect(await ring(page, s)).toBe('rgb(46, 46, 46)')
    await page.mouse.move(0, 0)
  })

  it('card/hover: a device with no hover shows no hover state', async () => {
    expect(await phone.evaluate(() => matchMedia('(hover: none)').matches)).toBe(true)
    const s = '#theme-dark .link'
    await pointAt(phone, `${s} [data-part="body"]`)
    expect(await ring(phone, s)).toBe('rgb(46, 46, 46)')
  })

  it('card/static: a static card has no focus stop, no hover state, and no pressed state; its title is a heading', async () => {
    const s = '#theme-dark .basic'
    expect(await page.locator(`${s} [data-part="target"]`).count()).toBe(0)
    expect(await page.locator(`${s} h3[data-part="title"]`).count()).toBe(1)
    await pointAt(page, `${s} [data-part="body"]`)
    expect(await ring(page, s)).toBe('rgb(46, 46, 46)')
    const b = await box(page, `${s} [data-part="body"]`)
    const rest = await box(page, s)
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(250)
    expect((await box(page, s)).width).toBe(rest.width)
    expect(await ring(page, s)).toBe('rgb(46, 46, 46)')
    await release(page)
  })

  it('card/press: at pointer down, the card scales to 0.97 in 100 ms, and its ring changes to the strong line color', async () => {
    const s = '#theme-dark .link'
    expect(await style(page, s, 'transition-property')).toBe('scale')
    expect(await style(page, s, 'transition-duration')).toBe('0.1s')
    const rest = await pressAt(page, s)
    expect((await box(page, s)).width / rest.width).toBeCloseTo(0.97, 3)
    expect(await ring(page, s)).toBe('rgb(72, 72, 72)')
    await release(page)
    expect((await box(page, s)).width).toBe(rest.width)
  })

  it('card/press: on a phone, the press shows the scale and the strong ring', async () => {
    const s = '#theme-dark .link'
    const rest = await pressAt(phone, s)
    expect((await box(phone, s)).width / rest.width).toBeCloseTo(0.97, 3)
    expect(await ring(phone, s)).toBe('rgb(72, 72, 72)')
    await release(phone)
  })

  it('card/press: a press on a nested control does not scale the card', async () => {
    const s = '#theme-dark .link'
    const rest = await shown(page, s)
    const m = await box(page, `${s} .more`)
    await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(250)
    expect((await box(page, s)).width).toBe(rest.width)
    await release(page)
  })

  it('card/focus: a pointer press shows no ring', async () => {
    const s = '#theme-light .link'
    await pressAt(page, s)
    await page.mouse.up()
    expect(await page.evaluate(() => document.activeElement?.textContent)).toBe('Order light')
    expect(await style(page, s, 'outline-style')).toBe('none')
  })

  it('card/disabled: a disabled card has the opacity 0.4; a hover or a press does not change it', async () => {
    const s = '#disabled [data-mono="card"]'
    expect(await style(page, s, 'opacity')).toBe('0.4')
    expect(await page.locator(`${s} [data-part="target"]`).getAttribute('href')).toBeNull()
    expect(await style(page, `${s} [data-part="target"]`, 'cursor')).toBe('not-allowed')
    const rest = await pressAt(page, s)
    expect((await box(page, s)).width).toBe(rest.width)
    expect(await ring(page, s)).toBe('rgb(46, 46, 46)')
    await release(page)
  })

  it('card/loading: the skeleton has the layout of the card, and the size of the card does not change', async () => {
    const loaded = await box(page, '#loading .loaded')
    const busy = await box(page, '#loading .busy')
    expect([busy.width, busy.height]).toEqual([loaded.width, loaded.height])
    for (const part of ['title', 'actions', 'body']) {
      const a = await box(page, `#loading .loaded [data-part="${part}"]`)
      const b = await box(page, `#loading .busy [data-part="${part}"]`)
      expect([b.x - busy.x, b.y - busy.y, b.width, b.height]).toEqual([a.x - loaded.x, a.y - loaded.y, a.width, a.height])
      const s = `#loading .busy [data-part="${part}"]`
      expect(await style(page, s, 'visibility')).toBe('hidden')
      expect(await style(page, s, 'visibility', '::before')).toBe('visible')
      expect(await style(page, s, 'background-color', '::before')).toBe('rgb(37, 37, 37)')
      expect(await style(page, s, 'border-top-left-radius')).toBe('6px')
    }
    // The link does not show, thus it is not a focus stop.
    expect(await page.locator('#loading .busy [data-part="target"]').isVisible()).toBe(false)
  })

  it('card/loading: the shimmer moves across each shape in 1,500 ms with the linear curve', async () => {
    const s = '#loading .busy [data-part="title"]'
    expect(await style(page, s, 'animation-name', '::after')).toBe('mono-card-shimmer')
    expect(await style(page, s, 'animation-duration', '::after')).toBe('1.5s')
    expect(await style(page, s, 'animation-timing-function', '::after')).toBe('cubic-bezier(0, 0, 1, 1)')
    expect(await style(page, s, 'background-image', '::after')).toContain('rgba(255, 255, 255, 0.05)')
    // The keyframes are in the document, and the band moves: the motion changes only the transform.
    expect(await page.evaluate(() => document.getAnimations().some((a) => (a as CSSAnimation).animationName === 'mono-card-shimmer'))).toBe(true)
    const first = await style(page, s, 'translate', '::after')
    await page.waitForTimeout(300)
    expect(await style(page, s, 'translate', '::after')).not.toBe(first)
  })

  it('card/direction: in right-to-left, the title is at the right, the actions at the left, and the counter at the top right', async () => {
    const c = await box(page, '#dir-rtl .basic')
    const t = await box(page, '#dir-rtl .basic [data-part="title"]')
    const a = await box(page, '#dir-rtl .basic [data-part="actions"]')
    expect(c.x + c.width - (t.x + t.width)).toBe(16)
    expect(a.x - c.x).toBe(16)
    for (const [dir, side] of [
      ['ltr', 'left'],
      ['rtl', 'right'],
    ] as const) {
      const m = await box(page, `#dir-${dir} .content [data-part="media"]`)
      const n = await box(page, `#dir-${dir} .content [data-part="counter"]`)
      expect(n.y - m.y).toBe(8)
      expect(side === 'left' ? n.x - m.x : m.x + m.width - (n.x + n.width)).toBe(8)
    }
  })

  it('card/motion: with reduced motion, the press has no scale, the skeleton has no shimmer, and the ring change stays', async () => {
    const s = '#reduced .link'
    const rest = await pressAt(page, s)
    expect((await box(page, s)).width).toBe(rest.width)
    expect(await ring(page, s)).toBe('rgb(72, 72, 72)')
    await release(page)
    expect(await style(page, '#reduced .busy [data-part="title"]', 'animation-name', '::after')).toBe('none')
  })

  it('card/motion: with the reduced motion of the system, the press has no scale and the skeleton has no shimmer', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const s = '#theme-dark .link'
    const rest = await pressAt(page, s)
    expect((await box(page, s)).width).toBe(rest.width)
    expect(await ring(page, s)).toBe('rgb(72, 72, 72)')
    await release(page)
    expect(await style(page, '#loading .busy [data-part="title"]', 'animation-name', '::after')).toBe('none')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  })

  it('card/stat: the label is above the value, in the small size and the secondary text color', async () => {
    for (const [d, size] of [
      ['pointer', '13px'],
      ['touch', '14px'],
    ] as const) {
      const l = await box(page, `#density-${d} .stat [data-part="title"]`)
      const v = await box(page, `#density-${d} .stat [data-part="value"]`)
      expect(v.y).toBeGreaterThanOrEqual(l.y + l.height)
      expect(await style(page, `#density-${d} .stat [data-part="title"]`, 'font-size')).toBe(size)
      expect(await style(page, `#density-${d} .stat [data-part="title"]`, 'color')).toBe('rgb(176, 176, 176)')
    }
  })

  it('card/stat-value: title-2 with tabular figures and the strong weight: 20 px for pointer, 22 px for touch', async () => {
    for (const [d, size] of [
      ['pointer', '20px'],
      ['touch', '22px'],
    ] as const) {
      const s = `#density-${d} .stat [data-part="value"]`
      expect(await style(page, s, 'font-size')).toBe(size)
      expect(await style(page, s, 'font-variant-numeric')).toBe('tabular-nums')
      expect(await style(page, s, 'font-weight')).toBe('500')
      expect(await style(page, s, 'color')).toBe('rgb(245, 245, 245)')
    }
  })

  it('card/stat-change: the change shows with its period; the period has the muted text color', async () => {
    expect(await page.locator('#density-pointer .stat [data-part="change"]').textContent()).toBe('+8% compared to the last 30 days')
    expect(await style(page, '#density-pointer .stat [data-part="period"]', 'color')).toBe('rgb(158, 158, 158)')
  })

  it('card/chart: the chart title, the info icon, and the legend are on one line, above the chart', async () => {
    const t = await box(page, '#chart [data-part="title"]')
    const i = await box(page, '#chart .info')
    const l = await box(page, '#chart .legend')
    const p = await box(page, '#chart .plot')
    const mid = (b: { y: number; height: number }) => b.y + b.height / 2
    expect(Math.abs(mid(t) - mid(i))).toBeLessThan(1)
    expect(Math.abs(mid(t) - mid(l))).toBeLessThan(1)
    expect(i.x).toBeGreaterThan(t.x + t.width)
    expect(l.x).toBeGreaterThan(i.x + i.width)
    expect(p.y).toBeGreaterThan(t.y + t.height)
  })

  it('card/content-counter: the photo counter and the stock badge are text at the top corners of the photo', async () => {
    const m = await box(page, '#dir-ltr .content [data-part="media"]')
    const b = await box(page, '#dir-ltr .content [data-part="badge"]')
    expect(await page.locator('#dir-ltr .content [data-part="counter"]').textContent()).toBe('Photo 1 of 4')
    expect(await page.locator('#dir-ltr .content [data-part="badge"]').textContent()).toBe('In stock')
    expect(m.x + m.width - (b.x + b.width)).toBe(8)
    expect(await style(page, '#dir-ltr .content [data-part="badge"]', 'background-color')).toBe('rgb(20, 20, 20)')
    expect(await style(page, '#dir-ltr .content [data-part="badge"]', 'color')).toBe('rgb(245, 245, 245)')
  })
})
