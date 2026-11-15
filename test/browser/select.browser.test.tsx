// @vitest-environment node
// The browser test of the Select: the real CSS in a real Chrome. It measures the clauses of the trigger and the field
// that jsdom cannot compute: the sizes of the densities, the colors of the themes and the states, the gaps, the focus,
// the hover, the direction, and the motion. Base UI renders no list in static markup: the jsdom test examines the list.
// Each test name starts with the id of a clause of ir/contracts/select.json.
import type { Browser, Page } from 'playwright-core'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Select } from '@monorithm/react/components/select/select'
import { box, cell, openPage, style } from './harness'

let browser: Browser
let page: Page

const options = [
  { value: 'clothes', label: 'Clothes' },
  { value: 'home', label: 'Home' },
]
const html = (node: ReactNode) => renderToStaticMarkup(<>{node}</>)
const sizes = (
  <>
    <Select className="s-sm" label="Small" options={options} size="sm" />
    <Select className="s-md" label="Medium" options={options} />
    <Select className="s-lg" label="Large" options={options} size="lg" />
  </>
)
const states = (
  <>
    <Select className="placeholder" label="Category" options={options} placeholder="Choose a category" optional help="Buyers filter by it" />
    <Select className="value" label="Value" options={options} defaultValue="home" />
    <Select className="error" label="Error" options={options} error="Choose a category for the listing" />
    <Select className="disabled" label="Disabled" options={options} defaultValue="home" disabled disabledReason="Add a shop first" />
  </>
)

