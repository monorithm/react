// @vitest-environment node
// The browser test of the Checkbox and the Radio group: the real CSS in a real Chrome. It measures the clauses that
// jsdom cannot compute: the sizes of the densities, the target, the colors of the states, the direction, the focus
// ring, and the motion. Each test name starts with the id of a clause of ir/contracts/checkbox.json or
// ir/contracts/radio-group.json.
import type { Browser, Page } from 'playwright-core'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Checkbox } from '@monorithm/react/checkbox/checkbox'
import { RadioGroup } from '@monorithm/react/radio-group/radio-group'
import { Radio } from '@monorithm/react/radio-group/radio-group.radio'
import { box, cell, openPage, style } from '@monorithm/react/test/browser/harness'

let browser: Browser
let page: Page

const html = (node: ReactNode) => renderToStaticMarkup(<>{node}</>)
const checks = (
  <>
    <Checkbox label="Off" />
    <Checkbox label="On" defaultChecked />
    <Checkbox label="Mixed" mixed />
    <Checkbox label="Disabled" disabled disabledReason="Not possible in this view" />
  </>
)
const list = (
  <RadioGroup label="Delivery" defaultValue="standard">
    <Radio value="pickup" label="Pickup" />
    <Radio value="standard" label="Standard" />
    <Radio value="courier" label="Courier" disabled disabledReason="Not available in your area at this time" />
  </RadioGroup>
)
const cards = (
  <RadioGroup label="Delivery, cards" variant="cards" defaultValue="standard">
    <Radio value="pickup" label="Pickup" description="At the shop" detail="Free" />
    <Radio value="standard" label="Standard" description="In 3 days" detail="GH₵ 25.00" />
  </RadioGroup>
)

