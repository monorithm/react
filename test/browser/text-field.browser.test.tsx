// @vitest-environment node
// The browser test of the Text field: the real CSS in a real Chrome. It measures the clauses that jsdom cannot compute:
// the sizes of the densities, the gaps, the colors of the themes and the states, the focus border and the soft ring, the
// add-ons, the direction, and the motion. Each test name starts with the id of a clause of ir/contracts/text-field.json.
import type { Browser, Page } from 'playwright-core'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TextField } from '@monorithm/react/components/text-field/text-field'
import { box, buildCss, cell, openPage, style } from './harness'

let browser: Browser
let page: Page

const html = (node: ReactNode) => renderToStaticMarkup(<>{node}</>)
const ERROR = 'Use only letters, numbers, and underscores.'
const basic = (
  <>
    <TextField label="Shop name" help="The name that buyers see" className="basic" />
    <TextField label="Delivery instructions" optional className="optional" />
  </>
)
const states = (
  <>
    <TextField label="User name" defaultValue="ama k" error={ERROR} className="error" />
    <TextField label="Email" defaultValue="ama@shop.con" warning="Make sure that the address ends with .com." className="warning" />
    <TextField label="Phone number" disabled disabledReason="To change your number, go to Account recovery." className="disabled" />
    <TextField label="Order number" defaultValue="A-1042" readOnly className="readonly" />
  </>
)
const addOns = (
  <>
    <TextField label="Search products" type="search" hint="/" className="search" />
    <TextField label="Price" type="amount" currency="GHS" locale="en-GH" className="amount" />
  </>
)
const multi = (
  <TextField label="Description" variant="multi-line" limit={10} defaultValue="Red shoes" help="The size and the color" className="multi" />
)

beforeAll(async () => {
  const body = [
    // The first cell has the first focusable element: the focus test presses Tab one time.
    cell('focus', 'data-density="pointer"', html(<TextField label="First" className="first" />)),
    ...(['pointer', 'touch'] as const).map((d) => cell(`basic-${d}`, `data-density="${d}"`, html(basic))),
    cell('basic-light', 'data-density="pointer" data-theme="light"', html(basic)),
    cell('states', 'data-density="pointer"', html(states)),
    ...(['pointer', 'touch'] as const).map((d) => cell(`addons-${d}`, `data-density="${d}"`, html(addOns))),
    cell('multi', 'data-density="pointer"', html(multi)),
    cell(
      'rtl',
      'data-density="pointer" dir="rtl"',
      html(
        <>
          {addOns}
          {multi}
          <TextField label="Phone number" type="phone" defaultValue="+233 24 412 3456" error={ERROR} className="phone" />
        </>,
      ),
    ),
  ].join('')
  ;({ browser, page } = await openPage(body))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

/** The selectors of the parts of the field with the class name, in a cell. */
const root = (cellId: string, name: string) => `#${cellId} .${name}`
const part = (cellId: string, name: string, p: string) => `${root(cellId, name)} [data-part="${p}"]`
const control = (cellId: string, name: string) => `${root(cellId, name)} input, ${root(cellId, name)} textarea`

/** The relative luminance of an sRGB color "rgb(r, g, b)" or "#rrggbb" (WCAG 2). */
function luminance(color: string): number {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color)
  const channels = hex ? hex.slice(1).map((h) => Number.parseInt(h, 16)) : (color.match(/\d+(\.\d+)?/g) ?? []).map(Number)
  const [r, g, b] = channels.slice(0, 3).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m) as [number, number]
  return (x + 0.05) / (y + 0.05)
}
/** The background color of the body: the surface behind the field. */
const pageBg = (cellId: string) => style(page, `#${cellId}`, '--mono-color-role-bg')

/** Scrolls the element into view and moves the pointer to its center. */
async function hoverAt(selector: string) {
  await page.locator(selector).first().scrollIntoViewIfNeeded()
  const b = await box(page, selector)
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.waitForTimeout(250)
}

