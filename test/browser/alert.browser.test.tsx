// @vitest-environment node
// The browser test of the Alert and the banner: the real CSS in a real Chrome. It measures the clauses that jsdom cannot
// compute: the type of the densities, the fills and the colors of the themes, the contrast, the shape, the padding, the
// gaps, the direction, the focus ring, the target, the hover, the press, the flow, and the motion. Each test name starts
// with the id of a clause of ir/contracts/alert.json.
import type { Browser, Page } from 'playwright-core'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Alert } from '@monorithm/react/components/alert/alert'
import { box, cell, openPage, style } from './harness'

let browser: Browser
let page: Page

const html = (node: ReactNode) => renderToStaticMarkup(<>{node}</>)
const Offline = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M3 3l18 18" />
  </svg>
)
const tones = ['info', 'success', 'warning', 'danger'] as const
const closable = { onDismiss: () => {}, dismissLabel: 'Close' }
const banner = (className = '') => (
  <Alert variant="banner" tone="warning" className={className} title="You are offline" text="Retry" action={{ label: 'Retry' }} {...closable} />
)
const sizes = (
  <>
    <Alert className="inline" tone="info" title="Next payout" text="On 30 Oct" />
    <Alert className="banner" variant="banner" tone="info" title="Limited account" text="Add an ID" secondLine="Two days left" />
  </>
)
const themes = (
  <>
    {tones.map((t) => (
      <Alert key={t} className={`tone-${t}`} tone={t} title="Payment failed" text="Try a different card" />
    ))}
    <Alert className="tone-neutral" variant="banner" tone="neutral" icon={<Offline />} title="You are offline" text="Changes save later" secondLine="Last save 10:42" />
  </>
)

