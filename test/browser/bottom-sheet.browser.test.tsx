// @vitest-environment node
// The browser test of the Bottom sheet: the real CSS (Tailwind 4 with the tokens and the geometry of the contract) in
// the Chrome of the computer. Each test name starts with the id of a clause of ir/contracts/bottom-sheet.json.
//
// Two kinds of page:
// - A static page (renderToStaticMarkup): the persistent sheet at each snap point, for the sizes, the colors, the
//   density, the direction, the widths, the focus ring, and the motion values.
// - A live page: the component in a bundle (vite) with React in the page, because the modal sheet is in a portal and
//   the drag needs the events of React. The mouse of Playwright drives the drag.
import path from 'node:path'
import type { Browser, Page } from 'playwright-core'
import { chromium } from 'playwright-core'
import { renderToStaticMarkup } from 'react-dom/server'
import { build, type Rolldown } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { BottomSheet, type BottomSheetProps } from '@monorithm/react/components/bottom-sheet/bottom-sheet'
import { buildCss } from './harness'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const PHONE = { width: 390, height: 844 }
let browser: Browser
let page: Page
let css = ''
let bundle = ''

/**
 * The live page: a bundle that renders the component with React. mountSheet(attrs, props) renders one sheet. The entry
 * is not a file of the project, thus it imports the source by its path; the paths of tsconfig.json apply in the source.
 */
const ENTRY = `
import { createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import { BottomSheet } from '${ROOT}/src/components/bottom-sheet/bottom-sheet'
import { MomentProvider } from '${ROOT}/src/contexts/moment-context'
window.__moments = []
window.mountSheet = (attrs, props) => {
  const host = document.getElementById('app')
  for (const [k, v] of Object.entries(attrs)) host.setAttribute(k, v)
  const items = Array.from({ length: 40 }, (_, i) => h('li', { key: i, style: { padding: '12px 0' } }, 'Comment ' + (i + 1)))
  createRoot(host).render(
    h(MomentProvider, { onMoment: (e) => window.__moments.push({ moment: e.moment, source: e.source, t: performance.now() }) },
      h(BottomSheet, { title: 'Comments', count: 40, defaultOpen: true, footer: h('input', { 'aria-label': 'Add a comment' }), ...props },
        h('ul', null, items))))
}
`

async function bundleEntry(): Promise<string> {
  const out = (await build({
    configFile: false,
    logLevel: 'silent',
    mode: 'production',
    oxc: { jsx: { runtime: 'automatic', development: false } },
    root: ROOT,
    resolve: { tsconfigPaths: true },
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [
      {
        name: 'sheet-entry',
        enforce: 'pre',
        resolveId: (id) => (id.endsWith('virtual:sheet-entry') ? '\0sheet-entry.js' : null),
        load: (id) => (id === '\0sheet-entry.js' ? ENTRY : null),
      },
    ],
    build: { write: false, minify: false, lib: { entry: 'virtual:sheet-entry', formats: ['iife'], name: 'SheetEntry' } },
  })) as Rolldown.RolldownOutput[] | Rolldown.RolldownOutput
  const output = Array.isArray(out) ? out[0] : out
  const chunk = output?.output.find((o) => o.type === 'chunk')
  if (!chunk || chunk.type !== 'chunk') throw new Error('No bundle')
  return chunk.code
}

/** A static page with one persistent sheet (the sheet is fixed, thus one sheet for each page). */
async function staticSheet(attrs: string, props: Partial<BottomSheetProps> = {}, viewport = PHONE): Promise<void> {
  await page.setViewportSize(viewport)
  const sheet = renderToStaticMarkup(
    <BottomSheet variant="persistent" title="Results" count={24} layout="bottom" footer={<button type="button">Show the list</button>} {...(props as object)}>
      <ul>
        <li>Shop 1</li>
        <li>Shop 2</li>
      </ul>
    </BottomSheet>,
  )
  await page.setContent(`<!doctype html><html data-theme="dark"><head><style>${css}</style></head><body style="margin:0"><div ${attrs}>${sheet}</div></body></html>`)
}