describe('Text field in Chrome', () => {
  it('text-field/density: the input is 32 px high for pointer and 44 px for touch; the text is 14 px and 16 px', async () => {
    expect((await box(page, part('basic-pointer', 'basic', 'input'))).height).toBe(32)
    expect((await box(page, part('basic-touch', 'basic', 'input'))).height).toBe(44)
    expect(await style(page, control('basic-pointer', 'basic'), 'font-size')).toBe('14px')
    expect(await style(page, control('basic-touch', 'basic'), 'font-size')).toBe('16px')
    expect(await style(page, part('basic-pointer', 'basic', 'input'), 'border-top-left-radius')).toBe('8px')
    expect(await style(page, part('basic-touch', 'basic', 'input'), 'border-top-left-radius')).toBe('10px')
  })

  it('text-field/no-zoom: in the touch density, the text of each input is 16 px or more', async () => {
    for (const sel of [control('basic-touch', 'basic'), control('addons-touch', 'search'), control('addons-touch', 'amount')]) {
      expect(Number.parseFloat(await style(page, sel, 'font-size'))).toBeGreaterThanOrEqual(16)
    }
  })

  it('text-field/target: the input is the target, 44 px high for touch; a press on the label moves the focus to it', async () => {
    const t = await box(page, part('basic-touch', 'basic', 'input'))
    const c = await box(page, control('basic-touch', 'basic'))
    expect(t.height).toBeGreaterThanOrEqual(44)
    expect(c.height).toBe(44 - 2)
    await page.click(`${root('basic-pointer', 'basic')} label`)
    expect(await page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.closest('.basic')?.parentElement?.id)).toBe('basic-pointer')
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  })

  it('text-field/label: the label is above the input, and the help text is below it', async () => {
    const label = await box(page, `${root('basic-pointer', 'basic')} label`)
    const input = await box(page, part('basic-pointer', 'basic', 'input'))
    const help = await box(page, part('basic-pointer', 'basic', 'help'))
    expect(label.y + label.height).toBeLessThanOrEqual(input.y)
    expect(help.y).toBeGreaterThanOrEqual(input.y + input.height)
  })

  it('text-field/spacing: the label is 6 px above the input; the help and the error are 6 px below it', async () => {
    for (const d of ['pointer', 'touch']) {
      const row = await box(page, `${root(`basic-${d}`, 'basic')} label`)
      const input = await box(page, part(`basic-${d}`, 'basic', 'input'))
      const help = await box(page, part(`basic-${d}`, 'basic', 'help'))
      expect(input.y - (row.y + row.height)).toBe(6)
      expect(help.y - (input.y + input.height)).toBe(6)
    }
    const input = await box(page, part('states', 'error', 'input'))
    const error = await box(page, part('states', 'error', 'error'))
    expect(error.y - (input.y + input.height)).toBe(6)
  })

  it('text-field/label and text-field/optional: the label is small, strong, fg-2; the word optional is regular and muted', async () => {
    const label = `${root('basic-pointer', 'optional')} label`
    expect(await style(page, label, 'font-size')).toBe('13px')
    expect(await style(page, label, 'color')).toBe('rgb(176, 176, 176)')
    expect(await style(page, `${label} > span:first-child`, 'font-weight')).toBe('500')
    expect(await style(page, part('basic-pointer', 'optional', 'optional-mark'), 'font-weight')).toBe('400')
    expect(await style(page, part('basic-pointer', 'optional', 'optional-mark'), 'color')).toBe('rgb(158, 158, 158)')
    expect(await style(page, `${root('basic-touch', 'optional')} label`, 'font-size')).toBe('14px')
  })

  it('text-field/help: the help text is small and muted, one line below the input', async () => {
    expect(await style(page, part('basic-pointer', 'basic', 'help'), 'font-size')).toBe('13px')
    expect(await style(page, part('basic-pointer', 'basic', 'help'), 'color')).toBe('rgb(158, 158, 158)')
    expect((await box(page, part('basic-pointer', 'basic', 'help'))).height).toBe(Number.parseFloat(await style(page, part('basic-pointer', 'basic', 'help'), 'line-height')))
  })

  it('text-field/border: 1 px in the field line color, 3 : 1 or more with the fill and the background, in each theme', async () => {
    for (const [cellId, line] of [
      ['basic-pointer', 'rgb(107, 107, 107)'],
      ['basic-light', 'rgb(138, 138, 138)'],
    ] as const) {
      const s = part(cellId, 'basic', 'input')
      expect(await style(page, s, 'border-top-width')).toBe('1px')
      expect(await style(page, s, 'border-top-color')).toBe(line)
      const fill = await style(page, s, 'background-color')
      expect(contrast(line, fill)).toBeGreaterThanOrEqual(3)
      expect(contrast(line, await pageBg(cellId))).toBeGreaterThanOrEqual(3)
    }
    expect(await style(page, part('basic-pointer', 'basic', 'input'), 'background-color')).toBe('rgb(20, 20, 20)')
    expect(await style(page, part('basic-light', 'basic', 'input'), 'background-color')).toBe('rgb(255, 255, 255)')
    expect(await style(page, control('basic-pointer', 'basic'), 'color')).toBe('rgb(224, 224, 224)')
  })

  it('text-field/hover: at hover, the border takes the muted text color, with a contrast of 3 : 1 or more', async () => {
    for (const [cellId, want] of [
      ['basic-pointer', 'rgb(158, 158, 158)'],
      ['basic-light', 'rgb(107, 107, 107)'],
    ] as const) {
      const s = part(cellId, 'basic', 'input')
      await hoverAt(s)
      expect(await style(page, s, 'border-top-color')).toBe(want)
      expect(contrast(want, await style(page, s, 'background-color'))).toBeGreaterThanOrEqual(3)
    }
    // The error keeps the danger border at hover.
    await hoverAt(part('states', 'error', 'input'))
    expect(await style(page, part('states', 'error', 'input'), 'border-top-color')).toBe('rgb(242, 85, 90)')
    await page.mouse.move(0, 0)
  })

  it('text-field/focus: Tab gives the ring color to the border and a soft ring of 3 px in the accent tint', async () => {
    // A click on the page before the first cell: Tab then goes to the first input of the page.
    await page.mouse.click(1, 1)
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.closest('.first') !== null)).toBe(true)
    await page.waitForTimeout(250)
    const s = part('focus', 'first', 'input')
    expect(await style(page, s, 'border-top-color')).toBe('rgb(92, 163, 255)')
    // Tailwind puts its empty ring and inset shadows first. The soft ring is the last shadow.
    expect(await style(page, s, 'box-shadow')).toMatch(/rgba\(92, 163, 255, 0\.14\) 0px 0px 0px 3px$/)
    expect(await style(page, control('focus', 'first'), 'outline-style')).toBe('none')
  })

  it('text-field/focus: a press with the pointer shows the same border and ring', async () => {
    await page.click(control('basic-light', 'basic'))
    await page.waitForTimeout(250)
    const s = part('basic-light', 'basic', 'input')
    expect(await style(page, s, 'border-top-color')).toBe('rgb(31, 111, 224)')
    expect(await style(page, s, 'box-shadow')).toMatch(/rgba\(31, 111, 224, 0\.1\) 0px 0px 0px 3px$/)
    // At rest, the ring is transparent.
    expect(await style(page, part('basic-pointer', 'basic', 'input'), 'box-shadow')).toMatch(/rgba\(0, 0, 0, 0\) 0px 0px 0px 3px$/)
  })

  it('text-field/focus-group: with add-ons, the full group shows the focus and the hover; the add-ons are inside the border', async () => {
    await page.click(control('addons-pointer', 'amount'))
    await page.waitForTimeout(250)
    const group = part('addons-pointer', 'amount', 'input')
    expect(await style(page, group, 'border-top-color')).toBe('rgb(92, 163, 255)')
    expect(await style(page, group, 'box-shadow')).toMatch(/rgba\(92, 163, 255, 0\.14\) 0px 0px 0px 3px$/)
    const g = await box(page, group)
    for (const p of ['prefix', 'control']) {
      const b = await box(page, `${group} [data-part="${p}"]`)
      expect(b.x).toBeGreaterThanOrEqual(g.x + 1)
      expect(b.x + b.width).toBeLessThanOrEqual(g.x + g.width - 1)
    }
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await hoverAt(part('addons-pointer', 'search', 'start-icon'))
    expect(await style(page, part('addons-pointer', 'search', 'input'), 'border-top-color')).toBe('rgb(158, 158, 158)')
    await page.mouse.move(0, 0)
  })

  it('text-field/error-sign: the danger border, and the error text in the danger color after an error icon of 14 px', async () => {
    expect(await style(page, part('states', 'error', 'input'), 'border-top-color')).toBe('rgb(242, 85, 90)')
    expect(await style(page, part('states', 'error', 'error'), 'color')).toBe('rgb(255, 123, 127)')
    expect(await style(page, part('states', 'error', 'error'), 'font-size')).toBe('13px')
    const icon = await box(page, `${part('states', 'error', 'error-icon')} svg`)
    const text = await box(page, `${part('states', 'error', 'error')} > span:last-child`)
    expect([icon.width, icon.height]).toEqual([14, 14])
    expect(text.x - (icon.x + icon.width)).toBe(6)
    expect(await page.locator(part('states', 'error', 'help')).count()).toBe(0)
  })

  it('text-field/error-focus: an invalid input with the focus keeps the danger border; its soft ring takes the danger tint', async () => {
    await page.click(control('states', 'error'))
    await page.waitForTimeout(250)
    const s = part('states', 'error', 'input')
    expect(await style(page, s, 'border-top-color')).toBe('rgb(242, 85, 90)')
    expect(await style(page, s, 'box-shadow')).toMatch(/rgba\(242, 85, 90, 0\.14\) 0px 0px 0px 3px$/)
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  })

  it('text-field/warning-sign: the warning text in the warning color after an icon; the border does not change', async () => {
    expect(await style(page, part('states', 'warning', 'input'), 'border-top-color')).toBe('rgb(107, 107, 107)')
    expect(await style(page, part('states', 'warning', 'warning'), 'color')).toBe('rgb(251, 184, 75)')
    const icon = await box(page, `${part('states', 'warning', 'warning-icon')} svg`)
    expect([icon.width, icon.height]).toEqual([14, 14])
  })

  it('text-field/disabled: the disabled opacity and the background fill; the help text that tells why stays readable', async () => {
    const s = part('states', 'disabled', 'input')
    expect(await style(page, s, 'opacity')).toBe('0.4')
    expect(await style(page, s, 'background-color')).toBe('rgb(24, 24, 24)')
    expect(await style(page, part('states', 'disabled', 'help'), 'opacity')).toBe('1')
    expect(await style(page, `${root('states', 'disabled')} label`, 'opacity')).toBe('1')
  })

  it('text-field/read-only: a read-only input shows its value at the full opacity, and the user can focus it', async () => {
    expect(await style(page, part('states', 'readonly', 'input'), 'opacity')).toBe('1')
    await page.focus(control('states', 'readonly'))
    expect(await page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.value)).toBe('A-1042')
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  })

  it('text-field/prefix: the prefix is at the start side inside the border; a line of 1 px separates it from the value', async () => {
    const g = await box(page, part('addons-pointer', 'amount', 'input'))
    const p = await box(page, part('addons-pointer', 'amount', 'prefix'))
    const c = await box(page, part('addons-pointer', 'amount', 'control'))
    expect(p.x).toBe(g.x + 1)
    expect(c.x).toBe(p.x + p.width)
    expect(await style(page, part('addons-pointer', 'amount', 'prefix'), 'border-right-width')).toBe('1px')
    expect(await style(page, part('addons-pointer', 'amount', 'prefix'), 'border-right-color')).toBe('rgb(46, 46, 46)')
    expect(await style(page, part('addons-pointer', 'amount', 'prefix'), 'padding-left')).toBe('12px')
    expect(await style(page, part('addons-pointer', 'amount', 'control'), 'padding-left')).toBe('12px')
  })

  it('text-field/search: the leading search icon has the icon size of the density, 12 px from the edge', async () => {
    const pi = await box(page, `${part('addons-pointer', 'search', 'start-icon')} svg`)
    const ti = await box(page, `${part('addons-touch', 'search', 'start-icon')} svg`)
    expect([pi.width, ti.width]).toEqual([16, 20])
    const g = await box(page, part('addons-pointer', 'search', 'input'))
    expect(pi.x - (g.x + 1)).toBe(12)
    expect(await style(page, part('addons-pointer', 'search', 'start-icon'), 'color')).toBe('rgb(158, 158, 158)')
  })

  it('text-field/hint: the keyboard hint is 20 px high with a radius of 5 px, inside the end edge', async () => {
    const s = part('addons-pointer', 'search', 'hint')
    const h = await box(page, s)
    const g = await box(page, part('addons-pointer', 'search', 'input'))
    expect(h.height).toBe(20)
    expect(h.width).toBeGreaterThanOrEqual(20)
    expect(await style(page, s, 'border-top-left-radius')).toBe('5px')
    expect(await style(page, s, 'background-color')).toBe('rgb(37, 37, 37)')
    expect(await style(page, s, 'border-top-color')).toBe('rgb(72, 72, 72)')
    expect(await style(page, s, 'color')).toBe('rgb(176, 176, 176)')
    expect(g.x + g.width - 1 - (h.x + h.width)).toBe(6)
  })

  it('text-field/hint: a phone or a tablet (a coarse pointer and no hover) does not show the hint or the hover', async () => {
    const context = await browser.newContext({ isMobile: true, hasTouch: true })
    const phone = await context.newPage()
    await phone.setContent(`<!doctype html><html data-theme="dark"><head><style>${buildCss()}</style></head><body>${cell('phone', 'data-density="touch"', html(addOns))}</body></html>`)
    expect(await phone.evaluate(() => [matchMedia('(pointer: fine)').matches, matchMedia('(hover: hover)').matches])).toEqual([false, false])
    expect(await style(phone, part('phone', 'search', 'hint'), 'display')).toBe('none')
    expect((await box(phone, part('phone', 'search', 'input'))).height).toBe(44)
    // text-field/hover: with no hover, the pointer over the box does not change the border.
    await phone.hover(part('phone', 'amount', 'input'))
    await phone.waitForTimeout(250)
    expect(await style(phone, part('phone', 'amount', 'input'), 'border-top-color')).toBe('rgb(107, 107, 107)')
    await context.close()
  })

  it('text-field/multi-line: the input is 96 px high or more, the user can make it higher, with 8 px at the top and the bottom', async () => {
    const s = part('multi', 'multi', 'input')
    expect((await box(page, s)).height).toBeGreaterThanOrEqual(96)
    expect(await style(page, s, 'resize')).toBe('vertical')
    expect(await style(page, s, 'padding-top')).toBe('8px')
    expect(await style(page, s, 'padding-bottom')).toBe('8px')
    expect(await style(page, s, 'line-height')).toBe('20.3px')
    expect(await style(page, s, 'border-top-color')).toBe('rgb(107, 107, 107)')
  })

  it('text-field/counter: the counter is at the end of the label row', async () => {
    const row = await box(page, `${root('multi', 'multi')} > div:first-child`)
    const counter = await box(page, part('multi', 'multi', 'counter'))
    expect(counter.x + counter.width).toBe(row.x + row.width)
    expect(await page.locator(part('multi', 'multi', 'counter')).textContent()).toBe('9 / 10')
    expect(await style(page, part('multi', 'multi', 'counter'), 'color')).toBe('rgb(158, 158, 158)')
  })

  it('text-field/direction: in right-to-left, the label, the help, and the error align to the right; the icon and the prefix are at the right', async () => {
    const rootBox = await box(page, root('rtl', 'phone'))
    const label = await box(page, `${root('rtl', 'phone')} label`)
    expect(label.x + label.width).toBe(rootBox.x + rootBox.width)
    // The right edge of the text of the error and of the help is the right edge of the field.
    for (const sel of [part('rtl', 'phone', 'error'), part('rtl', 'multi', 'help')]) {
      const right = await page.locator(sel).evaluate((el) => {
        const r = document.createRange()
        r.selectNodeContents(el)
        return [r.getBoundingClientRect().right, el.getBoundingClientRect().right]
      })
      expect(right[0]).toBeCloseTo(right[1] as number, 0)
    }
    const icon = await box(page, part('rtl', 'search', 'start-icon'))
    const search = await box(page, part('rtl', 'search', 'control'))
    expect(icon.x).toBeGreaterThan(search.x + search.width - 1)
    const prefix = await box(page, part('rtl', 'amount', 'prefix'))
    const amount = await box(page, part('rtl', 'amount', 'control'))
    expect(prefix.x).toBe(amount.x + amount.width)
    expect(await style(page, part('rtl', 'amount', 'prefix'), 'border-left-width')).toBe('1px')
    // The symbol keeps the order of its characters: "GH₵", not "₵GH". The cedi sign is at the right of "GH".
    const order = await page.locator(part('rtl', 'amount', 'prefix')).evaluate((el) => {
      const text = el.querySelector('bdi')?.firstChild as Text
      const at = (i: number) => {
        const r = document.createRange()
        r.setStart(text, i)
        r.setEnd(text, i + 1)
        return r.getBoundingClientRect().x
      }
      return at(2) > at(0)
    })
    expect(order).toBe(true)
  })

  it('text-field/direction-end: in right-to-left, the hint and the counter are at the left; a phone number stays left-to-right', async () => {
    const hint = await box(page, part('rtl', 'search', 'hint'))
    const search = await box(page, part('rtl', 'search', 'control'))
    expect(hint.x + hint.width).toBeLessThanOrEqual(search.x)
    const row = await box(page, `${root('rtl', 'multi')} > div:first-child`)
    expect((await box(page, part('rtl', 'multi', 'counter'))).x).toBe(row.x)
    expect(await style(page, control('rtl', 'phone'), 'direction')).toBe('ltr')
    expect(await style(page, control('rtl', 'phone'), 'text-align')).toBe('right')
  })

  it('text-field/motion: the border and the ring change color in 150 ms with the standard easing; the error fades in; no shake', async () => {
    const s = part('basic-pointer', 'basic', 'input')
    expect(await style(page, s, 'transition-property')).toBe('border-color, box-shadow')
    expect(await style(page, s, 'transition-duration')).toBe('0.15s')
    expect(await style(page, s, 'transition-timing-function')).toBe('cubic-bezier(0.25, 0.1, 0.25, 1)')
    expect(await style(page, s, 'animation-name')).toBe('none')
    const e = part('states', 'error', 'error')
    expect(await style(page, e, 'transition-property')).toBe('opacity')
    expect(await style(page, e, 'transition-duration')).toBe('0.15s')
    // A new error starts at opacity 0 (@starting-style) and fades to 1.
    const start = await page.evaluate(async (sel) => {
      const el = document.querySelector(sel) as HTMLElement
      const copy = el.cloneNode(true) as HTMLElement
      el.after(copy)
      const first = Number(getComputedStyle(copy).opacity)
      await new Promise((r) => setTimeout(r, 300))
      const last = Number(getComputedStyle(copy).opacity)
      copy.remove()
      return [first < 1, last]
    }, e)
    expect(start).toEqual([true, 1])
  })

  it('text-field/reduced-motion: with reduced motion the field does not move or scale; the color change and the fade stay', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.click(control('basic-pointer', 'basic'))
    const s = part('basic-pointer', 'basic', 'input')
    expect(await style(page, s, 'transition-duration')).toBe('0.15s')
    expect(await style(page, part('states', 'error', 'error'), 'transition-duration')).toBe('0.15s')
    expect(await style(page, s, 'scale')).toBe('none')
    expect(await style(page, s, 'transform')).toBe('none')
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  })
})