beforeAll(async () => {
  const body = [
    // The first cell has the first focusable elements: the focus test presses Tab.
    cell('focus', 'data-density="pointer"', html(banner())),
    ...(['pointer', 'touch'] as const).map((d) => cell(`sizes-${d}`, `data-density="${d}"`, html(sizes))),
    ...(['dark', 'light'] as const).map((t) => cell(`theme-${t}`, `data-theme="${t}" data-density="pointer"`, html(themes))),
    ...(['ltr', 'rtl'] as const).map((dir) => cell(`dir-${dir}`, `data-density="pointer" dir="${dir}"`, html(banner()))),
    cell('touch', 'data-density="touch"', html(banner())),
    cell('states', 'data-density="pointer"', html(banner())),
    cell(
      'disabled',
      'data-density="pointer"',
      html(<Alert tone="warning" title="Low stock" text="Add a product first" action={{ label: 'Update', disabled: true }} />),
    ),
    cell(
      'flow',
      'data-density="pointer"',
      html(
        <>
          <Alert variant="banner" tone="warning" title="You are offline" text="Retry" {...closable} />
          <div className="below" style={{ height: 20 }} />
        </>,
      ),
    ),
    cell(
      'phone',
      'data-density="touch"',
      html(<Alert variant="banner" tone="danger" actionBelow title="Payment failed" text="Try a different card" action={{ label: 'Try again' }} {...closable} />),
    ),
    cell('motion', 'data-density="pointer"', '<div class="slot"></div><div class="below" style="height:20px"></div>'),
    cell('reduced', 'data-density="pointer" data-motion="reduced"', '<div class="slot"></div>'),
  ].join('')
  ;({ browser, page } = await openPage(body))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  // The alerts of the page have their entrance (@starting-style) at the load. Wait for the end of it.
  await page.waitForTimeout(300)
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

type Rgba = [number, number, number, number]
const rgba = (color: string): Rgba => {
  const [r = 0, g = 0, b = 0, a = 1] = (color.match(/[\d.]+/g) ?? []).map(Number)
  return [r, g, b, a]
}
/** The color of a translucent fill on an opaque ground. */
const over = ([r, g, b, a]: Rgba, [R, G, B]: Rgba): Rgba => [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a), 1]
const luminance = ([r, g, b]: Rgba) => {
  const lin = (c: number) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
const contrast = (a: Rgba, b: Rgba) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** Scrolls the element into view, puts the pointer down at its center, and waits for the end of the transitions. */
async function pressAt(selector: string): Promise<{ x: number; y: number; width: number; height: number }> {
  await page.locator(selector).first().scrollIntoViewIfNeeded()
  const rest = await box(page, selector)
  await page.mouse.move(rest.x + rest.width / 2, rest.y + rest.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(250)
  return rest
}

interface Transition {
  property: string
  duration: number
  easing: string
}
/** Puts the markup into the slot of a cell, as an alert that shows, and returns the transitions of its root. */
const enter = (cellId: string, markup: string): Promise<Transition[]> =>
  page.evaluate(
    ([id, m]) => {
      const slot = document.querySelector(`#${id} .slot`) as HTMLElement
      slot.innerHTML = m as string
      const root = slot.querySelector('[data-mono="alert"]') as HTMLElement
      return root.getAnimations().map((a) => ({
        property: (a as CSSTransition).transitionProperty,
        duration: Number(a.effect?.getTiming().duration),
        easing: String(a.effect?.getTiming().easing),
      }))
    },
    [cellId, markup] as const,
  )
/** Sets data-ending-style on the root of the alert in the slot (the exit of a banner) and returns its transitions. */
const exit = (cellId: string): Promise<Transition[]> =>
  page.evaluate((id) => {
    const root = document.querySelector(`#${id} .slot [data-mono="alert"]`) as HTMLElement
    for (const a of root.getAnimations()) a.finish()
    root.setAttribute('data-ending-style', '')
    return root.getAnimations().map((a) => ({
      property: (a as CSSTransition).transitionProperty,
      duration: Number(a.effect?.getTiming().duration),
      easing: String(a.effect?.getTiming().easing),
    }))
  }, cellId)

const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)'
const STANDARD = 'cubic-bezier(0.25, 0.1, 0.25, 1)'
const part = (scope: string, name: string) => `${scope} [data-part="${name}"]`

describe('Alert in Chrome', () => {
  it('alert/density and alert/density-values: pointer body 14, small 13, icon 16; touch body 16, small 14, icon 20', async () => {
    for (const [d, body, small, icon] of [
      ['pointer', '14px', '13px', 16],
      ['touch', '16px', '14px', 20],
    ] as const) {
      const inline = `#sizes-${d} .inline`
      const ban = `#sizes-${d} .banner`
      expect(await style(page, part(inline, 'title'), 'font-size')).toBe(body)
      expect(await style(page, part(inline, 'title'), 'font-weight')).toBe('500')
      expect(await style(page, part(inline, 'text'), 'font-size')).toBe(small)
      expect(await style(page, part(ban, 'title'), 'font-size')).toBe(body)
      expect(await style(page, part(ban, 'text'), 'font-size')).toBe(body)
      expect(await style(page, part(ban, 'second-line'), 'font-size')).toBe(small)
      const svg = await box(page, `${part(inline, 'icon')} svg`)
      expect([svg.width, svg.height]).toEqual([icon, icon])
    }
  })

  it('alert/icon-style: the icon aligns with the first line of the title', async () => {
    for (const d of ['pointer', 'touch']) {
      const svg = await box(page, `${part(`#sizes-${d} .inline`, 'icon')} svg`)
      const title = await box(page, part(`#sizes-${d} .inline`, 'title'))
      expect(Math.abs(svg.y + svg.height / 2 - (title.y + title.height / 2))).toBeLessThan(0.5)
    }
  })

  it('alert/shape: an inline alert has the radius of a card (12 px pointer, 14 px touch); a banner has 10 px', async () => {
    expect(await style(page, part('#sizes-pointer .inline', 'container'), 'border-top-left-radius')).toBe('12px')
    expect(await style(page, part('#sizes-touch .inline', 'container'), 'border-top-left-radius')).toBe('14px')
    expect(await style(page, part('#sizes-pointer .banner', 'container'), 'border-top-left-radius')).toBe('10px')
    expect(await style(page, part('#sizes-touch .banner', 'container'), 'border-bottom-right-radius')).toBe('10px')
  })

  it('alert/padding: inline 12 px at the top and the bottom and 16 px at the sides; banner 12 px and 16 px at the start side', async () => {
    const c = await box(page, part('#sizes-pointer .inline', 'container'))
    const m = await box(page, part('#sizes-pointer .inline', 'message'))
    expect([m.x - c.x, c.x + c.width - (m.x + m.width), m.y - c.y, c.y + c.height - (m.y + m.height)]).toEqual([16, 16, 12, 12])
    const bc = await box(page, part('#sizes-pointer .banner', 'container'))
    const bm = await box(page, part('#sizes-pointer .banner', 'message'))
    expect([bm.x - bc.x, bc.x + bc.width - (bm.x + bm.width), bm.y - bc.y, bc.y + bc.height - (bm.y + bm.height)]).toEqual([16, 12, 12, 12])
  })

  it('alert/gaps: 12 px from the icon to the text, 2 px from the title to the text, 4 px from the action to the close button', async () => {
    const icon = await box(page, part('#sizes-pointer .inline', 'icon'))
    const body = await box(page, part('#sizes-pointer .inline', 'body'))
    expect(body.x - (icon.x + icon.width)).toBe(12)
    const title = await box(page, part('#sizes-pointer .inline', 'title'))
    const text = await box(page, part('#sizes-pointer .inline', 'text'))
    expect(text.y - (title.y + title.height)).toBe(2)
    const action = await box(page, part('#dir-ltr', 'action'))
    const close = await box(page, part('#dir-ltr', 'close'))
    expect(close.x - (action.x + action.width)).toBe(4)
  })

  it('alert/fill: the soft fill of the tone in the dark theme; a neutral banner has the selected fill; no ring and no shadow', async () => {
    const fill = (t: string) => style(page, part(`#theme-dark .tone-${t}`, 'container'), 'background-color')
    expect(await fill('info')).toBe('rgba(92, 163, 255, 0.14)')
    expect(await fill('success')).toBe('rgba(3, 169, 126, 0.14)')
    expect(await fill('warning')).toBe('rgba(251, 184, 75, 0.14)')
    expect(await fill('danger')).toBe('rgba(242, 85, 90, 0.14)')
    expect(await fill('neutral')).toBe('rgb(37, 37, 37)')
    for (const t of [...tones, 'neutral']) {
      const c = part(`#theme-dark .tone-${t}`, 'container')
      expect(await style(page, c, 'box-shadow')).toBe('none')
      expect(await style(page, c, 'border-top-width')).toBe('0px')
      expect(await style(page, c, 'outline-style')).toBe('none')
    }
  })

  it('alert/fill: the soft fill of the tone in the light theme', async () => {
    const fill = (t: string) => style(page, part(`#theme-light .tone-${t}`, 'container'), 'background-color')
    expect(await fill('info')).toBe('rgba(31, 111, 224, 0.1)')
    expect(await fill('success')).toBe('rgba(3, 169, 126, 0.12)')
    expect(await fill('warning')).toBe('rgba(229, 163, 59, 0.16)')
    expect(await fill('danger')).toBe('rgba(217, 58, 64, 0.1)')
    expect(await fill('neutral')).toBe('rgb(235, 235, 235)')
  })

  it('alert/icon-style: the icon has the text color of the tone in the two themes', async () => {
    const want = {
      dark: ['rgb(92, 163, 255)', 'rgb(47, 199, 156)', 'rgb(251, 184, 75)', 'rgb(255, 123, 127)', 'rgb(176, 176, 176)'],
      light: ['rgb(26, 98, 204)', 'rgb(8, 118, 88)', 'rgb(138, 90, 0)', 'rgb(196, 47, 53)', 'rgb(82, 82, 82)'],
    }
    for (const theme of ['dark', 'light'] as const) {
      const got = []
      for (const t of [...tones, 'neutral']) got.push(await style(page, `${part(`#theme-${theme} .tone-${t}`, 'icon')} svg`, 'color'))
      expect(got).toEqual(want[theme])
    }
  })

  it('alert/text-color: the title is strong; the inline text and the second line are secondary; the banner text has the text color', async () => {
    for (const [theme, strong, fg2] of [
      ['dark', 'rgb(245, 245, 245)', 'rgb(176, 176, 176)'],
      ['light', 'rgb(10, 10, 10)', 'rgb(82, 82, 82)'],
    ] as const) {
      expect(await style(page, part(`#theme-${theme} .tone-info`, 'title'), 'color')).toBe(strong)
      expect(await style(page, part(`#theme-${theme} .tone-info`, 'text'), 'color')).toBe(fg2)
      expect(await style(page, part(`#theme-${theme} .tone-neutral`, 'second-line'), 'color')).toBe(fg2)
    }
    expect(await style(page, part('#theme-dark .tone-neutral', 'text'), 'color')).toBe('rgb(224, 224, 224)')
    expect(await style(page, part('#theme-light .tone-neutral', 'text'), 'color')).toBe('rgb(30, 30, 30)')
  })

  it('alert/contrast: the icon, the title, and the text have 4.5 : 1 or more on the fill, on the background and on the surface', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const scope = `#theme-${theme}`
      const grounds = await page.locator(scope).evaluate((el) =>
        ['--mono-color-role-bg', '--mono-color-role-surface'].map((p) => getComputedStyle(el).getPropertyValue(p).trim()),
      )
      for (const t of [...tones, 'neutral']) {
        const a = `${scope} .tone-${t}`
        const fill = rgba(await style(page, part(a, 'container'), 'background-color'))
        const parts = [`${part(a, 'icon')} svg`, part(a, 'title'), part(a, 'text')]
        if (t === 'neutral') parts.push(part(a, 'second-line'))
        for (const ground of grounds) {
          // A hex token: the ground is opaque.
          const g = (ground.match(/[0-9a-f]{2}/gi) ?? []).map((h) => parseInt(h, 16))
          const on = over(fill, [g[0] ?? 0, g[1] ?? 0, g[2] ?? 0, 1])
          for (const p of parts) {
            const ratio = contrast(rgba(await style(page, p, 'color')), on)
            expect(ratio, `${theme} ${t} ${p} on ${ground}`).toBeGreaterThanOrEqual(4.5)
          }
        }
      }
    }
  })

  it('alert/direction: in left-to-right, the icon is at the left and the close button at the right', async () => {
    const c = await box(page, part('#dir-ltr', 'container'))
    const icon = await box(page, part('#dir-ltr', 'icon'))
    const close = await box(page, part('#dir-ltr', 'close'))
    expect(icon.x - c.x).toBe(16)
    expect(c.x + c.width - (close.x + close.width)).toBe(12)
  })

  it('alert/direction: in right-to-left, the icon is at the right, and the action and the close button are at the left', async () => {
    const c = await box(page, part('#dir-rtl', 'container'))
    const icon = await box(page, part('#dir-rtl', 'icon'))
    const body = await box(page, part('#dir-rtl', 'body'))
    const action = await box(page, part('#dir-rtl', 'action'))
    const close = await box(page, part('#dir-rtl', 'close'))
    expect(c.x + c.width - (icon.x + icon.width)).toBe(16)
    expect(icon.x - (body.x + body.width)).toBe(12)
    expect(action.x + action.width).toBeLessThanOrEqual(body.x)
    expect(close.x - c.x).toBe(12)
    expect(action.x - (close.x + close.width)).toBe(4)
  })

  it('alert/focus: Tab shows the ring on the action and on the close button: 2 px in the ring color, 2 px from the button', async () => {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.textContent)).toBe('Retry')
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Close')
    const ring = async (s: string) =>
      Promise.all(['outline-style', 'outline-width', 'outline-offset', 'outline-color'].map((p) => style(page, s, p)))
    expect(await ring('#focus [data-part="close"] button')).toEqual(['solid', '2px', '2px', 'rgb(92, 163, 255)'])
    await page.keyboard.press('Shift+Tab')
    const action = '#focus [data-part="action"] button'
    expect(await ring(action)).toEqual(['solid', '2px', '2px', 'rgb(92, 163, 255)'])
    // The ring is inside the alert: the clip of the motion does not cut it.
    const b = await box(page, action)
    const c = await box(page, part('#focus', 'container'))
    expect(b.y - 4).toBeGreaterThanOrEqual(c.y)
    expect(b.y + b.height + 4).toBeLessThanOrEqual(c.y + c.height)
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  })

  it('alert/target: the action and the close button are 28 px for pointer; for touch, the targets are 44 px', async () => {
    const a = await box(page, part('#dir-ltr', 'action'))
    const c = await box(page, part('#dir-ltr', 'close'))
    expect([a.height, c.width, c.height]).toEqual([28, 28, 28])
    expect(await style(page, '#touch [data-part="action"] button', 'height', '::after')).toBe('44px')
    expect(await style(page, '#touch [data-part="close"] button', 'height', '::after')).toBe('44px')
    expect(await style(page, '#touch [data-part="close"] button', 'width', '::after')).toBe('44px')
  })

  it('alert/hover: at hover, the close button gets the hover fill on a fill, and its icon goes from secondary to strong', async () => {
    const s = '#states [data-part="close"] button'
    await page.locator(s).scrollIntoViewIfNeeded()
    expect(await style(page, s, 'color')).toBe('rgb(176, 176, 176)')
    expect(await style(page, s, 'background-color')).toBe('rgba(0, 0, 0, 0)')
    await page.hover(s)
    await page.waitForTimeout(250)
    expect(await style(page, s, 'background-color')).toBe('rgba(127, 127, 127, 0.15)')
    expect(await style(page, s, 'color')).toBe('rgb(245, 245, 245)')
    await page.mouse.move(0, 0)
    await page.waitForTimeout(250)
  })

  it('alert/hover: a device with no hover does not show the hover state', async () => {
    const context = await browser.newContext({ hasTouch: true })
    const phone = await context.newPage()
    await phone.setContent(await page.content())
    expect(await phone.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(false)
    const s = '#states [data-part="close"] button'
    const b = await box(phone, s)
    await phone.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
    await phone.waitForTimeout(250)
    expect(await style(phone, s, 'color')).toBe('rgb(176, 176, 176)')
    await context.close()
  })

  it('alert/press: at pointer down, the close button scales to 0.96 and the action to 0.97, in 100 ms', async () => {
    const close = '#states [data-part="close"] button'
    const action = '#states [data-part="action"] button'
    for (const s of [close, action]) expect((await style(page, s, 'transition-duration')).split(', ').at(-1)).toBe('0.1s')
    let rest = await pressAt(close)
    expect((await box(page, close)).width / rest.width).toBeCloseTo(0.96, 3)
    await page.mouse.move(0, 0)
    await page.mouse.up()
    rest = await pressAt(action)
    expect((await box(page, action)).width / rest.width).toBeCloseTo(0.97, 3)
    await page.mouse.move(0, 0)
    await page.mouse.up()
  })

  it('alert/disabled: a disabled action has the disabled opacity 0.4; the alert keeps its opacity', async () => {
    expect(await style(page, '#disabled [data-part="action"] button', 'opacity')).toBe('0.4')
    expect(await style(page, '#disabled [data-mono="alert"]', 'opacity')).toBe('1')
  })

  it('alert/in-flow and alert/no-cover: the alert is in the flow; the content below it starts at its bottom edge', async () => {
    expect(await style(page, '#flow [data-mono="alert"]', 'position')).toBe('static')
    const a = await box(page, '#flow [data-mono="alert"]')
    const below = await box(page, '#flow .below')
    expect(a.height).toBeGreaterThan(0)
    expect(below.y).toBe(a.y + a.height)
  })

  it('alert/phone: with actionBelow, the action is below the text and aligns with it; the close button stays at the end side', async () => {
    const c = await box(page, part('#phone', 'container'))
    const text = await box(page, part('#phone', 'text'))
    const action = await box(page, '#phone [data-part="action"] button')
    const close = await box(page, part('#phone', 'close'))
    expect(action.y - (text.y + text.height)).toBe(12)
    expect(action.x).toBe(text.x)
    expect(c.x + c.width - (close.x + close.width)).toBe(12)
  })

  it('alert/motion: a banner expands in 200 ms with ease-in-out, and the content below it moves down', async () => {
    const t = await enter('motion', html(<Alert variant="banner" tone="warning" title="You are offline" text="Retry" />))
    expect(t).toEqual([{ property: 'grid-template-rows', duration: 200, easing: EASE_IN_OUT }])
    const at = (ms: number) =>
      page.evaluate((time) => {
        const root = document.querySelector('#motion .slot [data-mono="alert"]') as HTMLElement
        const [a] = root.getAnimations()
        if (a) {
          a.pause()
          a.currentTime = time
        }
        return [root.getBoundingClientRect().height, (document.querySelector('#motion .below') as HTMLElement).getBoundingClientRect().y]
      }, ms)
    const [h0, y0] = await at(0)
    const [h1, y1] = await at(100)
    const [h2, y2] = await at(200)
    expect(h0).toBe(0)
    expect(h1).toBeGreaterThan(0)
    expect(h1).toBeLessThan(h2 as number)
    expect((y1 as number) - (y0 as number)).toBeCloseTo(h1 as number, 3)
    expect((y2 as number) - (y0 as number)).toBeCloseTo(h2 as number, 3)
  })

  it('alert/motion: a banner that closes goes back in the same time', async () => {
    await enter('motion', html(<Alert variant="banner" tone="warning" title="You are offline" text="Retry" {...closable} />))
    expect(await exit('motion')).toEqual([{ property: 'grid-template-rows', duration: 200, easing: EASE_IN_OUT }])
    await page.waitForTimeout(250)
    expect((await box(page, '#motion .slot [data-mono="alert"]')).height).toBe(0)
  })

  it('alert/motion: an inline warning alert expands; an inline danger alert fades in 150 ms and does not shake; info has no motion', async () => {
    expect(await enter('motion', html(<Alert tone="warning" title="Low stock" text="Text" />))).toEqual([
      { property: 'grid-template-rows', duration: 200, easing: EASE_IN_OUT },
    ])
    expect(await enter('motion', html(<Alert tone="danger" title="Payment failed" text="Text" />))).toEqual([
      { property: 'opacity', duration: 150, easing: STANDARD },
    ])
    expect(await enter('motion', html(<Alert tone="info" title="Next payout" text="Text" />))).toEqual([])
    expect(await enter('motion', html(<Alert tone="success" title="Payment confirmed" text="Text" />))).toEqual([])
  })

  it('alert/reduced-motion: with the reduced motion of the system, a banner does not expand; it fades in 150 ms and out in 100 ms', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const markup = html(<Alert variant="banner" tone="warning" title="You are offline" text="Retry" {...closable} />)
    expect(await enter('motion', markup)).toEqual([{ property: 'opacity', duration: 150, easing: STANDARD }])
    // The content moves to its new position immediately: the alert has its full height at the first frame.
    expect((await box(page, '#motion .slot [data-mono="alert"]')).height).toBeGreaterThan(0)
    expect(await exit('motion')).toEqual([{ property: 'opacity', duration: 100, easing: STANDARD }])
    expect((await box(page, '#motion .slot [data-mono="alert"]')).height).toBeGreaterThan(0)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  })

  it('alert/reduced-motion: data-motion="reduced" on an ancestor gives the same fades', async () => {
    const markup = html(<Alert variant="banner" tone="warning" title="You are offline" text="Retry" {...closable} />)
    expect(await enter('reduced', markup)).toEqual([{ property: 'opacity', duration: 150, easing: STANDARD }])
    expect(await exit('reduced')).toEqual([{ property: 'opacity', duration: 100, easing: STANDARD }])
    expect(await enter('reduced', html(<Alert tone="danger" title="Payment failed" text="Text" />))).toEqual([
      { property: 'opacity', duration: 150, easing: STANDARD },
    ])
  })
})