beforeAll(async () => {
  const body = [
    // The first cell has the first focusable element: the focus test presses Tab one time.
    cell('focus', 'data-density="pointer"', html(<Checkbox label="First" />)),
    ...(['pointer', 'touch'] as const).map((d) => cell(`checks-${d}`, `data-density="${d}"`, html(checks))),
    cell('checks-light', 'data-density="pointer" data-theme="light"', html(checks)),
    cell('checks-rtl', 'data-density="pointer" dir="rtl"', html(<Checkbox label="Right to left" />)),
    ...(['pointer', 'touch'] as const).map((d) => cell(`list-${d}`, `data-density="${d}"`, html(list))),
    cell('cards', 'data-density="pointer"', html(cards)),
    cell('cards-rtl', 'data-density="pointer" dir="rtl"', html(cards)),
    cell('list-rtl', 'data-density="pointer" dir="rtl"', html(list)),
  ].join('')
  ;({ browser, page } = await openPage(body))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

const cb = (cellId: string, name: string) => `#${cellId} label:has-text("${name}") [role="checkbox"]`
const mark = (cellId: string, name: string) => `${cb(cellId, name)} [data-part="mark"]`
const radio = (cellId: string, name: string) => `#${cellId} label:has-text("${name}") [role="radio"]`
const dot = (cellId: string, name: string) => `${radio(cellId, name)} [data-part="dot"]`
const option = (cellId: string, name: string) => `#${cellId} label:has-text("${name}")`

describe('Checkbox in Chrome', () => {
  it('checkbox/density: the box is 16 px for pointer and 20 px for touch; the radius is a quarter of the box', async () => {
    const p = await box(page, cb('checks-pointer', 'Off'))
    const t = await box(page, cb('checks-touch', 'Off'))
    expect([p.width, p.height, t.width, t.height]).toEqual([16, 16, 20, 20])
    expect(await style(page, cb('checks-pointer', 'Off'), 'border-top-left-radius')).toBe('4px')
    expect(await style(page, cb('checks-touch', 'Off'), 'border-top-left-radius')).toBe('5px')
  })

  it('checkbox/target: the row is 24 px high or more for pointer, 44 px or more for touch', async () => {
    expect((await box(page, option('checks-pointer', 'Off'))).height).toBeGreaterThanOrEqual(24)
    expect((await box(page, option('checks-touch', 'Off'))).height).toBeGreaterThanOrEqual(44)
  })

  it('checkbox/on-sign: off has the surface fill and the field line; on has the accent fill and the mark', async () => {
    expect(await style(page, cb('checks-pointer', 'Off'), 'background-color')).toBe('rgb(20, 20, 20)')
    expect(await style(page, cb('checks-pointer', 'Off'), 'border-top-color')).toBe('rgb(107, 107, 107)')
    expect(await style(page, cb('checks-pointer', 'Off'), 'border-top-width')).toBe('1px')
    expect(await style(page, mark('checks-pointer', 'Off'), 'scale')).toBe('0')
    expect(await style(page, cb('checks-pointer', 'On'), 'background-color')).toBe('rgb(92, 163, 255)')
    expect(await style(page, mark('checks-pointer', 'On'), 'scale')).toBe('1')
    expect(await style(page, mark('checks-pointer', 'On'), 'color')).toBe('rgb(10, 10, 10)')
    expect(await style(page, `${mark('checks-pointer', 'On')} path`, 'stroke-width')).toBe('2px')
    expect(await style(page, cb('checks-light', 'Off'), 'border-top-color')).toBe('rgb(138, 138, 138)')
    expect(await style(page, cb('checks-light', 'On'), 'background-color')).toBe('rgb(31, 111, 224)')
  })

  it('checkbox/mixed: a mixed checkbox has the accent fill and shows its mark', async () => {
    expect(await style(page, cb('checks-pointer', 'Mixed'), 'background-color')).toBe('rgb(92, 163, 255)')
    expect(await style(page, mark('checks-pointer', 'Mixed'), 'scale')).toBe('1')
  })

  it('checkbox/disabled: a disabled checkbox has the opacity 0.4; the cause stays readable', async () => {
    expect(await style(page, cb('checks-pointer', 'Disabled'), 'opacity')).toBe('0.4')
    expect(await style(page, '#checks-pointer label:has-text("Disabled") span:has-text("Not possible")', 'opacity')).toBe('1')
  })

  it('checkbox/focus: Tab shows the ring on the box: 2 px in the ring color, 2 px from the box', async () => {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.getAttribute('role'))).toBe('checkbox')
    expect(await style(page, cb('focus', 'First'), 'outline-width')).toBe('2px')
    expect(await style(page, cb('focus', 'First'), 'outline-offset')).toBe('2px')
    expect(await style(page, cb('focus', 'First'), 'outline-color')).toBe('rgb(92, 163, 255)')
  })

  it('checkbox/direction: in right-to-left, the box is at the right of the label', async () => {
    const b = await box(page, cb('checks-rtl', 'Right to left'))
    const l = await box(page, '#checks-rtl label span:text("Right to left")')
    expect(b.x).toBeGreaterThan(l.x + l.width)
    expect(b.x - (l.x + l.width)).toBe(10)
  })

  it('checkbox/motion: the mark grows with spring-control in 248 ms; with reduced motion it has no transition', async () => {
    expect(await style(page, mark('checks-pointer', 'On'), 'transition-duration')).toBe('0.248s')
    expect(await style(page, mark('checks-pointer', 'On'), 'transition-timing-function')).toMatch(/^linear\(0 0%, .*, 1 100%\)$/)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await style(page, mark('checks-pointer', 'On'), 'transition-property')).toBe('none')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  })
})