/** A live page with one modal sheet, open at Half after its entrance. */
async function liveSheet(attrs: Record<string, string>, props: Record<string, unknown> = {}, viewport = PHONE): Promise<void> {
  await page.setViewportSize(viewport)
  await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body style="margin:0"><button id="opener">Open</button><div id="app"></div></body></html>`)
  await page.addScriptTag({ content: bundle })
  await page.evaluate(([a, p]) => (window as unknown as { mountSheet: (a: unknown, p: unknown) => void }).mountSheet(a, p), [attrs, props] as const)
  await page.waitForSelector('[role="dialog"]')
  await page.waitForTimeout(450)
}

const rect = (selector: string) =>
  page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }
  })
const css$ = (selector: string, prop: string, pseudo?: string) =>
  page.locator(selector).first().evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? null).getPropertyValue(p as string).trim(), [prop, pseudo] as const)
const moments = () => page.evaluate(() => (window as unknown as { __moments: { moment: string; source: string; t: number }[] }).__moments.filter((m) => m.source === 'bottom-sheet'))
const SHEET = '[data-mono="bottom-sheet"]'

beforeAll(async () => {
  ;[css, bundle] = await Promise.all([Promise.resolve(buildCss()), bundleEntry()])
  browser = await chromium.launch({ channel: 'chrome' })
  page = await browser.newPage()
}, 120_000)

afterAll(async () => {
  await browser?.close()
})

describe('Bottom sheet in Chrome: the static page', () => {
  it('bottom-sheet/snap-values: Half is 50 % of the screen, Full is the screen less the top gap, Peek is 140 px', async () => {
    const shown: Record<string, number> = {}
    for (const snap of ['peek', 'half', 'full'] as const) {
      await staticSheet('data-density="pointer"', { snap })
      shown[snap] = PHONE.height - (await rect(SHEET)).y
    }
    expect(shown).toEqual({ peek: 140, half: PHONE.height / 2, full: PHONE.height - 16 })
  })

  it('bottom-sheet/top-gap: at Full, the top gap of 16 px stays above the sheet (the top safe area is 0 here)', async () => {
    await staticSheet('data-density="pointer"', { snap: 'full' })
    expect((await rect(SHEET)).y).toBe(16)
  })

  it('bottom-sheet/web-height: the sheet is as high as the screen area in view less the top gap', async () => {
    await staticSheet('data-density="pointer"', { snap: 'half' })
    expect((await rect(SHEET)).height).toBe(PHONE.height - 16)
    // A shorter screen area (for example with the address bar in view): the sheet and Half follow it.
    await staticSheet('data-density="pointer"', { snap: 'half' }, { width: 390, height: 700 })
    expect((await rect(SHEET)).height).toBe(700 - 16)
    expect(700 - (await rect(SHEET)).y).toBe(350)
  })

  it('bottom-sheet/handle: a bar of 36 x 4 px in line-strong with round ends, at the center, 8 px from the top edge', async () => {
    await staticSheet('data-density="pointer"')
    const sheet = await rect(SHEET)
    const handle = await rect('[data-part="handle"]')
    expect([handle.width, handle.height, handle.y - sheet.y]).toEqual([36, 4, 8])
    expect(handle.x + handle.width / 2).toBe(sheet.x + sheet.width / 2)
    expect(await css$('[data-part="handle"]', 'background-color')).toBe('rgb(72, 72, 72)')
    expect(await css$('[data-part="handle"]', 'border-top-left-radius')).toBe('999px')
  })

  it('bottom-sheet/target: the target of the handle extends past the bar: 24 px high for pointer, 44 px for touch', async () => {
    await staticSheet('data-density="pointer"')
    expect([await css$('[data-part="handle"]', 'width', '::after'), await css$('[data-part="handle"]', 'height', '::after')]).toEqual(['60px', '24px'])
    await staticSheet('data-density="touch"')
    expect([await css$('[data-part="handle"]', 'width', '::after'), await css$('[data-part="handle"]', 'height', '::after')]).toEqual(['80px', '44px'])
  })

  it('bottom-sheet/surface: the raised fill, the overlay shadow, and a radius of 16 px on the top corners only', async () => {
    await staticSheet('data-density="pointer"')
    expect(await css$(SHEET, 'background-color')).toBe('rgb(30, 30, 30)')
    expect(await css$(SHEET, 'box-shadow')).toContain('rgba(0, 0, 0, 0.45) 0px 12px 32px 0px')
    expect([await css$(SHEET, 'border-top-left-radius'), await css$(SHEET, 'border-top-right-radius')]).toEqual(['16px', '16px'])
    expect([await css$(SHEET, 'border-bottom-left-radius'), await css$(SHEET, 'border-bottom-right-radius')]).toEqual(['0px', '0px'])
    await staticSheet('data-density="pointer" data-theme="light"')
    expect(await css$(SHEET, 'background-color')).toBe('rgb(255, 255, 255)')
    expect(await css$('[data-part="handle"]', 'background-color')).toBe('rgb(196, 196, 196)')
  })

  it('bottom-sheet/header: title-3 in the strong weight and the strong text color; the count in the muted text color', async () => {
    await staticSheet('data-density="pointer"')
    expect(await css$('[data-part="title"]', 'font-size')).toBe('16px')
    expect(await css$('[data-part="title"]', 'font-weight')).toBe('500')
    expect(await css$('[data-part="title"]', 'color')).toBe('rgb(245, 245, 245)')
    expect(await css$('[data-part="count"]', 'color')).toBe('rgb(158, 158, 158)')
    const title = await rect('[data-part="title"]')
    const count = await rect('[data-part="count"]')
    expect(count.x).toBeGreaterThan(title.right - 1)
  })

  it('bottom-sheet/density: the handle, the radius, and the snap points are the same in touch; the title is 17 px', async () => {
    await staticSheet('data-density="touch"')
    const sheet = await rect(SHEET)
    const handle = await rect('[data-part="handle"]')
    expect([handle.width, handle.height, handle.y - sheet.y]).toEqual([36, 4, 8])
    expect(await css$(SHEET, 'border-top-left-radius')).toBe('16px')
    expect(PHONE.height - sheet.y).toBe(PHONE.height / 2)
    expect(await css$('[data-part="title"]', 'font-size')).toBe('17px')
  })

  it('bottom-sheet/direction: in right-to-left, the title is at the right of the header; the sheet comes up from the bottom', async () => {
    await staticSheet('data-density="pointer" dir="rtl"')
    const header = await rect('[data-part="header"]')
    const title = await rect('[data-part="title"]')
    const count = await rect('[data-part="count"]')
    expect(header.right - title.right).toBe(16)
    expect(count.right).toBeLessThan(title.x + 1)
    expect(PHONE.height - (await rect(SHEET)).y).toBe(PHONE.height / 2)
  })

  it('bottom-sheet/footer: the footer stays at the bottom edge of the screen at Peek, at Half, and at Full', async () => {
    for (const snap of ['peek', 'half', 'full'] as const) {
      await staticSheet('data-density="pointer"', { snap })
      expect([snap, (await rect('[data-part="footer"]')).bottom]).toEqual([snap, PHONE.height])
    }
  })

  it('bottom-sheet/width: on a wide screen the bottom sheet is 640 px wide at the center; on a phone, the full width', async () => {
    await staticSheet('data-density="pointer"', {}, { width: 1000, height: 700 })
    const wide = await rect(SHEET)
    expect([wide.width, wide.x]).toEqual([640, 180])
    await staticSheet('data-density="pointer"')
    expect((await rect(SHEET)).width).toBe(PHONE.width)
  })

  it('bottom-sheet/side-sheet: a side sheet is 400 px wide at the end side, with the full height and no handle', async () => {
    await staticSheet('data-density="pointer"', { layout: 'side' }, { width: 1000, height: 700 })
    const side = await rect(SHEET)
    expect([side.width, side.x, side.y, side.height]).toEqual([400, 600, 0, 700])
    expect(await page.locator('[data-part="handle"]').count()).toBe(0)
    await staticSheet('data-density="pointer" dir="rtl"', { layout: 'side' }, { width: 1000, height: 700 })
    expect((await rect(SHEET)).x).toBe(0)
  })

  it('bottom-sheet/focus: Tab gives the handle a ring of 2 px in the ring color, 2 px from the bar; a click gives no ring', async () => {
    await staticSheet('data-density="pointer"')
    // A click on the handle gives it the focus, with no ring.
    const handle = await rect('[data-part="handle"]')
    await page.mouse.click(handle.x + handle.width / 2, handle.y + handle.height / 2)
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-part'))).toBe('handle')
    expect(await css$('[data-part="handle"]', 'outline-style')).toBe('none')
    await page.mouse.click(PHONE.width / 2, 100)
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-part'))).toBe('handle')
    expect(await css$('[data-part="handle"]', 'outline-width')).toBe('2px')
    expect(await css$('[data-part="handle"]', 'outline-offset')).toBe('2px')
    expect(await css$('[data-part="handle"]', 'outline-color')).toBe('rgb(92, 163, 255)')
  })

  it('bottom-sheet/motion: the entrance is 320 ms with ease-out from the bottom edge; the exit is 200 ms with ease-in', async () => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await staticSheet('data-density="pointer"')
    expect(await css$(SHEET, 'transition-property')).toBe('translate, opacity')
    expect(await css$(SHEET, 'transition-duration')).toBe('0.32s')
    expect(await css$(SHEET, 'transition-timing-function')).toContain('cubic-bezier(0.3, 0.7, 0.2, 1)')
    await page.locator(SHEET).evaluate((el) => el.setAttribute('data-starting-style', ''))
    // The start of the entrance: the sheet is below the bottom edge.
    await page.locator(SHEET).evaluate((el) => (el as HTMLElement).style.setProperty('transition', 'none'))
    expect((await rect(SHEET)).y).toBe(PHONE.height)
    await page.locator(SHEET).evaluate((el) => {
      el.removeAttribute('data-starting-style')
      ;(el as HTMLElement).style.removeProperty('transition')
      el.setAttribute('data-ending-style', '')
    })
    expect(await css$(SHEET, 'transition-duration')).toBe('0.2s')
    expect(await css$(SHEET, 'transition-timing-function')).toContain('cubic-bezier(0.4, 0, 1, 1)')
  })

  it('bottom-sheet/motion-reduced: with reduced motion, no slide: a fade of 150 ms in and 100 ms out', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await staticSheet('data-density="pointer"')
    expect(await css$(SHEET, 'transition-duration')).toBe('0.15s')
    await page.locator(SHEET).evaluate((el) => {
      ;(el as HTMLElement).style.setProperty('transition', 'none')
      el.setAttribute('data-starting-style', '')
    })
    // The start of the entrance: at its snap point, with an opacity of 0.
    expect(PHONE.height - (await rect(SHEET)).y).toBe(PHONE.height / 2)
    expect(await css$(SHEET, 'opacity')).toBe('0')
    await page.locator(SHEET).evaluate((el) => {
      el.removeAttribute('data-starting-style')
      ;(el as HTMLElement).style.removeProperty('transition')
      el.setAttribute('data-ending-style', '')
    })
    expect(await css$(SHEET, 'transition-duration')).toBe('0.1s')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  })

  it('bottom-sheet/side-sheet-motion: a side sheet comes in from its edge; with reduced motion, it fades', async () => {
    await staticSheet('data-density="pointer"', { layout: 'side' }, { width: 1000, height: 700 })
    await page.locator(SHEET).evaluate((el) => {
      ;(el as HTMLElement).style.setProperty('transition', 'none')
      el.setAttribute('data-starting-style', '')
    })
    expect((await rect(SHEET)).x).toBe(1000)
    expect(await css$(SHEET, 'transition-duration')).toBe('0s')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect((await rect(SHEET)).x).toBe(600)
    expect(await css$(SHEET, 'opacity')).toBe('0')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    // In right-to-left, the end edge is the left edge.
    await staticSheet('data-density="pointer" dir="rtl"', { layout: 'side' }, { width: 1000, height: 700 })
    await page.locator(SHEET).evaluate((el) => {
      ;(el as HTMLElement).style.setProperty('transition', 'none')
      el.setAttribute('data-starting-style', '')
    })
    expect((await rect(SHEET)).x).toBe(-400)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect((await rect(SHEET)).x).toBe(0)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  })
})

describe('Bottom sheet in Chrome: the live page', () => {
  it('bottom-sheet/scrim: the scrim is black at 60 % in the dark theme and #0a0a0a at 40 % in the light theme', async () => {
    await liveSheet({ 'data-theme': 'dark', 'data-density': 'touch' }, { layout: 'bottom' })
    expect(await css$('[data-part="scrim"]', 'background-color')).toBe('rgba(0, 0, 0, 0.6)')
    expect(await css$('[data-part="scrim"]', 'opacity')).toBe('1')
    await liveSheet({ 'data-theme': 'light', 'data-density': 'touch' }, { layout: 'bottom' })
    expect(await css$('[data-part="scrim"]', 'background-color')).toBe('rgba(10, 10, 10, 0.4)')
  })

  it('bottom-sheet/snap-only: the modal sheet opens at Half', async () => {
    await liveSheet({ 'data-theme': 'dark', 'data-density': 'touch' }, { layout: 'bottom' })
    expect(PHONE.height - (await rect(SHEET)).y).toBe(PHONE.height / 2)
    expect(await moments()).toMatchObject([{ moment: 'open' }])
  })

  it('bottom-sheet/tracking: with the mouse, the sheet follows the pointer 1 : 1 from the slop, and the scrim follows', async () => {
    await liveSheet({ 'data-theme': 'dark', 'data-density': 'touch' }, { layout: 'bottom' })
    const header = await rect('[data-part="header"]')
    const x = header.x + 40
    const y = header.y + header.height / 2
    const top0 = (await rect(SHEET)).y
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x, y - 5)
    expect((await rect(SHEET)).y).toBe(top0)
    expect(await moments()).toMatchObject([{ moment: 'open' }])
    await page.mouse.move(x, y - 50)
    expect((await rect(SHEET)).y).toBe(top0 - 42)
    await page.mouse.move(x, y + 120)
    expect((await rect(SHEET)).y).toBe(top0 + 128)
    // The scrim: x / Half.
    const shown = PHONE.height - (top0 + 128)
    expect(Number(await css$('[data-part="scrim"]', 'opacity'))).toBeCloseTo(shown / (PHONE.height / 2), 2)
    expect((await moments()).map((m) => m.moment)).toEqual(['open', 'drag-start'])
    await page.mouse.move(x, y)
    await page.waitForTimeout(80)
    await page.mouse.up()
    await page.waitForTimeout(500)
    expect((await rect(SHEET)).y).toBe(top0)
  })

  it('bottom-sheet/release: a fling up goes to Full with spring-sheet; snap comes at the contact, before the settle', async () => {
    await liveSheet({ 'data-theme': 'dark', 'data-density': 'touch' }, { layout: 'bottom' })
    const header = await rect('[data-part="header"]')
    const x = header.x + 40
    const y = header.y + header.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(x, y - i * 12)
      await page.waitForTimeout(8)
    }
    const release = await page.evaluate(() => performance.now())
    await page.mouse.up()
    // During the spring, the sheet is between the release position and Full.
    await page.waitForTimeout(60)
    const mid = (await rect(SHEET)).y
    expect(mid).toBeGreaterThan(16)
    await page.waitForTimeout(600)
    expect((await rect(SHEET)).y).toBe(16)
    expect(await page.locator(SHEET).getAttribute('data-snap')).toBe('full')
    const list = await moments()
    expect(list.map((m) => m.moment)).toEqual(['open', 'drag-start', 'snap'])
    // The contact of a move of this length with the fling velocity is less than the settle time.
    expect((list[2]?.t ?? 0) - release).toBeLessThan(372 + 50)
  })

  it('bottom-sheet/rubber-band: past Full, the sheet moves one third of the pointer distance, then goes back to Full', async () => {
    await liveSheet({ 'data-theme': 'dark', 'data-density': 'touch' }, { layout: 'bottom', snap: undefined })
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(600)
    expect((await rect(SHEET)).y).toBe(16)
    const header = await rect('[data-part="header"]')
    const x = header.x + 40
    const y = header.y + header.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x, y - 98)
    expect((await rect(SHEET)).y).toBeCloseTo(16 - 30, 0)
    await page.waitForTimeout(80)
    await page.mouse.up()
    await page.waitForTimeout(600)
    expect((await rect(SHEET)).y).toBe(16)
  })

  it('bottom-sheet/close-line: a drag down past the close line closes the sheet with spring-sheet; close comes at the release', async () => {
    await liveSheet({ 'data-theme': 'dark', 'data-density': 'touch' }, { layout: 'bottom' })
    const header = await rect('[data-part="header"]')
    const x = header.x + 40
    const y = header.y + header.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    // Half is 422 px. The close line is at 316.5 px: down 120 px less the slop is at 310 px.
    await page.mouse.move(x, y + 60)
    await page.mouse.move(x, y + 120)
    await page.waitForTimeout(80)
    await page.mouse.up()
    expect((await moments()).map((m) => m.moment)).toEqual(['open', 'drag-start', 'close'])
    await page.waitForTimeout(800)
    expect(await page.locator('[role="dialog"]').count()).toBe(0)
  })

  it('bottom-sheet/header: in right-to-left, the title is at the right and the close button at the left', async () => {
    await liveSheet({ 'data-theme': 'dark', 'data-density': 'touch', dir: 'rtl' }, { layout: 'bottom' })
    const title = await rect('[data-part="title"]')
    const close = await rect('[role="dialog"] [data-mono="icon-button"]')
    expect(close.right).toBeLessThan(title.x)
    expect(close.width).toBeGreaterThanOrEqual(44)
  })

  it('bottom-sheet/web: from 768 px, the layout auto shows a side sheet with no scrim', async () => {
    await liveSheet({ 'data-theme': 'dark', 'data-density': 'pointer' }, {}, { width: 1024, height: 700 })
    expect(await page.locator(SHEET).getAttribute('data-layout')).toBe('side')
    expect(await page.locator('[data-part="scrim"]').count()).toBe(0)
    await liveSheet({ 'data-theme': 'dark', 'data-density': 'touch' }, {}, { width: 767, height: 700 })
    expect(await page.locator(SHEET).getAttribute('data-layout')).toBe('bottom')
  })
})