beforeAll(async () => {
  const body = [
    // The first cell has the first focusable element: the focus test presses Tab one time.
    cell('focus', 'data-density="pointer"', html(<Select label="First" options={options} />)),
    ...(['pointer', 'touch'] as const).map((d) => cell(`sizes-${d}`, `data-density="${d}"`, html(sizes))),
    cell('states', 'data-density="pointer"', html(states)),
    cell('light', 'data-density="pointer" data-theme="light"', html(states)),
    cell('rtl', 'data-density="pointer" dir="rtl"', html(<Select label="Right to left" options={options} defaultValue="home" />)),
    cell(
      'native',
      'data-density="touch"',
      html(
        <>
          <Select className="list" label="List" options={options} defaultValue="home" help="Buyers filter by it" />
          <Select className="native" native label="Native" options={options} defaultValue="home" help="Buyers filter by it" />
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

const at = (cellId: string, field: string, part: string) => `#${cellId} .${field} [data-part="${part}"]`
const trigger = (cellId: string, field: string) => at(cellId, field, 'trigger')
const DARK = {
  surface: 'rgb(20, 20, 20)',
  line: 'rgb(107, 107, 107)',
  muted: 'rgb(158, 158, 158)',
  ring: 'rgb(92, 163, 255)',
  danger: 'rgb(242, 85, 90)',
}

describe('Select in Chrome', () => {
  it('select/size: pointer small 28, medium 32, large 40 px; touch small 36, medium 44, large 52 px', async () => {
    const heights = async (d: string) =>
      Promise.all(['s-sm', 's-md', 's-lg'].map(async (s) => (await box(page, trigger(`sizes-${d}`, s))).height))
    expect(await heights('pointer')).toEqual([28, 32, 40])
    expect(await heights('touch')).toEqual([36, 44, 52])
  })

  it('select/density: the text is 14 or 16 px, the chevron 16 or 20 px, and the radius 8 or 10 px', async () => {
    for (const [d, text, icon, radius] of [
      ['pointer', '14px', 16, '8px'],
      ['touch', '16px', 20, '10px'],
    ] as const) {
      expect(await style(page, at(`sizes-${d}`, 's-md', 'value'), 'font-size')).toBe(text)
      const chevron = await box(page, at(`sizes-${d}`, 's-md', 'chevron'))
      expect([chevron.width, chevron.height]).toEqual([icon, icon])
      expect(await style(page, trigger(`sizes-${d}`, 's-md'), 'border-top-left-radius')).toBe(radius)
    }
  })

  it('select/trigger: the surface fill, a border of 1 px in the field line; the value at the start, the chevron at the end', async () => {
    const t = trigger('states', 'value')
    expect(await style(page, t, 'background-color')).toBe(DARK.surface)
    expect(await style(page, t, 'border-top-color')).toBe(DARK.line)
    expect(await style(page, t, 'border-top-width')).toBe('1px')
    expect(await style(page, trigger('light', 'value'), 'background-color')).toBe('rgb(255, 255, 255)')
    expect(await style(page, trigger('light', 'value'), 'border-top-color')).toBe('rgb(138, 138, 138)')
    const b = await box(page, t)
    const value = await box(page, at('states', 'value', 'value'))
    const chevron = await box(page, at('states', 'value', 'chevron'))
    // The border and the padding of 12 px at the start; the border and the chevron inset of 12 px at the end.
    expect(value.x - b.x).toBe(13)
    expect(b.x + b.width - (chevron.x + chevron.width)).toBe(13)
    expect(chevron.x - (value.x + value.width)).toBe(6)
    expect(await style(page, at('states', 'value', 'value'), 'color')).toBe('rgb(224, 224, 224)')
    expect(await style(page, at('states', 'placeholder', 'value'), 'color')).toBe(DARK.muted)
    expect(await style(page, at('states', 'value', 'chevron'), 'color')).toBe(DARK.muted)
  })

  it('select/name: the label is 6 px above the trigger: small, strong, in the second text color; then the word optional', async () => {
    const label = await box(page, at('states', 'placeholder', 'label'))
    const t = await box(page, trigger('states', 'placeholder'))
    expect(t.y - (label.y + label.height)).toBe(6)
    const name = `${at('states', 'placeholder', 'label')} span:first-child`
    expect(await style(page, name, 'font-size')).toBe('13px')
    expect(await style(page, name, 'font-weight')).toBe('500')
    expect(await style(page, name, 'color')).toBe('rgb(176, 176, 176)')
    expect(await style(page, at('states', 'placeholder', 'optional'), 'font-weight')).toBe('400')
    expect(await style(page, at('states', 'placeholder', 'optional'), 'color')).toBe(DARK.muted)
  })

  it('select/help: the help text is one line, 6 px below the trigger, small, in the muted text color', async () => {
    const t = await box(page, trigger('states', 'placeholder'))
    const help = await box(page, at('states', 'placeholder', 'help'))
    expect(help.y - (t.y + t.height)).toBe(6)
    expect(help.height).toBeLessThan(2 * 13)
    expect(await style(page, at('states', 'placeholder', 'help'), 'font-size')).toBe('13px')
    expect(await style(page, at('states', 'placeholder', 'help'), 'color')).toBe(DARK.muted)
  })

  it('select/target: the target is the full trigger; a small trigger in the touch density extends it to 44 px', async () => {
    expect(await style(page, trigger('sizes-touch', 's-sm'), 'height', '::after')).toBe('44px')
    expect(await style(page, trigger('sizes-touch', 's-sm'), 'width', '::after')).toBe(`${(await box(page, trigger('sizes-touch', 's-sm'))).width}px`)
    expect(await style(page, trigger('sizes-pointer', 's-sm'), 'height', '::after')).toBe('28px')
  })

  it('select/focus: Tab gives the ring border and a soft ring of 3 px in the accent tint', async () => {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.getAttribute('role'))).toBe('combobox')
    const t = '#focus [data-part="trigger"]'
    await page.waitForTimeout(250)
    expect(await style(page, t, 'border-top-color')).toBe(DARK.ring)
    expect(await style(page, t, 'box-shadow')).toBe('rgba(92, 163, 255, 0.14) 0px 0px 0px 3px')
    // The soft ring is the focus sign: the trigger has no outline.
    expect(await style(page, t, 'outline-style')).toBe('none')
  })

  it('select/hover: the border changes to the muted text color in 150 ms', async () => {
    const t = trigger('states', 'value')
    expect(await style(page, t, 'transition-property')).toBe('border-color, box-shadow')
    expect(await style(page, t, 'transition-duration')).toBe('0.15s')
    await page.locator(t).scrollIntoViewIfNeeded()
    await page.hover(t)
    await page.waitForTimeout(250)
    expect(await style(page, t, 'border-top-color')).toBe(DARK.muted)
    await page.mouse.move(0, 0)
  })

  it('select/error: the danger border, an icon of 14 px, and the error text in the danger text color', async () => {
    const t = trigger('states', 'error')
    expect(await style(page, t, 'border-top-color')).toBe(DARK.danger)
    expect(await style(page, at('states', 'error', 'error'), 'color')).toBe('rgb(255, 123, 127)')
    expect(await style(page, at('states', 'error', 'error'), 'font-size')).toBe('13px')
    const icon = await box(page, `${at('states', 'error', 'error')} svg`)
    expect([icon.width, icon.height]).toEqual([14, 14])
    const text = await box(page, `${at('states', 'error', 'error')} > span:last-child`)
    expect(text.x - (icon.x + icon.width)).toBe(6)
    const b = await box(page, t)
    expect((await box(page, at('states', 'error', 'error'))).y - (b.y + b.height)).toBe(6)
    expect(await style(page, trigger('light', 'error'), 'border-top-color')).toBe('rgb(217, 58, 64)')
  })

  it('select/error-motion: the error fades in for 150 ms with no shake; the focus keeps the danger border with the danger tint', async () => {
    const error = at('states', 'error', 'error')
    expect(await style(page, error, 'transition-property')).toBe('opacity')
    expect(await style(page, error, 'transition-duration')).toBe('0.15s')
    expect(await style(page, error, 'animation-name')).toBe('none')
    expect(await style(page, error, 'opacity')).toBe('1')
    await page.locator(trigger('states', 'error')).focus()
    await page.waitForTimeout(250)
    expect(await style(page, trigger('states', 'error'), 'border-top-color')).toBe(DARK.danger)
    expect(await style(page, trigger('states', 'error'), 'box-shadow')).toBe('rgba(242, 85, 90, 0.14) 0px 0px 0px 3px')
  })

  it('select/disabled: the disabled opacity and the background fill; the cause in the help text stays readable', async () => {
    const t = trigger('states', 'disabled')
    expect(await style(page, t, 'opacity')).toBe('0.4')
    expect(await style(page, t, 'background-color')).toBe('rgb(24, 24, 24)')
    expect(await style(page, t, 'cursor')).toBe('not-allowed')
    expect(await page.locator(at('states', 'disabled', 'help')).textContent()).toBe('Add a shop first')
    expect(await style(page, at('states', 'disabled', 'help'), 'opacity')).toBe('1')
    // The disabled select stays in the focus order.
    expect(await page.locator(t).getAttribute('tabindex')).toBe('0')
    expect(await page.locator(t).getAttribute('disabled')).toBeNull()
  })

  it('select/direction: in right-to-left, the value is at the right and the chevron at the left', async () => {
    const b = await box(page, '#rtl [data-part="trigger"]')
    const value = await box(page, '#rtl [data-part="value"]')
    const chevron = await box(page, '#rtl [data-part="chevron"]')
    expect(chevron.x - b.x).toBe(13)
    expect(b.x + b.width - (value.x + value.width)).toBe(13)
    expect(await style(page, '#rtl [data-part="value"]', 'text-align')).toBe('start')
  })

  it('select/system-picker: the native select keeps the look of the trigger, with the chevron at the end', async () => {
    const list = trigger('native', 'list')
    const native = trigger('native', 'native')
    expect(await page.locator(native).evaluate((el) => el.tagName)).toBe('SELECT')
    for (const prop of ['height', 'background-color', 'border-top-color', 'border-top-width', 'border-top-left-radius', 'font-size']) {
      expect([prop, await style(page, native, prop)]).toEqual([prop, await style(page, list, prop)])
    }
    expect(await style(page, native, 'appearance')).toBe('none')
    const b = await box(page, native)
    const chevron = await box(page, at('native', 'native', 'chevron'))
    expect([chevron.width, b.x + b.width - (chevron.x + chevron.width)]).toEqual([20, 13])
  })

  it('select/surfaces: the native mode has the same label, help text, and gaps as the list mode', async () => {
    for (const part of ['label', 'help']) {
      for (const prop of ['font-size', 'color']) {
        expect(await style(page, at('native', 'native', part), prop)).toBe(await style(page, at('native', 'list', part), prop))
      }
    }
    const gaps = async (field: string) => {
      const label = await box(page, at('native', field, 'label'))
      const t = await box(page, trigger('native', field))
      const help = await box(page, at('native', field, 'help'))
      return [t.y - (label.y + label.height), help.y - (t.y + t.height)]
    }
    expect(await gaps('native')).toEqual(await gaps('list'))
  })

  it('select/motion-reduced: with reduced motion, the change of color stays', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await style(page, trigger('states', 'value'), 'transition-property')).toBe('border-color, box-shadow')
    expect(await style(page, trigger('states', 'value'), 'transition-duration')).toBe('0.15s')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  })
})