describe('Radio group in Chrome', () => {
  it('radio-group/density: the ring is 16 px for pointer and 20 px for touch; the dot is 0.375 of the ring', async () => {
    const rp = await box(page, radio('list-pointer', 'Standard'))
    const rt = await box(page, radio('list-touch', 'Standard'))
    expect([rp.width, rt.width]).toEqual([16, 20])
    const dp = await box(page, dot('list-pointer', 'Standard'))
    const dt = await box(page, dot('list-touch', 'Standard'))
    expect([dp.width, dt.width]).toEqual([6, 7.5])
    expect(await style(page, radio('list-pointer', 'Standard'), 'border-top-left-radius')).toBe('999px')
  })

  it('radio-group/target: the row is 24 px high or more for pointer, 44 px or more for touch', async () => {
    expect((await box(page, option('list-pointer', 'Pickup'))).height).toBeGreaterThanOrEqual(24)
    expect((await box(page, option('list-touch', 'Pickup'))).height).toBeGreaterThanOrEqual(44)
  })

  it('radio-group/selected-sign: the selected option has the accent border and the accent dot', async () => {
    expect(await style(page, radio('list-pointer', 'Pickup'), 'border-top-color')).toBe('rgb(107, 107, 107)')
    expect(await style(page, dot('list-pointer', 'Pickup'), 'scale')).toBe('0')
    expect(await style(page, radio('list-pointer', 'Standard'), 'border-top-color')).toBe('rgb(92, 163, 255)')
    expect(await style(page, dot('list-pointer', 'Standard'), 'scale')).toBe('1')
    expect(await style(page, dot('list-pointer', 'Standard'), 'background-color')).toBe('rgb(92, 163, 255)')
  })

  it('radio-group/selected-sign: a selected card has the accent border and the accent tint', async () => {
    expect(await style(page, option('cards', 'Pickup'), 'border-top-color')).toBe('rgb(46, 46, 46)')
    expect(await style(page, option('cards', 'Standard'), 'border-top-color')).toBe('rgb(92, 163, 255)')
    expect(await style(page, option('cards', 'Standard'), 'background-color')).toBe('rgba(92, 163, 255, 0.14)')
    expect(await style(page, option('cards', 'Standard'), 'border-top-left-radius')).toBe('12px')
    expect(await style(page, option('cards', 'Standard'), 'padding-top')).toBe('14px')
    expect(await style(page, option('cards', 'Standard'), 'padding-left')).toBe('16px')
  })

  it('radio-group/disabled: a disabled option has the opacity 0.4 on its ring', async () => {
    expect(await style(page, radio('list-pointer', 'Courier'), 'opacity')).toBe('0.4')
  })

  it('radio-group/direction: in right-to-left, the ring is at the right of the label, and the detail at the left', async () => {
    const r = await box(page, radio('list-rtl', 'Pickup'))
    const l = await box(page, '#list-rtl label span:text("Pickup")')
    expect(r.x - (l.x + l.width)).toBe(10)
    const card = await box(page, option('cards-rtl', 'Standard'))
    const detail = await box(page, '#cards-rtl label:has-text("Standard") [data-part="detail"]')
    expect(detail.x - card.x).toBe(16 + 1)
  })

  it('radio-group/focus: keyboard focus on a card shows the ring on the full card', async () => {
    await page.keyboard.press('Tab')
    await page.locator(radio('cards', 'Standard')).focus()
    expect(await style(page, option('cards', 'Standard'), 'outline-width')).toBe('2px')
    expect(await style(page, option('cards', 'Standard'), 'outline-color')).toBe('rgb(92, 163, 255)')
    expect(await style(page, radio('cards', 'Standard'), 'outline-style')).toBe('none')
  })

  it('radio-group/motion: the dot grows with spring-control; after a key, with spring-quick; reduced motion stops it', async () => {
    expect(await style(page, dot('list-pointer', 'Standard'), 'transition-duration')).toBe('0.248s')
    // The static page has no React events: the test sets the attribute that a key sets (the jsdom test covers the key).
    await page.evaluate(() => document.querySelector('#list-pointer [role="radiogroup"]')?.setAttribute('data-input', 'keyboard'))
    expect(await style(page, dot('list-pointer', 'Standard'), 'transition-duration')).toBe('0.186s')
    expect(await style(page, dot('list-pointer', 'Standard'), 'transition-timing-function')).toMatch(/^linear\(0 0%, .*, 1 100%\)$/)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await style(page, dot('list-pointer', 'Standard'), 'transition-property')).toBe('none')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  })
})
