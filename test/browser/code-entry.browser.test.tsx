// @vitest-environment node
// The browser test of the Code entry: the real CSS in a real Chrome. It measures the clauses that jsdom cannot compute:
// the sizes of the densities, the fit in a narrow form, the colors of the themes and the states, the focus of a field,
// the direction, and the motion. Each test name starts with the id of a clause of ir/contracts/code-entry.json.
import type { Browser, Page } from 'playwright-core'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { CodeEntry } from '@monorithm/react/components/code-entry/code-entry'
import { box, cell, openPage, style } from './harness'

let browser: Browser
let page: Page

const REFUSED = 'The code is not correct. Type the code again, or get a new code.'
const TIMER = 'Send a new code in 0:42'
const html = (node: ReactNode) => renderToStaticMarkup(<>{node}</>)
/** A cell of a given width with no padding: the harness cell has 304 px of content, less than six touch boxes. */
const sized = (id: string, width: number, attrs: string, inner: string) => `<div id="${id}" ${attrs} style="width:${width}px">${inner}</div>`

beforeAll(async () => {
  const body = [
    // The first cell has the first focusable element: the focus test presses Tab one time.
    cell('focus', 'data-density="pointer"', html(<CodeEntry label="First" />)),
    ...(['pointer', 'touch'] as const).map((d) => sized(`code-${d}`, 400, `data-density="${d}"`, html(<CodeEntry label="Code" defaultValue="482" />))),
    sized('light', 400, 'data-density="pointer" data-theme="light"', html(<CodeEntry label="Code" defaultValue="482" />)),
    sized('error', 400, 'data-density="pointer"', html(<CodeEntry label="Code" defaultValue="000000" error={REFUSED} timer={TIMER} />)),
    sized('error-light', 400, 'data-density="pointer" data-theme="light"', html(<CodeEntry label="Code" defaultValue="000000" error={REFUSED} />)),
    sized('timer', 400, 'data-density="pointer"', html(<CodeEntry label="Code" defaultValue="000000" timer={TIMER} />)),
    sized('disabled', 400, 'data-density="pointer"', html(<CodeEntry label="Code" disabled disabledReason="Wait for the new code" />)),
    sized('rtl', 400, 'data-density="pointer" dir="rtl"', html(<CodeEntry label="رمز لمرة واحدة" defaultValue="482913" timer={TIMER} />)),
    sized('narrow', 316, 'data-density="touch"', html(<CodeEntry label="Code" />)),
    sized('tiny', 200, 'data-density="touch"', html(<CodeEntry label="Code" />)),
    sized('reduced', 400, 'data-density="pointer" data-motion="reduced"', html(<CodeEntry label="Code" error={REFUSED} />)),
  ].join('')
  ;({ browser, page } = await openPage(body))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

/** The box at a position (1 to 6) in a cell. */
const b = (cellId: string, position: number) => `#${cellId} [data-part="box"]:nth-child(${position})`
const part = (cellId: string, name: string) => `#${cellId} [data-part="${name}"]`
const positions = (cellId: string) => Promise.all([1, 2, 3, 4, 5, 6].map((p) => box(page, b(cellId, p))))

describe('Code entry in Chrome', () => {
  it('code-entry/density: a box is 40 x 48 px for pointer and 48 x 56 px for touch; the gap is 8 px; six touch boxes need 328 px', async () => {
    const p = await positions('code-pointer')
    const t = await positions('code-touch')
    expect([p[0]?.width, p[0]?.height, t[0]?.width, t[0]?.height]).toEqual([40, 48, 48, 56])
    for (const row of [p, t]) {
      for (let i = 1; i < 6; i += 1) expect((row[i]?.x ?? 0) - ((row[i - 1]?.x ?? 0) + (row[i - 1]?.width ?? 0))).toBe(8)
    }
    expect((await box(page, part('code-touch', 'boxes'))).width).toBe(328)
  })

  it('code-entry/target: each box is 24 px or more for pointer and 44 px or more for touch, on each axis', async () => {
    for (const r of await positions('code-pointer')) expect(Math.min(r.width, r.height)).toBeGreaterThanOrEqual(24)
    for (const id of ['code-touch', 'narrow', 'tiny']) {
      for (const r of await positions(id)) expect(Math.min(r.width, r.height)).toBeGreaterThanOrEqual(44)
    }
  })

  it('code-entry/shape: the surface fill, a border of 1 px in the field line color, and the medium radius of the density', async () => {
    expect(await style(page, b('code-pointer', 1), 'background-color')).toBe('rgb(20, 20, 20)')
    expect(await style(page, b('code-pointer', 1), 'border-top-color')).toBe('rgb(107, 107, 107)')
    expect(await style(page, b('code-pointer', 1), 'border-top-width')).toBe('1px')
    expect(await style(page, b('code-pointer', 1), 'border-top-left-radius')).toBe('8px')
    expect(await style(page, b('code-touch', 1), 'border-top-left-radius')).toBe('10px')
    expect(await style(page, b('light', 1), 'background-color')).toBe('rgb(255, 255, 255)')
    expect(await style(page, b('light', 1), 'border-top-color')).toBe('rgb(138, 138, 138)')
  })

  it('code-entry/fit: in a narrow form, the boxes get narrower and stay at the minimum target or more', async () => {
    const narrow = await positions('narrow')
    expect(narrow.map((r) => r.width)).toEqual(Array(6).fill(46))
    expect((await box(page, part('narrow', 'boxes'))).width).toBe(316)
    const tiny = await positions('tiny')
    expect(tiny.map((r) => r.width)).toEqual(Array(6).fill(44))
    expect(tiny.map((r) => r.height)).toEqual(Array(6).fill(56))
  })

  it('code-entry/digit: the digit is at the center, with tabular figures and the strong weight; 20 px for pointer, 22 px for touch', async () => {
    expect(await style(page, b('code-pointer', 1), 'font-size')).toBe('20px')
    expect(await style(page, b('code-touch', 1), 'font-size')).toBe('22px')
    expect(await style(page, b('code-pointer', 1), 'font-weight')).toBe('500')
    expect(await style(page, b('code-pointer', 1), 'font-variant-numeric')).toBe('tabular-nums')
    expect(await style(page, b('code-pointer', 1), 'text-align')).toBe('center')
    expect(await style(page, b('code-pointer', 1), 'color')).toBe('rgb(224, 224, 224)')
    expect(await style(page, b('light', 1), 'color')).toBe('rgb(30, 30, 30)')
  })

  it('code-entry/hover: a device with hover shows the border in the muted text color; an error or a disabled box does not change', async () => {
    for (const [id, color] of [
      ['code-pointer', 'rgb(158, 158, 158)'],
      ['error', 'rgb(242, 85, 90)'],
      ['disabled', 'rgb(107, 107, 107)'],
    ] as const) {
      await page.locator(b(id, 2)).scrollIntoViewIfNeeded()
      await page.hover(b(id, 2), { force: true })
      await page.waitForTimeout(250)
      expect(await style(page, b(id, 2), 'border-top-color')).toBe(color)
      await page.mouse.move(0, 0)
    }
  })

  it('code-entry/focus: Tab and a click show the focus of a field: the ring border and a soft ring of 3 px in the accent soft color', async () => {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Digit 1 of 6')
    await page.waitForTimeout(250)
    expect(await style(page, b('focus', 1), 'border-top-color')).toBe('rgb(92, 163, 255)')
    expect(await style(page, b('focus', 1), 'box-shadow')).toBe('rgba(92, 163, 255, 0.14) 0px 0px 0px 3px')
    expect(await style(page, b('focus', 1), 'outline-style')).toBe('none')
    await page.click(b('light', 4))
    await page.waitForTimeout(250)
    expect(await style(page, b('light', 4), 'border-top-color')).toBe('rgb(31, 111, 224)')
    expect(await style(page, b('light', 4), 'box-shadow')).toBe('rgba(31, 111, 224, 0.1) 0px 0px 0px 3px')
  })

  it('code-entry/error-sign: in the error state, all six boxes have the danger border; the box with the focus has the danger soft ring', async () => {
    for (let p = 1; p <= 6; p += 1) expect(await style(page, b('error', p), 'border-top-color')).toBe('rgb(242, 85, 90)')
    for (let p = 1; p <= 6; p += 1) expect(await style(page, b('error-light', p), 'border-top-color')).toBe('rgb(217, 58, 64)')
    await page.click(b('error', 3))
    await page.waitForTimeout(250)
    expect(await style(page, b('error', 3), 'border-top-color')).toBe('rgb(242, 85, 90)')
    expect(await style(page, b('error', 3), 'box-shadow')).toBe('rgba(242, 85, 90, 0.14) 0px 0px 0px 3px')
    expect(await style(page, b('error', 2), 'box-shadow')).toBe('none')
    expect(await style(page, part('error', 'error-text'), 'opacity')).toBe('1')
  })

  it('code-entry/error-text: the error text shows below the boxes, in the danger text color of each theme', async () => {
    const row = await box(page, part('error', 'boxes'))
    const text = await box(page, part('error', 'error-text'))
    expect(text.y).toBeGreaterThanOrEqual(row.y + row.height)
    expect(await style(page, part('error', 'error-text'), 'color')).toBe('rgb(255, 123, 127)')
    expect(await style(page, part('error-light', 'error-text'), 'color')).toBe('rgb(196, 47, 53)')
    expect(await style(page, part('error', 'error-text'), 'font-size')).toBe('13px')
  })

  it('code-entry/direction: in a right-to-left layout, the boxes go from left to right; the label and the timer align to the right', async () => {
    const rtl = await positions('rtl')
    for (let i = 1; i < 6; i += 1) expect(rtl[i]?.x).toBeGreaterThan(rtl[i - 1]?.x ?? 0)
    expect(await page.locator(b('rtl', 1)).inputValue()).toBe('4')
    const c = await box(page, '#rtl')
    for (const name of ['label', 'boxes', 'timer']) {
      const r = await box(page, part('rtl', name))
      expect(r.x + r.width).toBe(c.x + c.width)
    }
    expect(await style(page, part('rtl', 'timer'), 'direction')).toBe('rtl')
    expect(await style(page, part('rtl', 'boxes'), 'direction')).toBe('ltr')
  })

  it('code-entry/motion: the border and the soft ring change in 150 ms; the error text fades in with dur-fast and moves nothing', async () => {
    expect(await style(page, b('code-pointer', 1), 'transition-property')).toBe('border-color, box-shadow')
    expect(await style(page, b('code-pointer', 1), 'transition-duration')).toBe('0.15s')
    expect(await style(page, b('code-pointer', 1), 'transition-timing-function')).toBe('cubic-bezier(0.25, 0.1, 0.25, 1)')
    expect(await style(page, part('error', 'error-text'), 'transition-property')).toBe('opacity')
    expect(await style(page, part('error', 'error-text'), 'transition-duration')).toBe('0.15s')
    expect(await style(page, part('timer', 'error-text'), 'opacity')).toBe('0')
    // The line of the error text is there with no error. Thus the timer is at the same place, with and without the error.
    const withError = (await box(page, part('error', 'timer'))).y - (await box(page, '#error')).y
    const withNone = (await box(page, part('timer', 'timer'))).y - (await box(page, '#timer')).y
    expect(withError).toBe(withNone)
  })

  it('code-entry/motion: with reduced motion, the changes have no transition; the color change stays', async () => {
    expect(await style(page, b('reduced', 1), 'transition-property')).toBe('none')
    expect(await style(page, part('reduced', 'error-text'), 'transition-property')).toBe('none')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await style(page, b('code-pointer', 1), 'transition-property')).toBe('none')
    expect(await style(page, part('error', 'error-text'), 'transition-property')).toBe('none')
    expect(await style(page, b('error', 1), 'border-top-color')).toBe('rgb(242, 85, 90)')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  })

  it('code-entry/no-shake: the boxes of a refused code have no animation and no movement', async () => {
    for (let p = 1; p <= 6; p += 1) {
      expect(await style(page, b('error', p), 'animation-name')).toBe('none')
      expect(await style(page, b('error', p), 'transform')).toBe('none')
      expect(await style(page, b('error', p), 'translate')).toBe('none')
    }
    expect((await positions('error')).map((r) => r.x)).toEqual((await positions('timer')).map((r) => r.x))
  })

  it('code-entry/disabled: all boxes have the disabled opacity; the cause stays readable', async () => {
    for (let p = 1; p <= 6; p += 1) expect(await style(page, b('disabled', p), 'opacity')).toBe('0.4')
    expect(await style(page, part('disabled', 'disabled-reason'), 'opacity')).toBe('1')
    expect(await style(page, part('disabled', 'disabled-reason'), 'color')).toBe('rgb(158, 158, 158)')
  })

  it('code-entry/timer: the timer has tabular figures, in the muted text color and the small size', async () => {
    expect(await style(page, part('timer', 'timer'), 'font-variant-numeric')).toBe('tabular-nums')
    expect(await style(page, part('timer', 'timer'), 'color')).toBe('rgb(158, 158, 158)')
    expect(await style(page, part('timer', 'timer'), 'font-size')).toBe('13px')
  })
})
