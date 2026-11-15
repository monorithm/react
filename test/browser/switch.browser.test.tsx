// @vitest-environment node
// The browser test of the Switch: the real CSS (Tailwind 4 with the tokens and the geometry of the contract) in a real
// Chrome. It measures the clauses that jsdom cannot compute: the density, the direction, the focus ring, the motion,
// and the theme. Each test name starts with the id of a clause of ir/contracts/switch.json.
//
// It uses the Chrome of the computer (playwright-core, channel "chrome"): no browser download.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { type Browser, chromium, type Page } from 'playwright-core'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Switch } from '../../src/components/switch/switch'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
let browser: Browser
let page: Page

/** One switch in one context. The id lets the test find it. */
const cell = (id: string, attrs: string, checked: boolean): string =>
  `<div id="${id}" ${attrs} style="width:320px;padding:8px">${renderToStaticMarkup(<Switch label={id} defaultChecked={checked} />)}</div>`

beforeAll(async () => {
  const out = path.join(os.tmpdir(), `mono-switch-${process.pid}.css`)
  execFileSync(path.join(ROOT, 'node_modules/.bin/tailwindcss'), ['-i', path.join(ROOT, 'test/browser/fixture.css'), '-o', out], { stdio: 'pipe' })
  const css = fs.readFileSync(out, 'utf8')
  const html = [
    cell('pointer-off', 'data-density="pointer" dir="ltr"', false),
    cell('pointer-on', 'data-density="pointer" dir="ltr"', true),
    cell('touch-off', 'data-density="touch" dir="ltr"', false),
    cell('touch-on', 'data-density="touch" dir="ltr"', true),
    cell('rtl-off', 'data-density="pointer" dir="rtl"', false),
    cell('rtl-on', 'data-density="pointer" dir="rtl"', true),
    cell('light-on', 'data-density="pointer" data-theme="light"', true),
    cell('dark-on', 'data-density="pointer" data-theme="dark"', true),
  ].join('')
  browser = await chromium.launch({ channel: 'chrome' })
  page = await browser.newPage()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setContent(`<!doctype html><html data-theme="dark"><head><style>${css}</style></head><body>${html}</body></html>`)
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

const box = async (id: string, part: 'track' | 'knob' | 'row') => {
  const sel = part === 'row' ? `#${id} [data-mono="switch"]` : part === 'track' ? `#${id} [role="switch"]` : `#${id} [role="switch"] > *`
  const b = await page.locator(sel).first().boundingBox()
  if (!b) throw new Error(`No box for ${sel}`)
  return b
}
const style = (id: string, part: 'track' | 'knob', prop: string) =>
  page.locator(part === 'track' ? `#${id} [role="switch"]` : `#${id} [role="switch"] > *`).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

describe('Switch in Chrome', () => {
  it('switch/density: pointer 36 x 20 with a knob of 16; touch 45 x 25 with a knob of 20', async () => {
    const pt = await box('pointer-off', 'track')
    const pk = await box('pointer-off', 'knob')
    expect([pt.width, pt.height, pk.width]).toEqual([36, 20, 16])
    const tt = await box('touch-off', 'track')
    const tk = await box('touch-off', 'knob')
    expect([tt.width, tt.height, tk.width]).toEqual([45, 25, 20])
  })

  it('switch/target: the row is 24 px high or more for pointer, 44 px or more for touch', async () => {
    expect((await box('pointer-off', 'row')).height).toBeGreaterThanOrEqual(24)
    expect((await box('touch-off', 'row')).height).toBeGreaterThanOrEqual(44)
  })

  it('switch/on-sign: on moves the knob by one control unit to the end side, with an inset of 2 px', async () => {
    const t = await box('pointer-off', 'track')
    const off = await box('pointer-off', 'knob')
    const on = await box('pointer-on', 'knob')
    const tOn = await box('pointer-on', 'track')
    expect(off.x - t.x).toBe(2)
    expect(on.x - tOn.x).toBe(2 + 16)
  })

  it('switch/direction: in right-to-left, off is at the right and on moves the knob to the left', async () => {
    const t = await box('rtl-off', 'track')
    const off = await box('rtl-off', 'knob')
    const tOn = await box('rtl-on', 'track')
    const on = await box('rtl-on', 'knob')
    expect(t.x + t.width - (off.x + off.width)).toBe(2)
    expect(tOn.x + tOn.width - (on.x + on.width)).toBe(2 + 16)
  })

  it('switch/on-sign: the on fill is the accent of the theme, and the knob is white', async () => {
    expect(await style('dark-on', 'track', 'background-color')).toBe('rgb(92, 163, 255)')
    expect(await style('light-on', 'track', 'background-color')).toBe('rgb(31, 111, 224)')
    expect(await style('dark-on', 'knob', 'background-color')).toBe('rgb(255, 255, 255)')
  })

  it('switch/disabled: the opacity token is 0.4', async () => {
    const v = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--mono-opacity-disabled').trim())
    expect(v).toBe('0.4')
  })

  it('switch/focus: Tab gives the track an outline of 2 px in the ring color, 2 px from the track', async () => {
    await page.keyboard.press('Tab')
    const id = await page.evaluate(() => document.activeElement?.closest('div[id]')?.id)
    expect(id).toBe('pointer-off')
    expect(await style('pointer-off', 'track', 'outline-width')).toBe('2px')
    expect(await style('pointer-off', 'track', 'outline-offset')).toBe('2px')
    expect(await style('pointer-off', 'track', 'outline-color')).toBe('rgb(92, 163, 255)')
  })

  it('switch/motion: with reduced motion, the knob has no transition', async () => {
    expect(await style('pointer-on', 'knob', 'transition-property')).toBe('none')
  })

  it('switch/motion: with motion, the knob moves with spring-control over 248 ms', async () => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    expect(await style('pointer-on', 'knob', 'transition-duration')).toContain('0.248s')
    // Chrome writes the computed linear() with a stop for each sample: the first is 0 at 0 %, the last is 1 at 100 %.
    const curve = await style('pointer-on', 'knob', 'transition-timing-function')
    expect(curve).toMatch(/^linear\(0 0%, /)
    expect(curve).toMatch(/, 1 100%\)$/)
  })
})
